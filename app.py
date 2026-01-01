from flask import Flask, request, jsonify, send_from_directory, session, redirect, url_for, render_template_string
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv
import os
import csv
import io
from functools import wraps
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import timedelta

load_dotenv()

app = Flask(__name__, static_folder='static')
app.secret_key = os.getenv('SECRET_KEY', os.urandom(24).hex())
app.permanent_session_lifetime = timedelta(hours=24)  # Session expires after 24 hours

# Enable CORS for frontend - allow all origins for cloud deployment
# In production, you may want to restrict this to specific domains
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'inventory_db'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'port': int(os.getenv('DB_PORT', 3306))
}


def get_db_connection():
    """Create and return a database connection"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None


def init_database():
    """Initialize the database and create tables if they don't exist"""
    connection = get_db_connection()
    if connection:
        try:
            cursor = connection.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS articles (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    ean_code VARCHAR(13) UNIQUE NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    quantity INT DEFAULT 0,
                    price DECIMAL(10, 2),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_ean (ean_code)
                )
            """)
            connection.commit()
            cursor.close()
            connection.close()
            print("Database initialized successfully")
        except Error as e:
            print(f"Error initializing database: {e}")


# Initialize database on startup
init_database()


# Authentication helper functions
def login_required(f):
    """Decorator to require login for routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Authentication required'}), 401
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function


@app.route('/login', methods=['GET', 'POST'])
def login():
    """Login page and authentication"""
    if request.method == 'POST':
        password = request.form.get('password') or (request.json.get('password') if request.is_json else None)
        correct_password = os.getenv('ADMIN_PASSWORD', 'admin')  # Default password, change in .env
        
        # Check password
        if password == correct_password:
            session.permanent = True
            session['logged_in'] = True
            if request.is_json:
                return jsonify({'success': True, 'message': 'Login successful'})
            return redirect(url_for('index'))
        else:
            if request.is_json:
                return jsonify({'success': False, 'error': 'Invalid password'}), 401
            return render_template_string(LOGIN_HTML, error='Invalid password'), 401
    
    # GET request - show login page
    if session.get('logged_in'):
        return redirect(url_for('index'))
    return render_template_string(LOGIN_HTML)


@app.route('/logout', methods=['POST', 'GET'])
def logout():
    """Logout and clear session"""
    session.clear()
    if request.is_json:
        return jsonify({'success': True, 'message': 'Logged out'})
    return redirect(url_for('login'))


