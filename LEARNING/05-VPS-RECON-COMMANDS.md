# VPS Reconnaissance Commands

SSH into your Hostinger VPS and run these commands.
Paste the output back so I can give you exact setup instructions.

## 1. System info
```bash
uname -a
cat /etc/os-release
```

## 2. Hardware (CPU + RAM + Disk)
```bash
nproc
free -h
df -h
```

## 3. What's already running
```bash
# Running services
systemctl list-units --type=service --state=running

# Listening ports (what apps are using what ports)
ss -tlnp

# Docker running? What containers?
docker ps 2>/dev/null || echo "Docker not installed"
docker compose version 2>/dev/null || echo "Docker Compose not installed"
```

## 4. Web server
```bash
# Nginx or Apache?
nginx -v 2>/dev/null || echo "Nginx not installed"
apache2 -v 2>/dev/null || echo "Apache not installed"
httpd -v 2>/dev/null || echo "httpd not installed"
```

## 5. Runtime tools
```bash
node -v 2>/dev/null || echo "Node not installed"
bun -v 2>/dev/null || echo "Bun not installed"
npm -v 2>/dev/null || echo "npm not installed"
git --version 2>/dev/null || echo "Git not installed"
psql --version 2>/dev/null || echo "PostgreSQL client not installed"
```

## 6. Current websites/apps
```bash
# Nginx sites
ls /etc/nginx/sites-enabled/ 2>/dev/null || ls /etc/nginx/conf.d/ 2>/dev/null || echo "No nginx config found"

# What's in the web root
ls /var/www/ 2>/dev/null || echo "No /var/www"

# PM2 processes (if any)
pm2 list 2>/dev/null || echo "PM2 not installed"
```

## 7. Who am I
```bash
whoami
id
```
