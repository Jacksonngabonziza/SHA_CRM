#!/usr/bin/env bash
# =============================================================================
# SolarHope Africa CRM — Environment Setup Script
# Run once on a fresh server: bash setup.sh
# =============================================================================

set -e

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${BLUE}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*"; exit 1; }
ask()     { echo -e "${BOLD}$*${RESET}"; }

echo ""
echo -e "${BOLD}=================================================${RESET}"
echo -e "${BOLD}   SolarHope Africa CRM — Setup Script          ${RESET}"
echo -e "${BOLD}=================================================${RESET}"
echo ""

# ── Step 1: Check prerequisites ───────────────────────────────────────────────
info "Checking prerequisites..."

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    error "$1 is not installed. Please install it and re-run this script."
  fi
  success "$1 found"
}

check_cmd docker
check_cmd psql

# Docker Compose (plugin style)
if ! docker compose version &>/dev/null; then
  error "Docker Compose plugin not found. Install it with: sudo apt install docker-compose-plugin"
fi
success "docker compose found"

echo ""

# ── Step 2: Collect configuration ─────────────────────────────────────────────
info "Collecting configuration..."
echo ""

DOMAIN="crm.solarhopeafrica.com"
API_DOMAIN="$DOMAIN"
info "Domain: ${DOMAIN}"

ask "PostgreSQL database name [solarhope_db]:"
read -r DB_NAME
[ -z "$DB_NAME" ] && DB_NAME="solarhope_db"

ask "PostgreSQL user [postgres]:"
read -r DB_USER
[ -z "$DB_USER" ] && DB_USER="postgres"

ask "PostgreSQL password:"
read -rs DB_PASSWORD
echo ""

ask "PostgreSQL port [5432]:"
read -r DB_PORT
[ -z "$DB_PORT" ] && DB_PORT="5432"

ask "Gmail address for sending emails (leave blank to skip):"
read -r GMAIL_USER

GMAIL_APP_PASSWORD=""
if [ -n "$GMAIL_USER" ]; then
  ask "Gmail App Password:"
  read -rs GMAIL_APP_PASSWORD
  echo ""
fi

ask "WhatsApp business number [+250780348624]:"
read -r WA_NUMBER
[ -z "$WA_NUMBER" ] && WA_NUMBER="+250780348624"

ask "Low stock alert threshold [2]:"
read -r LOW_STOCK
[ -z "$LOW_STOCK" ] && LOW_STOCK="2"

echo ""

# ── Step 3: Generate SECRET_KEY ───────────────────────────────────────────────
info "Generating Django SECRET_KEY..."
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
success "SECRET_KEY generated"

echo ""

# ── Step 4: Write backend/.env ────────────────────────────────────────────────
info "Writing backend/.env..."

cat > backend/.env <<EOF
SECRET_KEY=${SECRET_KEY}
DEBUG=False
ALLOWED_HOSTS=${DOMAIN},www.${DOMAIN}

DATABASE_NAME=${DB_NAME}
DATABASE_USER=${DB_USER}
DATABASE_PASSWORD=${DB_PASSWORD}
DATABASE_HOST=host.docker.internal
DATABASE_PORT=${DB_PORT}

CORS_ALLOWED_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}
FRONTEND_URL=https://${DOMAIN}

GMAIL_USER=${GMAIL_USER}
GMAIL_APP_PASSWORD=${GMAIL_APP_PASSWORD}

WHATSAPP_BUSINESS_NUMBER=${WA_NUMBER}
LOW_STOCK_THRESHOLD=${LOW_STOCK}
EOF

success "backend/.env written"

# ── Step 5: Write frontend/.env.production ────────────────────────────────────
info "Writing frontend/.env.production..."

cat > frontend/.env.production <<EOF
NEXT_PUBLIC_API_URL=https://${DOMAIN}/api
API_HOSTNAME=${DOMAIN}
EOF

success "frontend/.env.production written"

# ── Step 6: Write root .env (for docker-compose variable substitution) ─────────
info "Writing .env for docker-compose..."

cat > .env <<EOF
NEXT_PUBLIC_API_URL=https://${DOMAIN}/api
API_HOSTNAME=${DOMAIN}
EOF

