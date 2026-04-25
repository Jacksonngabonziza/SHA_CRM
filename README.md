# SolarHope Africa CRM

A full-stack CRM and quotation system for SolarHope Africa — managing clients, quotes, installations, payments, field agents, and commissions.

**Stack:** Next.js 14 (App Router) · Django 5 · PostgreSQL · Docker · Nginx

---

## Quick Setup (New Server)

Clone the repo, then run the setup script — it handles everything automatically:

```bash
git clone https://github.com/your-org/SHA-CRM.git
cd SHA-CRM
bash setup.sh
```

The script will:
- Prompt you for your domain, database credentials, and email config
- Generate a secure `SECRET_KEY`
- Write all `.env` files
- Configure PostgreSQL on the host machine
- Obtain an SSL certificate via Let's Encrypt
- Build and start all Docker containers
- Offer to create the first admin account

---

## Project Structure

```
SHA-CRM/
├── backend/          # Django REST API
├── frontend/         # Next.js application
├── nginx.conf        # Nginx reverse proxy config
├── docker-compose.yml
└── ssl/              # SSL certificates (not committed)
```

---

## Local Development

### Prerequisites
- Python 3.12+
- Node.js 20+
- PostgreSQL 15+

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env — set DATABASE_* and SECRET_KEY at minimum

# Run migrations
python manage.py migrate

# Create a superuser (admin account)
python manage.py createsuperuser

# Start development server
python manage.py runserver
# API available at http://localhost:8000/api/
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local — set NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Start development server
npm run dev
# App available at http://localhost:3000
```

---

## Production Deployment (Docker + Nginx)

### Prerequisites on the server
- Ubuntu 22.04+ (or any Linux with Docker support)
- Docker Engine + Docker Compose plugin installed
- A domain name pointed to your server's IP
- SSL certificate (Let's Encrypt recommended — see below)

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/your-org/SHA-CRM.git
cd SHA-CRM
```

---

### Step 2 — Create environment files

**Backend:**
```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Fill in every value:

| Variable | Description |
|---|---|
| `SECRET_KEY` | Generate with the command below |
| `DEBUG` | Must be `False` in production |
| `ALLOWED_HOSTS` | Your domain, e.g. `api.yourdomain.com` |
| `DATABASE_NAME` | e.g. `solarhope_db` |
| `DATABASE_USER` | e.g. `postgres` |
| `DATABASE_PASSWORD` | A strong password |
| `DATABASE_HOST` | `db` (the Docker service name) |
| `CORS_ALLOWED_ORIGINS` | `https://yourdomain.com` |
| `FRONTEND_URL` | `https://yourdomain.com` |
| `GMAIL_USER` | Gmail address for sending emails |
| `GMAIL_APP_PASSWORD` | Gmail App Password (not your login password) |
| `WHATSAPP_BUSINESS_NUMBER` | Your WhatsApp business number |

Generate a secure `SECRET_KEY`:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

**Frontend:**
```bash
cp frontend/.env.example frontend/.env.production
nano frontend/.env.production
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://yourdomain.com/api` |
| `API_HOSTNAME` | `yourdomain.com` (used for Next.js image optimization) |

---

### Step 3 — Add SSL certificates

Create the `ssl/` directory and place your certificates there:

```bash
mkdir ssl
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem   ssl/
```

**Get a free certificate with Let's Encrypt (first time):**
```bash
# Install certbot
sudo apt install certbot

# Obtain certificate (stop any service using port 80 first)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates will be at /etc/letsencrypt/live/yourdomain.com/
```

---

### Step 4 — Update nginx.conf

Open `nginx.conf` and replace every occurrence of `yourdomain.com` with your actual domain:

```bash
sed -i 's/yourdomain.com/your-actual-domain.com/g' nginx.conf
```

---

### Step 5 — Build and start all services

```bash
docker compose up -d --build
```

This starts four containers:
- `db` — PostgreSQL database
- `backend` — Django + Gunicorn (runs migrations automatically on first start)
- `frontend` — Next.js standalone server
- `nginx` — Reverse proxy handling SSL, routing, and media files

Check that everything is running:
```bash
docker compose ps
docker compose logs -f        # stream all logs
docker compose logs backend   # backend logs only
```

---

### Step 6 — Create the admin account

```bash
docker compose exec backend python manage.py createsuperuser
```

---

### Step 7 — Verify the deployment

| URL | Expected |
|---|---|
| `https://yourdomain.com` | Next.js login page |
| `https://yourdomain.com/api/` | Django REST API root |
| `https://yourdomain.com/admin/` | Django admin panel |

---

## Updating the Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker compose up -d --build

# Run any new migrations (if needed separately)
docker compose exec backend python manage.py migrate
```

---

## Useful Commands

```bash
# View live logs
docker compose logs -f

# Restart a single service
docker compose restart backend

# Open a Django shell
docker compose exec backend python manage.py shell

# Backup the database
docker compose exec db pg_dump -U postgres solarhope_db > backup_$(date +%Y%m%d).sql

# Restore a backup
docker compose exec -T db psql -U postgres solarhope_db < backup_20250101.sql
```

---

## SSL Certificate Renewal

Let's Encrypt certificates expire every 90 days. Renew with:

```bash
sudo certbot renew
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem   ssl/
docker compose restart nginx
```

Add this to a cron job to automate it:
```bash
sudo crontab -e
# Add this line (runs renewal check every Monday at 3am):
0 3 * * 1 certbot renew --quiet && cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /path/to/SHA-CRM/ssl/ && cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /path/to/SHA-CRM/ssl/ && docker compose -f /path/to/SHA-CRM/docker-compose.yml restart nginx
```

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `SECRET_KEY` | ✅ | — | Django secret key |
| `DEBUG` | ✅ | `False` | Set to `True` for local dev only |
| `ALLOWED_HOSTS` | ✅ | `localhost` | Comma-separated hostnames |
| `DATABASE_NAME` | ✅ | `solarhope_db` | PostgreSQL database name |
| `DATABASE_USER` | ✅ | `postgres` | PostgreSQL user |
| `DATABASE_PASSWORD` | ✅ | — | PostgreSQL password |
| `DATABASE_HOST` | ✅ | `db` | Use `db` in Docker, `localhost` otherwise |
| `DATABASE_PORT` | | `5432` | PostgreSQL port |
| `CORS_ALLOWED_ORIGINS` | ✅ | — | Comma-separated frontend origins |
| `FRONTEND_URL` | ✅ | — | Base URL of the frontend |
| `GMAIL_USER` | | — | Gmail address for outgoing email |
| `GMAIL_APP_PASSWORD` | | — | Gmail App Password |
| `WHATSAPP_BUSINESS_NUMBER` | | `+250780348624` | WhatsApp sender number |
| `LOW_STOCK_THRESHOLD` | | `2` | Stock alert threshold |

### Frontend (`frontend/.env.production`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Full URL to the Django API including `/api` |
| `API_HOSTNAME` | ✅ | API server hostname for Next.js image optimization |
