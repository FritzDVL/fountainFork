# VPS Self-Hosting Guide — Hostinger Ubuntu 24.04

Your VPS: 2 CPU, 8GB RAM, 90GB disk, Ubuntu 24.04
IP: 72.61.119.100
Currently running: Nginx + old Web3Forum (PM2) + Docker

This guide sets up: Auth Server + Forum App + Self-hosted Supabase
All on one box.

---

## What We're Building

```
Internet
  │
  ▼
Nginx (reverse proxy, HTTPS)
  ├── yourdomain.com         → localhost:3000  (Forum App - Next.js)
  ├── auth.yourdomain.com    → localhost:3004  (Auth Server - Express)
  └── db.yourdomain.com      → localhost:8000  (Supabase Studio - optional)
      │
      ├── Supabase (Docker)  → ports 5432, 8000, etc.
      └── PostgreSQL inside Supabase container
```

---

## Phase A: Prepare the VPS

### A1. Update system (it's asking for a restart)

```bash
apt update && apt upgrade -y
reboot
```

Wait 30 seconds, SSH back in.

### A2. Install Bun

Fountain requires Bun v1.2.5+.

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun -v
# Should show 1.x.x
```

### A3. Check your existing app

Your old Web3Forum is running on port 3000. We'll stop it later when
we're ready to deploy the new forum. For now, leave it running.

```bash
# See what's running
pm2 list

# See the nginx config for it
cat /etc/nginx/sites-enabled/web3forum
```

Save that nginx config output — we'll base the new configs on it.

---

## Phase B: Self-Host Supabase (Docker)

Supabase runs as a set of Docker containers. With 8GB RAM, you have
plenty of room (Supabase uses ~1.5-2GB).

### B1. Clone Supabase Docker setup

```bash
cd /opt
git clone --depth 1 https://github.com/supabase/supabase.git
cd supabase/docker
```

### B2. Configure environment

```bash
cp .env.example .env
nano .env
```

**Critical values to change in `.env`:**

```env
# CHANGE THESE — they are your database passwords
POSTGRES_PASSWORD=<generate-a-strong-password>
JWT_SECRET=<generate-a-long-random-string-at-least-32-chars>
ANON_KEY=<will-generate-below>
SERVICE_ROLE_KEY=<will-generate-below>
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=<pick-a-password-for-the-web-dashboard>

# Set your domain (or leave localhost for now)
SITE_URL=http://localhost:3000
API_EXTERNAL_URL=http://localhost:8000
```

### B3. Generate JWT keys

Supabase needs JWT tokens derived from your JWT_SECRET. Use this site
or generate them locally:

```bash
# Install the JWT tool
npm install -g jsonwebtoken

# Or use Supabase's own generator:
# Go to https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys
# Enter your JWT_SECRET, it gives you ANON_KEY and SERVICE_ROLE_KEY
```

Alternatively, use the quick method — pick a JWT_SECRET and generate
keys at: https://supabase.com/docs/guides/self-hosting/docker#api-keys

Put the generated `ANON_KEY` and `SERVICE_ROLE_KEY` back in the `.env`.

### B4. Start Supabase

```bash
docker compose up -d
```

First run downloads ~2GB of images. Wait a few minutes.

```bash
# Check all containers are running
docker compose ps

# You should see: supabase-db, supabase-auth, supabase-rest,
# supabase-realtime, supabase-storage, supabase-studio, etc.
```

### B5. Verify it works

```bash
# Supabase Studio (dashboard) should be on port 8000
curl -s http://localhost:8000 | head -5

