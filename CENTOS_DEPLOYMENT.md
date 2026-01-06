# CentOS/RHEL Production Deployment Guide

Complete guide for deploying FastAPI Inventory Management on CentOS/RHEL/Rocky Linux servers.

---

## 📋 Prerequisites

- CentOS/RHEL 8+ or Rocky Linux 8+
- Root or sudo access
- MySQL 8.0+ installed
- Domain name (optional, but recommended)

---

## 🚀 Quick Deployment

```bash
# 1. Install system dependencies
sudo dnf update -y
sudo dnf install python3.11 python3.11-pip python3.11-devel mysql-devel gcc nginx -y

# 2. Create application user
sudo useradd -r -s /bin/bash -d /var/www/inventory-app inventory

# 3. Create directories
sudo mkdir -p /var/www/inventory-app
sudo mkdir -p /var/log/fastapi-inventory

# 4. Upload your application
# (Upload backend/ and frontend/ directories to /var/www/inventory-app/)

# 5. Set permissions
sudo chown -R inventory:inventory /var/www/inventory-app
sudo chown -R inventory:inventory /var/log/fastapi-inventory

# 6. Setup application
sudo -u inventory bash -c "
    cd /var/www/inventory-app
    python3.11 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r backend/requirements.txt
"

# 7. Configure environment
sudo -u inventory nano /var/www/inventory-app/.env

# 8. Setup systemd service
sudo cp fastapi-inventory.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable fastapi-inventory
sudo systemctl start fastapi-inventory

# 9. Configure NGINX
sudo cp nginx-fastapi-inventory.conf /etc/nginx/conf.d/
sudo nginx -t
sudo systemctl reload nginx

# 10. Configure firewall
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Done!
```

---

## 📝 Detailed Step-by-Step Guide

### 1. System Update and Dependencies

```bash
# Update system
sudo dnf update -y

# Install Python 3.11 (recommended for FastAPI)
sudo dnf install python3.11 python3.11-pip python3.11-devel -y

# Install MySQL development libraries (for aiomysql)
sudo dnf install mysql-devel -y

# Install build tools
sudo dnf install gcc gcc-c++ make -y

# Install NGINX
sudo dnf install nginx -y

# Optional: Install certbot for SSL (Let's Encrypt)
sudo dnf install certbot python3-certbot-nginx -y
```

### 2. Create Application User

```bash
# Create dedicated user for security
sudo useradd -r -s /bin/bash -d /var/www/inventory-app -m inventory

# Create log directory
sudo mkdir -p /var/log/fastapi-inventory
sudo chown inventory:inventory /var/log/fastapi-inventory
```

### 3. Upload Application Files

**Option A: Using SCP from your Windows workstation**

```powershell
# From Windows (PowerShell)
scp -r backend/ user@your-server:/tmp/
scp -r frontend/ user@your-server:/tmp/
scp fastapi-inventory.service user@your-server:/tmp/
```

Then on the server:
```bash
sudo mv /tmp/backend /var/www/inventory-app/
sudo mv /tmp/frontend /var/www/inventory-app/
sudo chown -R inventory:inventory /var/www/inventory-app
```

**Option B: Using Git**

```bash
# Install git
sudo dnf install git -y

# Clone repository (if using git)
sudo -u inventory git clone https://github.com/yourusername/inventory-app.git /var/www/inventory-app

# Or pull updates
cd /var/www/inventory-app
sudo -u inventory git pull
```

**Option C: Using SFTP**

Use WinSCP or FileZilla from Windows to upload files.

### 4. Setup Python Virtual Environment

```bash
# Switch to inventory user
sudo -u inventory bash

# Navigate to app directory
cd /var/www/inventory-app

# Create virtual environment with Python 3.11
python3.11 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r backend/requirements.txt

# Exit inventory user shell
exit
```

### 5. Configure Environment Variables

```bash
# Create .env file
sudo -u inventory nano /var/www/inventory-app/.env
```

Add the following configuration:

```env
# Database Configuration
DB_HOST=localhost
DB_NAME=inventory_db
DB_USER=inventory_user
DB_PASSWORD=your_secure_password_here
DB_PORT=3306

# Server Configuration
PORT=8000

# Authentication - CHANGE THESE!
ADMIN_PASSWORD=your_admin_password_here
SECRET_KEY=generate_random_secret_key_here

# JWT Configuration
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24

# Language Configuration (Swedish by default)
LANG_APP_TITLE=📦 Lagerhantering
LANG_EXPORT_CSV=Exportera CSV
# ... (add all language variables)
```

**Generate a secure SECRET_KEY:**

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 6. Setup MySQL Database

```bash
# Login to MySQL as root
sudo mysql -u root -p
```

```sql
-- Create database
CREATE DATABASE inventory_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (use a strong password!)
CREATE USER 'inventory_user'@'localhost' IDENTIFIED BY 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON inventory_db.* TO 'inventory_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Exit
EXIT;
```

