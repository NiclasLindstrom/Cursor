# FastAPI Inventory Management System

A modern, educational inventory management application built with **FastAPI**, **async MySQL**, and **JWT authentication**. This project demonstrates production-ready Python patterns and modern web development practices.

## 🎯 Project Overview

This is a **migration from Flask to FastAPI** designed for learning modern Python web development:

- **Async/await patterns** for non-blocking I/O
- **JWT authentication** instead of sessions
- **Pydantic models** for automatic data validation
- **Type hints** throughout the codebase
- **Dependency injection** for clean architecture
- **Automatic API documentation** (Swagger UI & ReDoc)
- **Clear educational comments** explaining concepts

---

## 📁 Project Structure

```
inventory-app/
├── backend/                    # FastAPI backend
│   ├── main.py                # FastAPI app initialization & startup
│   ├── config.py              # Settings from environment variables
│   ├── database.py            # Async MySQL connection pool
│   ├── auth.py                # JWT token creation & validation
│   ├── models/                # Pydantic data models
│   │   ├── __init__.py
│   │   ├── article.py         # Article models (Create/Update/Response)
│   │   └── auth.py            # Authentication models
│   ├── routers/               # API route handlers
│   │   ├── __init__.py
│   │   ├── auth.py            # Login/logout endpoints
│   │   ├── articles.py        # Article CRUD operations
│   │   └── export.py          # CSV export functionality
│   └── requirements.txt       # Python dependencies
├── frontend/                   # Static frontend
│   ├── index.html             # Main HTML (with login modal)
│   ├── app.js                 # Frontend logic (JWT-enabled)
│   └── styles.css             # Styling
├── .env                        # Environment configuration
└── README_FASTAPI.md          # This file
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+**
- **MySQL 8.0+**
- **pip** package manager

### 1. Install Dependencies

```bash
# Navigate to project root
cd inventory-app

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
# Database Configuration
DB_HOST=localhost
DB_NAME=inventory_db
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_PORT=3306

# Server Configuration
PORT=8000

# Authentication
ADMIN_PASSWORD=your_admin_password
SECRET_KEY=your-secret-key-change-in-production

# JWT Configuration
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24

# Language Configuration (Swedish by default)
LANG_APP_TITLE=📦 Lagerhantering
LANG_EXPORT_CSV=Exportera CSV
LANG_LOGOUT=Logga ut
LANG_SEARCH_PLACEHOLDER=Ange eller skanna EAN-kod...
# ... (add more language variables as needed)
```

### 3. Create Database

```sql
CREATE DATABASE inventory_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

The application will automatically create the `articles` table on first run.

### 4. Run the Application

```bash
# Option 1: Using uvicorn directly
uvicorn backend.main:app --reload --port 8000

# Option 2: Using Python
python -m uvicorn backend.main:app --reload --port 8000

# Option 3: Run main.py directly
python backend/main.py
```

### 5. Access the Application

- **Frontend**: Open `frontend/index.html` in your browser
  - Or serve it with a local server (e.g., `python -m http.server 8080`)
- **API Documentation (Swagger)**: http://localhost:8000/docs
- **API Documentation (ReDoc)**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/api/health

---

## 🔐 Authentication Flow

### How JWT Authentication Works

1. **User Login**:
   - User enters password in login modal
   - Frontend sends `POST /api/auth/login` with password
   - Backend validates password
   - If valid, backend creates JWT token signed with `SECRET_KEY`
   - Token returned to frontend

2. **Storing Token**:
   - Frontend saves token in `localStorage`
   - Token persists across page refreshes

3. **Making Authenticated Requests**:
   - Frontend includes token in **Authorization header**:
     ```
     Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ```
   - Backend verifies token signature and expiration
   - If valid, request proceeds; if invalid, returns 401

4. **Token Expiration**:
   - Tokens expire after `JWT_EXPIRE_HOURS` (default: 24 hours)
   - Expired tokens trigger automatic redirect to login
   - User must re-authenticate

5. **Logout**:
   - Frontend deletes token from localStorage
   - Shows login modal

### JWT vs Sessions (Why We Migrated)

| Feature | Sessions (Flask) | JWT (FastAPI) |
|---------|-----------------|---------------|
| Storage | Server-side (memory/database) | Client-side (token) |
| Scalability | Requires sticky sessions or shared storage | Stateless, scales easily |
| Mobile-friendly | Requires cookies | Works without cookies |
| Database queries | On every request | Only on login |
| Revocation | Easy (delete session) | Requires blacklist |

---

## 🧠 Learning Notes: FastAPI Concepts

### 1. Async/Await Pattern

**Why async?**
- Non-blocking I/O operations
- Server can handle other requests while waiting for database
- Better performance under load
- Scales to thousands of concurrent users