@app.route('/api/language', methods=['GET'])
def get_language():
    """Get language configuration"""
    return jsonify({
        'appTitle': os.getenv('LANG_APP_TITLE', '📦 Lagerhantering'),
        'exportCSV': os.getenv('LANG_EXPORT_CSV', 'Exportera CSV'),
        'logout': os.getenv('LANG_LOGOUT', 'Logga ut'),
        'searchPlaceholder': os.getenv('LANG_SEARCH_PLACEHOLDER', 'Ange eller skanna EAN-kod...'),
        'scanBarcode': os.getenv('LANG_SCAN_BARCODE', 'Skanna streckkod'),
        'scan': os.getenv('LANG_SCAN', 'Skanna'),
        'scanning': os.getenv('LANG_SCANNING', 'Skannar...'),
        'stopScanning': os.getenv('LANG_STOP_SCANNING', 'Stoppa skanning'),
        'welcomeMessage': os.getenv('LANG_WELCOME_MESSAGE', 'Ange en EAN-kod eller skanna en streckkod för att komma igång'),
        'currentQuantity': os.getenv('LANG_CURRENT_QUANTITY', 'Nuvarande kvantitet'),
        'price': os.getenv('LANG_PRICE', 'Pris'),
        'apply': os.getenv('LANG_APPLY', 'Tillämpa'),
        'editArticle': os.getenv('LANG_EDIT_ARTICLE', 'Redigera artikel'),
        'articleNotFound': os.getenv('LANG_ARTICLE_NOT_FOUND', 'Artikel hittades inte - Lägg till ny artikel'),
        'eanCode': os.getenv('LANG_EAN_CODE', 'EAN-kod'),
        'name': os.getenv('LANG_NAME', 'Namn'),
        'description': os.getenv('LANG_DESCRIPTION', 'Beskrivning'),
        'initialQuantity': os.getenv('LANG_INITIAL_QUANTITY', 'Initial kvantitet'),
        'cancel': os.getenv('LANG_CANCEL', 'Avbryt'),
        'addArticle': os.getenv('LANG_ADD_ARTICLE', 'Lägg till artikel'),
        'editArticleTitle': os.getenv('LANG_EDIT_ARTICLE_TITLE', 'Redigera artikel'),
        'saveChanges': os.getenv('LANG_SAVE_CHANGES', 'Spara ändringar'),
        'currency': os.getenv('LANG_CURRENCY', 'SEK'),
        'currencyPosition': os.getenv('LANG_CURRENCY_POSITION', 'after'),  # 'before' or 'after'
        'connected': os.getenv('LANG_CONNECTED', '✓ Ansluten till'),
        'connectionIssue': os.getenv('LANG_CONNECTION_ISSUE', '⚠ API-anslutningsproblem'),
        'cannotConnect': os.getenv('LANG_CANNOT_CONNECT', '✗ Kan inte ansluta till API'),
        'ean': os.getenv('LANG_EAN', 'EAN'),
        'required': os.getenv('LANG_REQUIRED', '*'),
        'pleaseEnterEan': os.getenv('LANG_PLEASE_ENTER_EAN', 'Vänligen ange en EAN-kod'),
        'quantityCannotBeNegative': os.getenv('LANG_QUANTITY_CANNOT_BE_NEGATIVE', 'Kvantiteten kan inte vara negativ'),
        'quantityUpdatedTo': os.getenv('LANG_QUANTITY_UPDATED_TO', 'Kvantitet uppdaterad till'),
        'failedToUpdateQuantity': os.getenv('LANG_FAILED_TO_UPDATE_QUANTITY', 'Misslyckades att uppdatera kvantitet'),
        'eanCodeAndNameRequired': os.getenv('LANG_EAN_CODE_AND_NAME_REQUIRED', 'EAN-kod och namn krävs'),
        'articleCreatedSuccessfully': os.getenv('LANG_ARTICLE_CREATED_SUCCESSFULLY', 'Artikel skapad framgångsrikt'),
        'articleUpdatedSuccessfully': os.getenv('LANG_ARTICLE_UPDATED_SUCCESSFULLY', 'Artikel uppdaterad framgångsrikt'),
        'failedToCreateArticle': os.getenv('LANG_FAILED_TO_CREATE_ARTICLE', 'Misslyckades att skapa artikel'),
        'failedToUpdateArticle': os.getenv('LANG_FAILED_TO_UPDATE_ARTICLE', 'Misslyckades att uppdatera artikel'),
        'failedToLookupArticle': os.getenv('LANG_FAILED_TO_LOOKUP_ARTICLE', 'Misslyckades att söka artikel'),
        'cannotConnectToServer': os.getenv('LANG_CANNOT_CONNECT_TO_SERVER', 'Kan inte ansluta till servern'),
        'barcodeScannerNotLoaded': os.getenv('LANG_BARCODE_SCANNER_NOT_LOADED', 'Streckkodsskannerbiblioteket är inte laddat. Vänligen uppdatera sidan'),
        'errorLoadingVideoStream': os.getenv('LANG_ERROR_LOADING_VIDEO_STREAM', 'Fel vid laddning av videoström. Försök igen'),
        'csvExportedSuccessfully': os.getenv('LANG_CSV_EXPORTED_SUCCESSFULLY', 'CSV exporterad framgångsrikt'),
        'failedToExportCsv': os.getenv('LANG_FAILED_TO_EXPORT_CSV', 'Misslyckades att exportera CSV'),
    })


@app.route('/')
@login_required
def index():
    """Serve the main frontend page"""
    return send_from_directory('static', 'index.html')


@app.route('/<path:path>')
@login_required
def serve_static(path):
    """Serve static files"""
    return send_from_directory('static', path)