**Test database connection:**

```bash
sudo -u inventory bash -c "
    cd /var/www/inventory-app
    source venv/bin/activate
    python -c 'import asyncio; from backend.database import init_db_pool, init_database_tables; asyncio.run(init_db_pool()); asyncio.run(init_database_tables())'
"
```

### 7. Setup Systemd Service

```bash
# Copy service file
sudo cp /var/www/inventory-app/fastapi-inventory.service /etc/systemd/system/

# Edit service file to match your setup
sudo nano /etc/systemd/system/fastapi-inventory.service
```

Update these lines if needed:
- `User=inventory` (your app user)
- `WorkingDirectory=/var/www/inventory-app`
- `EnvironmentFile=/var/www/inventory-app/.env`

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable fastapi-inventory

# Start service
sudo systemctl start fastapi-inventory

# Check status
sudo systemctl status fastapi-inventory

# View logs
sudo journalctl -u fastapi-inventory -f
```

### 8. Configure NGINX

Create NGINX configuration:

```bash
sudo nano /etc/nginx/conf.d/inventory.conf
```

Add the following:

```nginx
# FastAPI Inventory Management - NGINX Configuration
# ==================================================

# Upstream to FastAPI application
upstream fastapi_backend {
    server 127.0.0.1:8000;
}