**Example:**
```python
# Synchronous (blocks)
def get_article(ean_code: str):
    article = db.execute("SELECT * FROM articles WHERE ean_code = ?", ean_code)
    return article

# Asynchronous (non-blocking)
async def get_article(ean_code: str):
    article = await db.execute("SELECT * FROM articles WHERE ean_code = ?", ean_code)
    return article
```

When to use `await`:
- Database queries
- HTTP requests
- File I/O
- Any operation that waits for external resources

### 2. Pydantic Models

**Purpose**: Automatic data validation and serialization

**Example:**
```python
class ArticleCreate(BaseModel):
    ean_code: str = Field(..., min_length=1, max_length=13)
    name: str = Field(..., min_length=1, max_length=255)
    quantity: int = Field(default=0, ge=0)  # ge = greater or equal
```

**Benefits:**
- Type safety at runtime
- Automatic validation (FastAPI returns 422 if invalid)
- Auto-generated API documentation
- IDE autocomplete support
- Clear contracts between frontend/backend

### 3. Dependency Injection

**Purpose**: Reusable, testable code components

**Example:**
```python
# Define dependency
async def get_db() -> AsyncGenerator[aiomysql.Connection, None]:
    async with get_db_connection() as connection:
        yield connection

# Use dependency
@router.get("/articles")
async def get_articles(db: aiomysql.Connection = Depends(get_db)):
    # db is automatically provided by FastAPI
    async with db.cursor() as cursor:
        await cursor.execute("SELECT * FROM articles")
```

**Benefits:**
- Automatic resource management
- Easy to mock for testing
- Clean separation of concerns
- Reusable across endpoints

### 4. Type Hints

**Purpose**: Static type checking and better IDE support

**Example:**
```python
# Without type hints
def add(a, b):
    return a + b

# With type hints
def add(a: int, b: int) -> int:
    return a + b
```

**Benefits:**
- Catch bugs before runtime
- Better IDE autocomplete
- Self-documenting code
- FastAPI uses hints for validation

### 5. Automatic API Documentation

FastAPI automatically generates interactive API docs from:
- Function signatures
- Type hints
- Pydantic models
- Docstrings

**Access:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

**Try it:**
1. Open Swagger UI
2. Click on an endpoint
3. Click "Try it out"
4. Fill parameters and execute
5. See real response

---

## 📡 API Endpoints

### Authentication

#### `POST /api/auth/login`
Login with admin password, receive JWT token.

**Request:**
```json
{
  "password": "admin"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "message": "Login successful"
}
```

#### `POST /api/auth/logout`
Logout (client-side token deletion).

---

### Articles (All require authentication)

#### `GET /api/articles`
Get all articles, optionally filtered by search term.

**Query Parameters:**
- `search` (optional): Filter by EAN, name, or description

**Response:**
```json
[
  {
    "id": 1,
    "ean_code": "7350123456789",
    "name": "Example Product",
    "description": "A sample product",
    "quantity": 10,
    "price": 99.99,
    "created_at": "2024-01-01T12:00:00",
    "updated_at": "2024-01-01T12:00:00"
  }
]
```

#### `GET /api/articles/{ean_code}`
Get a specific article by EAN code.

**Response:** Same as single item above

#### `POST /api/articles`
Create a new article.

**Request:**
```json
{
  "ean_code": "7350123456789",
  "name": "New Product",
  "description": "Optional description",
  "quantity": 5,
  "price": 49.99
}
```

#### `PUT /api/articles/{ean_code}`
Update an existing article (partial update).

**Request:**
```json
{
  "name": "Updated Name",
  "quantity": 15
}
```

#### `DELETE /api/articles/{ean_code}`
Delete an article.

---

### Export

#### `GET /api/export/csv`
Export all articles with quantity > 0 to CSV file.

**Response:** CSV file download

---

### Configuration

#### `GET /api/language`
Get all UI text strings for internationalization.

#### `GET /api/health`
Health check endpoint (no authentication required).

---

## 🔄 Migration Notes: Flask → FastAPI

### What Changed

| Aspect | Flask | FastAPI |
|--------|-------|---------|
| **Framework** | Synchronous | Asynchronous |
| **Database** | mysql-connector-python | aiomysql |
| **Authentication** | Session-based | JWT tokens |
| **Validation** | Manual checks | Pydantic models |
| **Documentation** | Manual (Swagger optional) | Automatic |
| **Type hints** | Optional | Encouraged & used |
| **Dependency injection** | Manual | Built-in with `Depends()` |

### Code Comparison

