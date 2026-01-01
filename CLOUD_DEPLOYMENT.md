# Cloud Deployment Guide

## Issue: "Failed to fetch" Error

If you're getting "Failed to fetch" errors when the backend is on a cloud server, here's how to fix it:

## Solution 1: Auto-Detection (Recommended)

The app now **automatically detects** the API URL based on where it's being accessed from:

- If you access the app from the same domain as the Flask server, it will use that domain
- If you access from `localhost`, it uses `localhost:5000`
- The API URL is logged to the browser console for debugging

**Just make sure:**
1. The Flask server is serving the frontend (which it does by default)
2. You access the app from the same URL as the backend
3. CORS is enabled (already configured in `app.py`)

## Solution 2: Manual Configuration

If auto-detection doesn't work, you can manually set the API URL:

### Option A: Using Browser Console

1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Run:
```javascript
localStorage.setItem('API_BASE_URL', 'https://your-cloud-server.com/api');
location.reload();
```

Replace `https://your-cloud-server.com` with your actual server URL.

### Option B: Edit app.js Directly

If you need a permanent fix, edit `static/app.js` and change line 29:

```javascript
// Instead of: const API_BASE_URL = getApiBaseUrl();
const API_BASE_URL = 'https://your-cloud-server.com/api';
```

## CORS Configuration

The backend is already configured to allow CORS from any origin. If you need to restrict it to specific domains, edit `app.py`:

```python
# Current (allows all):
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Restricted (replace with your domain):
CORS(app, resources={r"/api/*": {"origins": ["https://yourdomain.com"]}})
```

## Testing the Connection

1. Open the app in your browser
2. Check the header - it should show connection status
3. Open browser console (F12) - you'll see the API URL being used
4. Test the health endpoint: `https://your-server.com/api/health`

## Common Issues

### Issue: Still getting "Failed to fetch"

**Check:**
1. ✅ Flask server is running on the cloud server
2. ✅ Port 5000 (or your port) is open in firewall
3. ✅ Database connection is working (check server logs)
4. ✅ CORS is enabled (check `app.py` line 11)
5. ✅ You're accessing via HTTPS if required

### Issue: CORS errors in console

**Solution:** The CORS configuration in `app.py` should already allow all origins. If you see CORS errors, verify:
- Flask-CORS is installed: `pip install Flask-CORS`
- The CORS line in `app.py` is: `CORS(app, resources={r"/api/*": {"origins": "*"}})`

### Issue: Database connection works but API doesn't

**Check:**
- Flask server logs for errors
- Network tab in browser DevTools to see the actual request/response
- Server firewall rules allow incoming connections on port 5000

## Debugging Steps

1. **Check API URL:**
   - Open browser console (F12)
   - Look for: `API Base URL: ...`
   - Verify it matches your server URL

2. **Test API directly:**
   - Open: `https://your-server.com/api/health`
   - Should return: `{"status":"ok"}`

3. **Check browser network tab:**
   - Open DevTools → Network tab
   - Try to add an article
   - Look at the failed request
   - Check the URL, status code, and error message

4. **Check server logs:**
   - Look at Flask server output
   - Check for any error messages
   - Verify database connection is working

## Quick Fix Checklist

- [ ] Flask server is running on cloud server
- [ ] Database is accessible from cloud server
- [ ] `.env` file has correct database credentials
- [ ] Port is open in firewall/security groups
- [ ] CORS is enabled in `app.py`
- [ ] API URL matches server URL (check browser console)
- [ ] Health endpoint works: `/api/health`

