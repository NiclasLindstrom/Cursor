# FastAPI Inventory - Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites

- Python 3.10 or higher
- MySQL 8.0 or higher
- pip package manager

## Step 1: Install Dependencies

### Windows
```powershell
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r backend\requirements.txt
```

### Linux/Mac
```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

## Step 2: Setup Database

```sql
-- Connect to MySQL and create database
CREATE DATABASE inventory_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Step 3: Configure Environment

```powershell
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

Edit `.env` and update:
```env
DB_PASSWORD=your_mysql_password
ADMIN_PASSWORD=your_admin_password
SECRET_KEY=your-secret-key-here
```

**Generate a secure SECRET_KEY:**
```python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Step 4: Run the Backend

```bash
# From project root
python -m uvicorn backend.main:app --reload --port 8000
```

You should see:
```
🚀 Starting FastAPI Inventory Application...
✓ Database pool created: root@localhost:3306/inventory_db
✓ Database tables initialized
✓ Server ready at http://localhost:8000
✓ API docs at http://localhost:8000/docs
```

## Step 5: Open the Frontend

### Option A: Direct File Access (Simple)
Open `frontend/index.html` in your browser.

**Note:** Update `frontend/app.js` line 21 to use correct API URL:
```javascript
const API_BASE_URL = 'http://localhost:8000/api';
```

### Option B: Local Web Server (Recommended)
```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Python 3
python -m http.server 8080

# Open browser to:
# http://localhost:8080
```

## Step 6: Login

1. You'll see a login modal
2. Enter the password from your `.env` file (ADMIN_PASSWORD)
3. Click "Login"
4. You're in! 🎉

## Testing the API

### Via Swagger UI (Interactive Docs)

1. Open http://localhost:8000/docs
2. Click on any endpoint
3. Click "Try it out"
4. For protected endpoints:
   - First, go to `/api/auth/login`
   - Click "Try it out"
   - Enter password: `{"password": "your_admin_password"}`
   - Execute
   - Copy the `access_token` from response
   - Click "Authorize" button at top (🔒)
   - Enter: `Bearer <your_access_token>`
   - Now you can test protected endpoints!

### Via cURL

```bash
# Login to get token
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"password": "your_admin_password"}'

# Response will include: "access_token": "eyJ..."

# Use token for protected endpoints
curl -X GET "http://localhost:8000/api/articles" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Via Python

```python
import requests

# Login
response = requests.post('http://localhost:8000/api/auth/login', 
                         json={'password': 'your_admin_password'})
token = response.json()['access_token']

# Get articles
headers = {'Authorization': f'Bearer {token}'}
response = requests.get('http://localhost:8000/api/articles', headers=headers)
articles = response.json()
print(articles)
```

## Troubleshooting

### Database Connection Error
```
aiomysql.err.OperationalError: (2003, "Can't connect to MySQL server")
```

**Solution:**
- Check MySQL is running: `mysql -u root -p`
- Verify `.env` settings (DB_HOST, DB_USER, DB_PASSWORD, DB_PORT)
- Create database: `CREATE DATABASE inventory_db;`

### Module Not Found Error
```
ModuleNotFoundError: No module named 'fastapi'
```

**Solution:**
- Activate virtual environment: `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Linux/Mac)
- Install dependencies: `pip install -r backend/requirements.txt`

### Port Already in Use
```
OSError: [Errno 98] Address already in use
```

**Solution:**
- Change port in `.env`: `PORT=8001`
- Or run on different port: `uvicorn backend.main:app --port 8001`

### CORS Error in Browser
```
Access to fetch at 'http://localhost:8000/api/articles' has been blocked by CORS policy
```

**Solution:**
- Backend already allows all origins for development
- If using NGINX, ensure proxy headers are set correctly
- For production, update `allow_origins` in `backend/main.py`

### Login Token Not Working
```
401 Unauthorized: Could not validate credentials
```

**Causes:**
- Token expired (default: 24 hours)
- Token was modified
- SECRET_KEY changed in .env

**Solution:**
- Login again to get new token
- Don't change SECRET_KEY in production (invalidates all tokens)

## Next Steps

1. **Explore the Code**: Read comments in `backend/` files - they explain every concept!
2. **Try the API**: Use Swagger UI to test all endpoints
3. **Read README_FASTAPI.md**: Comprehensive guide with learning notes
4. **Experiment**: Add features, break things, learn!

## Useful Commands

```bash
# Run backend
uvicorn backend.main:app --reload

# Run with debug logging
uvicorn backend.main:app --reload --log-level debug

# Run frontend (separate terminal)
cd frontend && python -m http.server 8080

# Generate new SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Check Python version
python --version

# List installed packages
pip list
```

## Project URLs

- **Frontend**: http://localhost:8080 (if using local server)
- **Backend**: http://localhost:8000
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/api/health

---

**You're all set! 🚀**

Start by scanning a barcode or entering an EAN code to manage your inventory.

Need help? Check `README_FASTAPI.md` for detailed documentation.

