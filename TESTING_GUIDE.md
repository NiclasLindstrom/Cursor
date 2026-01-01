# Testing Guide - Inventory Management App

This guide will walk you through setting up and testing the application step by step.

## Prerequisites Check

First, verify you have the required software installed:

### Check Python Version
```bash
python --version
# Should be Python 3.7 or higher
```

### Check MySQL Installation
```bash
mysql --version
# Should show MySQL version
```

### Check if MySQL is Running
- **Windows**: Open Services and check if MySQL service is running
- **Mac/Linux**: `sudo systemctl status mysql` or `brew services list`

## Step-by-Step Setup

### Step 1: Create MySQL Database

1. Open MySQL command line or MySQL Workbench
2. Connect to your MySQL server
3. Run:
```sql
CREATE DATABASE inventory_db;
```

Or using command line:
```bash
mysql -u root -p -e "CREATE DATABASE inventory_db;"
```

### Step 2: Create Environment File

Create a `.env` file in the project root directory:

**Windows (PowerShell):**
```powershell
@"
DB_HOST=localhost
DB_NAME=inventory_db
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_PORT=3306
"@ | Out-File -FilePath .env -Encoding utf8
```

**Mac/Linux:**
```bash
cat > .env << EOF
DB_HOST=localhost
DB_NAME=inventory_db
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_PORT=3306
EOF
```

**Important**: Replace `your_mysql_password` with your actual MySQL root password.

### Step 3: Install Python Dependencies

```bash
pip install -r requirements.txt
```

If you encounter issues, try:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 4: Verify Installation

Check that all packages are installed:
```bash
pip list | findstr Flask
pip list | findstr mysql
```

## Running the Application

### Start the Flask Server

```bash
python app.py
```

You should see output like:
```
Database initialized successfully
 * Running on http://0.0.0.0:5000
 * Debug mode: on
```

### Access the Application

Open your web browser and go to:
```
http://localhost:5000
```

You should see the Inventory Management interface.

## Testing Scenarios

### Test 1: Health Check (API)

1. Open a new browser tab
2. Navigate to: `http://localhost:5000/api/health`
3. **Expected**: You should see `{"status":"ok"}`

### Test 2: Database Connection

1. Check the terminal where Flask is running
2. **Expected**: You should see "Database initialized successfully" message
3. If you see database errors, check your `.env` file credentials

### Test 3: Create Your First Article (Manual Entry)

1. Click the **"+ Add New Article"** button
2. Fill in the form:
   - **EAN Code**: `1234567890123` (or any 13-digit number)
   - **Name**: `Test Product`
   - **Description**: `This is a test product`
   - **Quantity**: `10`
   - **Price**: `19.99`
3. Click **"Save"**
4. **Expected**: 
   - Modal closes
   - New article appears in the list
   - Article shows all entered information

### Test 4: Search Functionality

1. Type "Test" in the search field
2. **Expected**: Your test product appears
3. Type "999" in the search field
4. **Expected**: No results (or "No articles found" message)
5. Clear the search field
6. **Expected**: All articles appear again

### Test 5: Edit Article

1. Click **"Edit"** on your test article
2. Change the quantity to `25`
3. Change the price to `24.99`
4. Click **"Save"**
5. **Expected**: 
   - Modal closes
   - Article shows updated quantity and price
   - EAN code field should be disabled (cannot be changed)

### Test 6: Delete Article

1. Click **"Delete"** on your test article
2. Confirm the deletion
3. **Expected**: 
   - Article disappears from the list
   - Confirmation dialog appears before deletion

### Test 7: Duplicate EAN Code Prevention

1. Click **"+ Add New Article"**
2. Enter the same EAN code you used before: `1234567890123`
3. Fill in other fields
4. Click **"Save"**
5. **Expected**: 
   - Error message: "EAN code already exists"
   - Article is not created

### Test 8: Barcode Scanning (If Camera Available)

1. Click the **"📷 Scan"** button
2. **Expected**: 
   - Browser asks for camera permission
   - Camera view appears
3. Point camera at a barcode (or use a barcode image on screen)
4. **Expected**: 
   - Barcode is detected
   - EAN code appears in search field
   - Scanner stops automatically
5. Click **"Stop Scanning"** to manually stop

**Note**: 
- Camera access requires HTTPS or localhost
- Works best on mobile devices
- You can test with barcode images displayed on your screen

### Test 9: API Testing (Using Browser Console)

1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Test GET all articles:
```javascript
fetch('http://localhost:5000/api/articles')
  .then(r => r.json())
  .then(console.log)
```

4. Test GET specific article:
```javascript
fetch('http://localhost:5000/api/articles/1234567890123')
  .then(r => r.json())
  .then(console.log)
```

5. Test CREATE article:
```javascript
fetch('http://localhost:5000/api/articles', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    ean_code: '9876543210987',
    name: 'API Test Product',
    quantity: 5,
    price: 15.50
  })
})
.then(r => r.json())
.then(console.log)
```

## Common Issues and Solutions

### Issue: "Database connection failed"

**Solutions:**
1. Check MySQL is running
2. Verify `.env` file exists and has correct credentials
3. Test MySQL connection manually:
   ```bash
   mysql -u root -p -e "USE inventory_db; SHOW TABLES;"
   ```

### Issue: "Module not found" errors

**Solution:**
```bash
pip install -r requirements.txt
```

### Issue: Port 5000 already in use

**Solution:** Change port in `app.py`:
```python
app.run(debug=True, host='0.0.0.0', port=5001)
```
Then access at `http://localhost:5001`

### Issue: Camera not working

**Solutions:**
1. Make sure you're using `localhost` or `127.0.0.1` (not IP address)
2. Grant camera permissions in browser settings
3. Try a different browser (Chrome/Edge work best)
4. On mobile, ensure you're using HTTPS or localhost

### Issue: CORS errors in browser console

**Solution:** Make sure Flask server is running and accessible at `http://localhost:5000`

## Quick Test Checklist

- [ ] Flask server starts without errors
- [ ] Database connection successful
- [ ] Can access `http://localhost:5000`
- [ ] Can create a new article
- [ ] Can search for articles
- [ ] Can edit an article
- [ ] Can delete an article
- [ ] Duplicate EAN codes are prevented
- [ ] Camera scanner opens (if available)
- [ ] API endpoints respond correctly

## Next Steps

Once all tests pass:
1. Add more articles to build your inventory
2. Test with real barcodes
3. Use on mobile device for better barcode scanning
4. Customize the UI if needed

