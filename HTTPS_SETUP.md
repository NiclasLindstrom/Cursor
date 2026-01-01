# HTTPS Setup Guide

This guide explains how to enable HTTPS in Flask for camera access and secure connections.

## Why HTTPS?

- **Camera Access**: Chrome and other browsers require HTTPS (or localhost) for camera access
- **Security**: Encrypts data between browser and server
- **Modern Web Standards**: Many browser features require HTTPS

## Option 1: Self-Signed Certificate (Development)

### Step 1: Generate Certificates

```bash
python generate_cert.py
```

This creates:
- `cert.pem` - SSL certificate
- `key.pem` - Private key

### Step 2: Enable SSL in .env

Add to your `.env` file:

```env
SSL_ENABLED=true
SSL_CERT=cert.pem
SSL_KEY=key.pem
```

### Step 3: Start Flask

```bash
python app.py
```

The server will start with HTTPS on port 5000.

### Step 4: Access the App

Open: `https://localhost:5000`

**Browser Warning:** Your browser will show a security warning because the certificate is self-signed. This is normal for development:
1. Click "Advanced" or "Show Details"
2. Click "Proceed to localhost" or "Accept the Risk and Continue"

## Option 2: Production Setup with Reverse Proxy

For production, use a reverse proxy (nginx/Apache) with Let's Encrypt certificates.

### Using nginx + Let's Encrypt

1. **Install nginx and certbot:**
```bash
sudo apt-get update
sudo apt-get install nginx certbot python3-certbot-nginx
```

2. **Configure nginx:**
Create `/etc/nginx/sites-available/inventory`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. **Enable the site:**
```bash
sudo ln -s /etc/nginx/sites-available/inventory /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

4. **Get SSL certificate:**
```bash
sudo certbot --nginx -d your-domain.com
```

5. **Update Flask to run on localhost only:**
In `.env`:
```env
SSL_ENABLED=false
PORT=5000
```

And in `app.py`, change:
```python
app.run(debug=False, host='127.0.0.1', port=5000)  # Only localhost
```

6. **Access:** `https://your-domain.com`

## Option 3: Cloud Provider SSL

Many cloud providers offer SSL termination:

- **Heroku**: Automatic HTTPS
- **AWS**: Use Application Load Balancer with ACM certificates
- **Google Cloud**: Use Cloud Load Balancer
- **Azure**: Use Application Gateway

## Troubleshooting

### Certificate files not found

**Error:** `SSL enabled but certificate files not found`

**Solution:**
1. Run `python generate_cert.py` to generate certificates
2. Or set `SSL_ENABLED=false` in `.env` to use HTTP

### Browser shows "Not Secure"

**For self-signed certificates:** This is normal. Click "Advanced" → "Proceed to localhost"

**For production:** Make sure you're using a valid certificate (Let's Encrypt or commercial)

### Camera still not working

**Check:**
1. You're accessing via `https://` (not `http://`)
2. You've accepted the security warning (for self-signed certs)
3. Camera permissions are granted in browser settings
4. You're not on HTTP (Chrome blocks camera on HTTP except localhost)

### Port already in use

**Error:** `Address already in use`

**Solution:** Change the port in `.env`:
```env
PORT=5001
```

Then access at `https://localhost:5001`

## Security Notes

- **Self-signed certificates** are for development only
- **Production** should use valid certificates (Let's Encrypt is free)
- **Never commit** `key.pem` to version control (it's in `.gitignore`)
- **Rotate certificates** regularly in production

## Quick Reference

| Setup Type | Certificate | Use Case |
|------------|------------|----------|
| Self-signed | `generate_cert.py` | Development |
| Let's Encrypt | certbot | Production |
| Cloud SSL | Provider-managed | Production (cloud) |

