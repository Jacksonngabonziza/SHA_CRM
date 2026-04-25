#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# SHA-CRM Cron Job Setup
# Run this once on your server to register all scheduled tasks.
# Usage: bash scripts/setup_cron.sh
# ─────────────────────────────────────────────────────────────────────────────

PYTHON=$(which python)
MANAGE="$PYTHON /path/to/SHA-CRM/backend/manage.py"

# Update this to your actual virtualenv python path, e.g.:
# PYTHON=/home/ubuntu/SHA-CRM/venv/bin/python

# ── Cron entries ──────────────────────────────────────────────────────────────
EXPIRE_JOB="0 2 * * * $MANAGE expire_quotes --notify >> /var/log/sha-crm-expire.log 2>&1"
# Runs at 02:00 every night — expires overdue quotes and notifies reps.

FOLLOWUP_JOB="0 7 * * * $MANAGE send_followup_reminders >> /var/log/sha-crm-followup.log 2>&1"
# Runs at 07:00 every morning — emails each rep their due/overdue follow-ups.

# ── Install ───────────────────────────────────────────────────────────────────
(
  crontab -l 2>/dev/null \
    | grep -v "expire_quotes" \
    | grep -v "send_followup_reminders"
  echo "$EXPIRE_JOB"
  echo "$FOLLOWUP_JOB"
) | crontab -

echo "Cron jobs installed:"
crontab -l | grep "expire_quotes\|send_followup_reminders"