# PostgreSQL should be on port 5432
docker exec supabase-db psql -U postgres -c "SELECT 1;"
```

### B6. Your Supabase credentials

These go in your app's `.env` later:

```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000  (or https://db.yourdomain.com)
NEXT_PUBLIC_SUPABASE_ANON_KEY=<the ANON_KEY you generated>
SUPABASE_SERVICE_KEY=<the SERVICE_ROLE_KEY you generated>
SUPABASE_JWT_SECRET=<the JWT_SECRET you chose>
DATABASE_URL=postgresql://postgres:<POSTGRES_PASSWORD>@localhost:5432/postgres
```

---

## Phase C: Auth Server

### C1. Clone the auth server

```bash
cd /opt
git clone https://github.com/fountain-ink/auth.git society-forum-auth
cd society-forum-auth
bun install
```

### C2. Generate auth keys

```bash
bun src/keygen.ts
```

**Save the 3 values it prints.** You need them for the `.env`.

### C3. Configure

```bash
nano .env
```

```env
PRIVATE_KEY=<SIGNER_PRIVATE_KEY from keygen>
ENVIRONMENT=production
API_SECRET=<AUTH_API_SECRET from keygen>
APP_ADDRESS=0x637E685eF29403831dE51A58Bc8230b88549745E
APP_ADDRESS_TESTNET=0x9eD1562A4e3803964F3c84301b18d4E1944D340b
PORT=3004
```

### C4. Test locally

```bash
bun run start
# In another terminal:
curl -s http://localhost:3004/ | head
```

### C5. Run with PM2

```bash
pm2 start "bun run start" --name auth-server --cwd /opt/society-forum-auth
pm2 save
```

Verify:
```bash
pm2 list
# Should show: web3forum (existing) + auth-server (new)

ss -tlnp | grep 3004
# Should show auth-server listening
```

---

## Phase D: Forum App

### D1. Get the code onto the VPS

Option A — clone from your GitHub fork:
```bash
cd /opt
git clone https://github.com/<your-org>/fountainFork.git society-forum
cd society-forum
bun install
```

Option B — if you don't have a GitHub repo yet, rsync from your Mac:
```bash
# Run this on your MAC, not the VPS:
rsync -avz --exclude node_modules --exclude .next --exclude .git \
  ~/Developer/fountainFork/ root@72.61.119.100:/opt/society-forum/

# Then on the VPS:
cd /opt/society-forum
bun install
```

### D2. Configure `.env`

```bash
cd /opt/society-forum
nano .env
```

```env
# Supabase (self-hosted)
NEXT_PUBLIC_SUPABASE_URL=https://db.yourdomain.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your ANON_KEY>
SUPABASE_JWT_SECRET=<your JWT_SECRET>
SUPABASE_SERVICE_KEY=<your SERVICE_ROLE_KEY>
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/postgres

# Lens
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_APP_ADDRESS=0x637E685eF29403831dE51A58Bc8230b88549745E
NEXT_PUBLIC_APP_ADDRESS_TESTNET=0x9eD1562A4e3803964F3c84301b18d4E1944D340b
LENS_API_KEY=<from developer.lens.xyz>

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your project id>

# Placeholders (not needed yet)
LISTMONK_API_URL=http://localhost:9000/api
LISTMONK_API_USERNAME=admin
LISTMONK_API_TOKEN=placeholder
IFRAMELY_BASE_URL=placeholder
```

### D3. Run Fountain migrations

```bash
# Install Supabase CLI if not present
npm install -g supabase

# Push migrations to your self-hosted Supabase
cd /opt/society-forum
supabase db push --db-url postgresql://postgres:<password>@localhost:5432/postgres
```

### D4. Build and run

```bash
bun run build
pm2 start "bun run start" --name society-forum --cwd /opt/society-forum
pm2 save
```

---

## Phase E: Nginx (HTTPS + Reverse Proxy)

### E1. Set up DNS

In your domain registrar (or Hostinger DNS panel), create A records:

```
yourdomain.com       → 72.61.119.100
auth.yourdomain.com  → 72.61.119.100
db.yourdomain.com    → 72.61.119.100
```

### E2. Install Certbot (for free HTTPS)

```bash
apt install certbot python3-certbot-nginx -y
```

### E3. Create Nginx configs

```bash
nano /etc/nginx/sites-available/society-forum
```

```nginx
# Main forum app
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Auth server
server {
    listen 80;
    server_name auth.yourdomain.com;

    location / {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Supabase Studio (optional — for admin access to DB dashboard)
server {
    listen 80;
    server_name db.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### E4. Enable the config

```bash
ln -s /etc/nginx/sites-available/society-forum /etc/nginx/sites-enabled/
nginx -t          # test config
systemctl reload nginx
```

### E5. Get HTTPS certificates

```bash
certbot --nginx -d yourdomain.com -d auth.yourdomain.com -d db.yourdomain.com
```

Follow the prompts. Certbot auto-configures HTTPS and sets up auto-renewal.

### E6. When ready: swap out the old app

Once the new forum is working, stop the old Web3Forum:

```bash
pm2 stop web3forum
# The new society-forum is already on port 3000
```

---

## Phase F: Register Auth with Lens (One-Time)

This runs from your LOCAL machine (Mac), not the VPS, because it needs
your Builder wallet private key which should stay on your dev machine.

```bash
cd ~/Developer/fountainFork
# Create and run the registration script
# (see BLUEPRINT/01-FOUNDATION.md Step 1.5)
# It tells Lens: "My auth endpoint is https://auth.yourdomain.com/authorize"
```

---

## Final State

```bash
pm2 list
# ┌────┬──────────────────┬──────┬────────┐
# │ id │ name             │ mode │ status │
# ├────┼──────────────────┼──────┼────────┤
# │ 0  │ web3forum        │ fork │ stopped│  ← old app (stopped)
# │ 1  │ auth-server      │ fork │ online │  ← auth server :3004
# │ 2  │ society-forum    │ fork │ online │  ← forum app :3000
# └────┴──────────────────┴──────┴────────┘

docker compose -f /opt/supabase/docker/docker-compose.yml ps
# supabase-db        running  0.0.0.0:5432
# supabase-rest      running  
# supabase-studio    running  0.0.0.0:8000
# ... etc
```

**Memory usage estimate:**
- Supabase (Docker): ~1.5-2GB
- Forum app (Next.js): ~200-400MB
- Auth server (Express): ~50MB
- Nginx: ~20MB
- System: ~800MB
- **Total: ~3-3.5GB of 8GB** — plenty of headroom

---

## Useful Commands

```bash
# View logs
pm2 logs auth-server
pm2 logs society-forum
docker compose -f /opt/supabase/docker/docker-compose.yml logs -f

# Restart services
pm2 restart auth-server
pm2 restart society-forum
docker compose -f /opt/supabase/docker/docker-compose.yml restart

# Update the app (after pushing new code)
cd /opt/society-forum
git pull
bun install
bun run build
pm2 restart society-forum

# Check resource usage
htop
docker stats
```
