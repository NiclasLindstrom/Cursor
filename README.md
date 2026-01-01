# Inventory Management Web App

A full-stack web application for managing inventory with barcode scanning capabilities.

## Features

- 📦 Manage inventory articles with unique EAN codes
- 📷 Barcode scanning using device camera (mobile and desktop)
- 🔍 Search articles by EAN code, name, or description
- ➕ Create, edit, and delete articles
- 💾 MySQL database backend
- 🎨 Modern, responsive UI

## Tech Stack

- **Backend**: Python (Flask)
- **Database**: MySQL
- **Frontend**: HTML, CSS, JavaScript (Vanilla JS)
- **Barcode Scanning**: QuaggaJS

## Prerequisites

- Python 3.7+
- MySQL Server
- pip (Python package manager)

## Quick Start

1. **Create database**: `CREATE DATABASE inventory_db;`
2. **Create `.env` file** with your MySQL credentials (see Setup Instructions below)
3. **Install dependencies**: `pip install -r requirements.txt`
4. **Run the app**: `python app.py`
5. **Open browser**: `http://localhost:5000`

For detailed testing instructions, see [TESTING_GUIDE.md](TESTING_GUIDE.md)

## Setup Instructions

### 1. Database Setup

Create a MySQL database:

```sql
CREATE DATABASE inventory_db;
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
DB_HOST=localhost
DB_NAME=inventory_db
DB_USER=root
DB_PASSWORD=your_password_here
DB_PORT=3306
```

Replace `your_password_here` with your MySQL root password.

### 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the Application

Start the Flask server:

```bash
python app.py
```

The backend will be available at `http://localhost:5000`

### 5. Access the Application

Open your web browser and navigate to:

```
http://localhost:5000
```

The Flask server serves both the API and the frontend, so everything is accessible from one URL.

## Usage

### Adding Articles

1. Click the "+ Add New Article" button
2. Fill in the required fields (EAN code and name)
3. Optionally add description, quantity, and price
4. Click "Save"

### Scanning Barcodes

1. Click the "📷 Scan" button
2. Allow camera access when prompted
3. Point the camera at a barcode
4. The EAN code will be automatically entered in the search field
5. If the article exists, it will be displayed
6. If not, you'll be prompted to create it

### Searching

- Type in the search field to filter articles by EAN code, name, or description
- The search is performed in real-time as you type

### Editing Articles

- Click the "Edit" button on any article card
- Modify the fields (EAN code cannot be changed)
- Click "Save"

### Deleting Articles

- Click the "Delete" button on any article card
- Confirm the deletion

## API Endpoints

- `GET /api/articles` - Get all articles (optional `?search=term` query parameter)
- `GET /api/articles/<ean_code>` - Get article by EAN code
- `POST /api/articles` - Create new article
- `PUT /api/articles/<ean_code>` - Update article
- `DELETE /api/articles/<ean_code>` - Delete article
- `GET /api/health` - Health check

## Database Schema

```sql
CREATE TABLE articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ean_code VARCHAR(13) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INT DEFAULT 0,
    price DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Notes

- The app uses CORS to allow frontend-backend communication
- Barcode scanning works best on mobile devices with a back camera
- EAN codes are unique and cannot be duplicated
- The database is automatically initialized on first run

## Troubleshooting

### Database Connection Issues

- Verify MySQL is running
- Check `.env` file has correct credentials
- Ensure the database exists

### Camera Not Working

- Make sure you're using HTTPS or localhost (required for camera access)
- Grant camera permissions in your browser
- Try a different browser if issues persist

### CORS Errors

- Ensure the Flask server is running
- Check that the API_BASE_URL in `app.js` matches your backend URL