# Login HTML template
LOGIN_HTML = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Inventory Management</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .login-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            padding: 40px;
            max-width: 400px;
            width: 100%;
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
            font-size: 2em;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 500;
        }
        input[type="password"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input[type="password"]:focus {
            outline: none;
            border-color: #667eea;
        }
        button {
            width: 100%;
            padding: 12px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.3s;
        }
        button:hover {
            background: #5568d3;
        }
        .error {
            background: #ffebee;
            color: #c62828;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid #ef5350;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h1>📦 Inventory Login</h1>
        {% if error %}
        <div class="error">{{ error }}</div>
        {% endif %}
        <form method="POST">
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required autofocus>
            </div>
            <button type="submit">Login</button>
        </form>
    </div>
</body>
</html>
'''


@app.route('/api/articles', methods=['GET'])
@login_required
def get_articles():
    """Get all articles or search by EAN code"""
    search = request.args.get('search', '')
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        if search:
            cursor.execute("""
                SELECT * FROM articles 
                WHERE ean_code LIKE %s OR name LIKE %s OR description LIKE %s
                ORDER BY name
            """, (f'%{search}%', f'%{search}%', f'%{search}%'))
        else:
            cursor.execute("SELECT * FROM articles ORDER BY name")
        
        articles = cursor.fetchall()
        cursor.close()
        connection.close()
        return jsonify(articles)
    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/articles/<ean_code>', methods=['GET'])
@login_required
def get_article_by_ean(ean_code):
    """Get a specific article by EAN code"""
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM articles WHERE ean_code = %s", (ean_code,))
        article = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if article:
            return jsonify(article)
        else:
            return jsonify({'error': 'Article not found'}), 404
    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/articles', methods=['POST'])
@login_required
def create_article():
    """Create a new article"""
    data = request.json
    ean_code = data.get('ean_code')
    name = data.get('name')
    description = data.get('description', '')
    quantity = data.get('quantity', 0)
    price = data.get('price')
    
    if not ean_code or not name:
        return jsonify({'error': 'EAN code and name are required'}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor()
        cursor.execute("""
            INSERT INTO articles (ean_code, name, description, quantity, price)
            VALUES (%s, %s, %s, %s, %s)
        """, (ean_code, name, description, quantity, price))
        connection.commit()
        article_id = cursor.lastrowid
        cursor.close()
        connection.close()
        
        return jsonify({'id': article_id, 'message': 'Article created successfully'}), 201
    except Error as e:
        if 'Duplicate entry' in str(e):
            return jsonify({'error': 'EAN code already exists'}), 409
        return jsonify({'error': str(e)}), 500


@app.route('/api/articles/<ean_code>', methods=['PUT'])
@login_required
def update_article(ean_code):
    """Update an existing article"""
    data = request.json
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor()
        # Build update query dynamically based on provided fields
        updates = []
        values = []
        
        if 'name' in data:
            updates.append("name = %s")
            values.append(data['name'])
        if 'description' in data:
            updates.append("description = %s")
            values.append(data['description'])
        if 'quantity' in data:
            updates.append("quantity = %s")
            values.append(data['quantity'])
        if 'price' in data:
            updates.append("price = %s")
            values.append(data['price'])
        
        if not updates:
            return jsonify({'error': 'No fields to update'}), 400
        
        values.append(ean_code)
        query = f"UPDATE articles SET {', '.join(updates)} WHERE ean_code = %s"
        cursor.execute(query, values)
        connection.commit()
        
        if cursor.rowcount == 0:
            cursor.close()
            connection.close()
            return jsonify({'error': 'Article not found'}), 404
        
        cursor.close()
        connection.close()
        return jsonify({'message': 'Article updated successfully'})
    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/articles/<ean_code>', methods=['DELETE'])
@login_required
def delete_article(ean_code):
    """Delete an article"""
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor()
        cursor.execute("DELETE FROM articles WHERE ean_code = %s", (ean_code,))
        connection.commit()
        
        if cursor.rowcount == 0:
            cursor.close()
            connection.close()
            return jsonify({'error': 'Article not found'}), 404
        
        cursor.close()
        connection.close()
        return jsonify({'message': 'Article deleted successfully'})
    except Error as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok'})


@app.route('/api/export/csv', methods=['GET'])
@login_required
def export_csv():
    """Export articles with quantity > 0 as CSV"""
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT ean_code, name, description, quantity, price 
            FROM articles 
            WHERE quantity > 0 
            ORDER BY name
        """)
        articles = cursor.fetchall()
        cursor.close()
        connection.close()
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['EAN Code', 'Name', 'Description', 'Quantity', 'Price'])
        
        # Write data
        for article in articles:
            writer.writerow([
                article['ean_code'],
                article['name'],
                article['description'] or '',
                article['quantity'],
                article['price'] or ''
            ])
        
        # Prepare response
        output.seek(0)
        response = app.response_class(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': 'attachment; filename=inventory_export.csv'}
        )
        return response
        
    except Error as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    # SSL configuration
    ssl_enabled = os.getenv('SSL_ENABLED', 'false').lower() == 'true'
    cert_file = os.getenv('SSL_CERT', 'cert.pem')
    key_file = os.getenv('SSL_KEY', 'key.pem')
    
    port = int(os.getenv('PORT', 5000))
    
    if ssl_enabled:
        # Check if certificate files exist
        if os.path.exists(cert_file) and os.path.exists(key_file):
            print(f"Starting Flask server with HTTPS on port {port}")
            print(f"Certificate: {cert_file}")
            print(f"Key: {key_file}")
            app.run(
                debug=True,
                host='0.0.0.0',
                port=port,
                ssl_context=(cert_file, key_file)
            )
        else:
            print(f"⚠ SSL enabled but certificate files not found!")
            print(f"   Looking for: {cert_file} and {key_file}")
            print(f"   Run 'python generate_cert.py' to generate self-signed certificates")
            print(f"   Or set SSL_ENABLED=false in .env to use HTTP")
            print(f"\nStarting Flask server with HTTP on port {port}")
            app.run(debug=True, host='0.0.0.0', port=port)
    else:
        print(f"Starting Flask server with HTTP on port {port}")
        print(f"To enable HTTPS, set SSL_ENABLED=true in .env and generate certificates")
        app.run(debug=True, host='0.0.0.0', port=port)