**Flask Login:**
```python
@app.route('/login', methods=['POST'])
def login():
    password = request.form.get('password')
    if password == ADMIN_PASSWORD:
        session['logged_in'] = True
        return redirect('/')
    return 'Invalid password', 401
```

**FastAPI Login:**
```python
@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    if login_data.password != settings.admin_password:
        raise HTTPException(status_code=401, detail="Invalid password")
    
    token = create_access_token(data={"authenticated": True})
    return LoginResponse(access_token=token, token_type="bearer")
```

**Key Differences:**
- ✅ Type hints (`login_data: LoginRequest`)
- ✅ Automatic validation (Pydantic)
- ✅ Response model (`response_model=LoginResponse`)
- ✅ JWT token instead of session
- ✅ Async-ready (add `await` for database calls)

---

## 🛠️ Development Tips

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest
```

### Code Formatting

```bash
# Install black
pip install black

# Format code
black backend/
```

### Linting

```bash
# Install ruff
pip install ruff

# Lint code
ruff check backend/
```

### Debugging

**Enable SQL query logging:**

In `backend/database.py`, change:
```python
_pool = await aiomysql.create_pool(
    # ...
    echo=True,  # Prints all SQL queries
)
```

**FastAPI debug mode:**

FastAPI runs in debug mode by default with `--reload`:
```bash
uvicorn backend.main:app --reload --log-level debug
```

---

## 🚢 Production Deployment

### Using Gunicorn with Uvicorn Workers

```bash
# Install gunicorn
pip install gunicorn

# Run with multiple workers
gunicorn backend.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000
```

### NGINX Configuration (Recommended)

```nginx
# Serve frontend
server {
    listen 80;
    server_name your-domain.com;
    
    # Serve static frontend files
    location / {
        root /path/to/frontend;
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API requests to FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Environment Variables for Production

- ✅ Change `SECRET_KEY` to a strong random string
- ✅ Change `ADMIN_PASSWORD` to a secure password
- ✅ Set `DB_PASSWORD` appropriately
- ✅ Consider reducing `JWT_EXPIRE_HOURS` for security
- ⚠️ Update CORS origins in `main.py` to specific domains

---

## 📚 Learning Resources

### FastAPI
- Official Docs: https://fastapi.tiangolo.com/
- Tutorial: https://fastapi.tiangolo.com/tutorial/
- GitHub: https://github.com/tiangolo/fastapi

### Async Python
- Python async/await: https://docs.python.org/3/library/asyncio.html
- Real Python Guide: https://realpython.com/async-io-python/

### Pydantic
- Official Docs: https://docs.pydantic.dev/
- Tutorial: https://docs.pydantic.dev/latest/concepts/models/

### JWT
- JWT.io: https://jwt.io/introduction
- RFC 7519: https://tools.ietf.org/html/rfc7519

---

## ❓ FAQ

### Q: Why FastAPI over Flask?

**A:** FastAPI provides:
- Better performance (async)
- Automatic validation
- Built-in documentation
- Modern Python features
- Better scalability

Flask is still great for simple sync apps!

### Q: Can I use PostgreSQL instead of MySQL?

**A:** Yes! Replace `aiomysql` with `asyncpg`:

```python
# Install
pip install asyncpg

# Update database.py
import asyncpg
pool = await asyncpg.create_pool(
    user='user',
    password='password',
    database='database',
    host='localhost'
)
```

### Q: How do I add refresh tokens?

**A:** Implement a separate `/auth/refresh` endpoint:
1. Issue both access (short-lived) and refresh (long-lived) tokens on login
2. Store refresh token securely (httpOnly cookie or secure storage)
3. When access token expires, use refresh token to get new access token

### Q: How do I revoke JWT tokens?

**A:** Implement token blacklisting:
1. Store revoked tokens in Redis or database
2. Check blacklist in `verify_token()`
3. Remove from blacklist after expiration time

### Q: Can I add user roles/permissions?

**A:** Yes! Extend the JWT payload:

```python
# Include role in token
token = create_access_token(data={
    "authenticated": True,
    "role": "admin"  # or "user", "manager", etc.
})

# Check role in dependency
async def require_admin(user: TokenData = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(403, "Admin access required")
    return user
```

---

## 🤝 Contributing

This is an educational project! Feel free to:
- Add more features (user management, categories, etc.)
- Improve error handling
- Add tests
- Enhance documentation
- Translate to other languages

---

## 📝 License

MIT License - Feel free to use this for learning and production projects!

---

## 🙏 Acknowledgments

- FastAPI by Sebastián Ramírez (tiangolo)
- Pydantic by Samuel Colvin
- QuaggaJS for barcode scanning
- Font Awesome for icons

---

**Happy Learning! 🚀**

If you have questions or suggestions, feel free to open an issue or pull request.