# HTTP Server (redirect to HTTPS in production)
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # For Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect to HTTPS (uncomment after SSL setup)
    # return 301 https://$server_name$request_uri;
    
    # Serve frontend static files
    location / {
        root /var/www/inventory-app/frontend;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Proxy API requests to FastAPI
    location /api/ {
        proxy_pass http://fastapi_backend/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (if needed in future)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # API docs endpoints
    location ~ ^/(docs|redoc|openapi.json) {
        proxy_pass http://fastapi_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    
    # Logging
    access_log /var/log/nginx/inventory-access.log;
    error_log /var/log/nginx/inventory-error.log;
}

# HTTPS Server (configure after SSL certificate)
# server {
#     listen 443 ssl http2;
#     server_name your-domain.com www.your-domain.com;
#     
#     # SSL Configuration
#     ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers HIGH:!aNULL:!MD5;
#     ssl_prefer_server_ciphers on;
#     
#     # ... (copy all location blocks from HTTP server above)
# }
```

Update `server_name` with your actual domain.

```bash
# Test NGINX configuration
sudo nginx -t

# If successful, reload NGINX
sudo systemctl reload nginx

# Enable NGINX to start on boot
sudo systemctl enable nginx

# Start NGINX
sudo systemctl start nginx
```

### 9. Configure Firewall

```bash
# Check firewall status
sudo firewall-cmd --state

# Allow HTTP and HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# Reload firewall
sudo firewall-cmd --reload

# List rules
sudo firewall-cmd --list-all
```

### 10. Setup SSL with Let's Encrypt (Optional but Recommended)

```bash
# Install certbot
sudo dnf install certbot python3-certbot-nginx -y

# Stop NGINX temporarily
sudo systemctl stop nginx

# Obtain certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Start NGINX
sudo systemctl start nginx

# Uncomment HTTPS server block in NGINX config
sudo nano /etc/nginx/conf.d/inventory.conf

# Update paths to your domain
# Uncomment the HTTPS server block
# Uncomment the HTTP to HTTPS redirect

# Test configuration
sudo nginx -t

# Reload NGINX
sudo systemctl reload nginx

# Setup auto-renewal
sudo systemctl enable certbot-renew.timer
sudo systemctl start certbot-renew.timer
```

### 11. SELinux Configuration (CentOS/RHEL)

If SELinux is enforcing:

```bash
# Check SELinux status
getenforce

# Allow NGINX to connect to network
sudo setsebool -P httpd_can_network_connect 1

# Set correct context for application files
sudo semanage fcontext -a -t httpd_sys_content_t "/var/www/inventory-app(/.*)?"
sudo restorecon -R /var/www/inventory-app

# If you have issues, check SELinux logs
sudo ausearch -m avc -ts recent
```

---

## 🔍 Testing Deployment

### 1. Test Backend Directly

```bash
# Check if service is running
sudo systemctl status fastapi-inventory

# Test health endpoint
curl http://localhost:8000/api/health

# Should return: {"status":"ok","message":"API is running"}
```

### 2. Test NGINX Proxy

```bash
# Test through NGINX
curl http://localhost/api/health

# Test from external
curl http://your-domain.com/api/health
```

### 3. Test Frontend

Open browser: `http://your-domain.com`

You should see the login page.

### 4. Test API Docs

Open browser: `http://your-domain.com/docs`

You should see Swagger UI.

---

## 📊 Monitoring and Maintenance

### View Application Logs

```bash
# Real-time logs
sudo journalctl -u fastapi-inventory -f

# Last 100 lines
sudo journalctl -u fastapi-inventory -n 100

# Logs since yesterday
sudo journalctl -u fastapi-inventory --since yesterday

# NGINX access logs
sudo tail -f /var/log/nginx/inventory-access.log

# NGINX error logs
sudo tail -f /var/log/nginx/inventory-error.log

# Application logs (if configured)
sudo tail -f /var/log/fastapi-inventory/access.log
sudo tail -f /var/log/fastapi-inventory/error.log
```

### Service Management

```bash
# Start service
sudo systemctl start fastapi-inventory

# Stop service
sudo systemctl stop fastapi-inventory

# Restart service
sudo systemctl restart fastapi-inventory

# Reload (graceful restart)
sudo systemctl reload fastapi-inventory

# Check status
sudo systemctl status fastapi-inventory

# Enable auto-start on boot
sudo systemctl enable fastapi-inventory
```

### Update Application

```bash
# Stop service
sudo systemctl stop fastapi-inventory

# Switch to inventory user
sudo -u inventory bash

# Navigate to app directory
cd /var/www/inventory-app

# Pull latest code (if using git)
git pull

# Activate virtual environment
source venv/bin/activate

# Update dependencies
pip install --upgrade -r backend/requirements.txt

# Exit inventory user
exit

# Start service
sudo systemctl start fastapi-inventory

# Check status
sudo systemctl status fastapi-inventory
```

---

## 🔒 Security Checklist

- [ ] Change default `ADMIN_PASSWORD` in .env
- [ ] Generate strong `SECRET_KEY` in .env
- [ ] Use strong MySQL password
- [ ] Enable firewall (firewalld)
- [ ] Configure SELinux properly
- [ ] Setup SSL certificate (Let's Encrypt)
- [ ] Regular system updates: `sudo dnf update -y`
- [ ] Regular security audits
- [ ] Implement rate limiting (optional)
- [ ] Setup fail2ban (optional)
- [ ] Regular backups of database
- [ ] Monitor logs for suspicious activity

---

## 🔧 Troubleshooting

### Service Won't Start

```bash
# Check logs
sudo journalctl -u fastapi-inventory -n 50

# Common issues:
# 1. Database connection - check .env credentials
# 2. Port already in use - check: sudo netstat -tulpn | grep 8000
# 3. Permission issues - check file ownership
# 4. Missing dependencies - reinstall requirements.txt
```

### Database Connection Errors

```bash
# Test MySQL connection
mysql -u inventory_user -p inventory_db

# Check MySQL is running
sudo systemctl status mysqld

# Check .env file has correct credentials
sudo -u inventory cat /var/www/inventory-app/.env | grep DB_
```

### NGINX Issues

```bash
# Test configuration
sudo nginx -t

# Check NGINX logs
sudo tail -f /var/log/nginx/error.log

# Restart NGINX
sudo systemctl restart nginx
```

### 502 Bad Gateway

This usually means NGINX can't connect to FastAPI:

```bash
# Check if FastAPI is running
sudo systemctl status fastapi-inventory

# Check if listening on port
sudo netstat -tulpn | grep 8000

# Check SELinux (CentOS/RHEL)
sudo setsebool -P httpd_can_network_connect 1
```

---

## 📦 Backup Strategy

### Database Backup

```bash
# Create backup script
sudo nano /usr/local/bin/backup-inventory-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/inventory-db"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u inventory_user -p'your_password' inventory_db | gzip > $BACKUP_DIR/inventory_db_$DATE.sql.gz
# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-inventory-db.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
```

Add line:
```
0 2 * * * /usr/local/bin/backup-inventory-db.sh
```

### Application Backup

```bash
# Backup application files
sudo tar -czf /var/backups/inventory-app-$(date +%Y%m%d).tar.gz -C /var/www inventory-app
```

---

## 🚀 Performance Tuning

### Gunicorn Workers

Edit `/etc/systemd/system/fastapi-inventory.service`:

```ini
# Formula: (2 x CPU cores) + 1
# For 4 core server: --workers 9
--workers 4
```

### MySQL Optimization

```bash
sudo nano /etc/my.cnf.d/mysql-server.cnf
```

Add under `[mysqld]`:
```ini
max_connections = 200
innodb_buffer_pool_size = 1G  # Adjust based on RAM
query_cache_size = 64M
```

```bash
sudo systemctl restart mysqld
```

---

## 📞 Support

For issues:
1. Check logs: `sudo journalctl -u fastapi-inventory -f`
2. Review CENTOS_DEPLOYMENT.md
3. Check README_FASTAPI.md

---

**Your FastAPI application is now deployed on CentOS! 🎉**

Access your application at: `http://your-domain.com`  
API Documentation: `http://your-domain.com/docs`

