from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__, static_folder='static')
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


@app.route('/')
def index():
    """Serve the main frontend page"""
    return send_from_directory('static', 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    """Serve static files"""
    return send_from_directory('static', path)


@app.route('/api/articles', methods=['GET'])
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