success ".env written"

echo ""

# ── Step 7: PostgreSQL setup ──────────────────────────────────────────────────
info "Setting up PostgreSQL..."

# Check if database exists
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'")

if [ "$DB_EXISTS" = "1" ]; then
  warn "Database '${DB_NAME}' already exists — skipping creation"
else
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME};" && success "Database '${DB_NAME}' created"
fi

# Create user if it doesn't exist (postgres user is usually already there)
if [ "$DB_USER" != "postgres" ]; then
  USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'")
  if [ "$USER_EXISTS" = "1" ]; then
    warn "User '${DB_USER}' already exists — skipping creation"
  else
    sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
    success "User '${DB_USER}' created and granted access"
  fi
else
  # Update postgres user password
  sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '${DB_PASSWORD}';"
  success "postgres user password updated"
fi

# Allow Docker bridge network in pg_hba.conf
PG_HBA=$(sudo -u postgres psql -tAc "SHOW hba_file")
info "pg_hba.conf: ${PG_HBA}"

if ! sudo grep -q "172.16.0.0/12" "$PG_HBA" 2>/dev/null; then
  echo "host    ${DB_NAME}    ${DB_USER}    172.16.0.0/12    md5" | sudo tee -a "$PG_HBA" > /dev/null
  success "Docker network added to pg_hba.conf"
else
  warn "Docker network rule already in pg_hba.conf — skipping"
fi

# Ensure PostgreSQL listens on all interfaces
PG_CONF=$(sudo -u postgres psql -tAc "SHOW config_file")
info "postgresql.conf: ${PG_CONF}"

if sudo grep -q "^listen_addresses = 'localhost'" "$PG_CONF" 2>/dev/null; then
  sudo sed -i "s/^listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONF"
  success "PostgreSQL configured to listen on all interfaces"
elif ! sudo grep -q "^listen_addresses" "$PG_CONF" 2>/dev/null; then
  echo "listen_addresses = '*'" | sudo tee -a "$PG_CONF" > /dev/null
  success "listen_addresses added to postgresql.conf"
else
  warn "listen_addresses already configured — skipping"
fi

info "Restarting PostgreSQL..."
sudo systemctl restart postgresql
success "PostgreSQL restarted"

echo ""

# ── Step 9: Build and start containers ───────────────────────────────────────
info "Building and starting Docker containers..."
docker compose up -d --build
success "Containers started"

echo ""

# ── Step 10: Wait for backend to be ready ─────────────────────────────────────
info "Waiting for backend to finish migrations..."
sleep 10

RETRIES=12
while [ $RETRIES -gt 0 ]; do
  if docker compose exec -T backend python manage.py showmigrations --plan 2>/dev/null | grep -q "\[X\]"; then
    success "Backend is ready"
    break
  fi
  info "Still waiting... ($RETRIES retries left)"
  sleep 5
  RETRIES=$((RETRIES - 1))
done

echo ""

# ── Step 11: Create superuser ─────────────────────────────────────────────────
ask "Create an admin account now? (y/n):"
read -r CREATE_SUPER

if [ "$CREATE_SUPER" = "y" ]; then
  docker compose exec backend python manage.py createsuperuser
fi

echo ""

# ── Done ──────────────────────────────────────────────────────────────────────
echo -e "${GREEN}${BOLD}=================================================${RESET}"
echo -e "${GREEN}${BOLD}   Setup complete!                               ${RESET}"
echo -e "${GREEN}${BOLD}=================================================${RESET}"
echo ""
echo -e "  App:      ${BOLD}https://${DOMAIN}${RESET}"
echo -e "  API:      ${BOLD}https://${DOMAIN}/api/${RESET}"
echo -e "  Admin:    ${BOLD}https://${DOMAIN}/admin/${RESET}"
echo ""
echo -e "  Useful commands:"
echo -e "    ${BOLD}docker compose logs -f${RESET}            — live logs"
echo -e "    ${BOLD}docker compose restart backend${RESET}    — restart API"
echo -e "    ${BOLD}docker compose down${RESET}               — stop everything"
echo ""
