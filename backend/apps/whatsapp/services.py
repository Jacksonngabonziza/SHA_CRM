"""
Low-level WhatsApp Cloud API helpers: send messages, verify webhook signatures,
and auto-create CRM clients from completed bot conversations.
"""
import hashlib
import hmac
import logging

import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

_WA_API = 'https://graph.facebook.com/v19.0'


def send_message(to_wa_id: str, text: str) -> bool:
    """Send a plain-text WhatsApp message via the Meta Cloud API."""
    url = f"{_WA_API}/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": to_wa_id,
        "type": "text",
        "text": {"body": text, "preview_url": False},
    }
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        resp.raise_for_status()
        return True
    except Exception:
        logger.exception("Failed to send WhatsApp message to %s", to_wa_id)
        return False


def send_bot_message(conv, text: str) -> None:
    """Send a message, save it to the DB, and update conversation timestamp."""
    from apps.whatsapp.models import WAMessage

    ok = send_message(conv.wa_id, text)
    WAMessage.objects.create(
        conversation=conv,
        direction=WAMessage.DIR_OUT,
        message_type=WAMessage.TYPE_TEXT,
        body=text,
        status=WAMessage.STATUS_SENT if ok else WAMessage.STATUS_FAILED,
        timestamp=timezone.now(),
    )
    conv.last_message_at = timezone.now()


def verify_signature(payload: bytes, signature_header: str) -> bool:
    """Validate the X-Hub-Signature-256 header from Meta."""
    if not signature_header or not signature_header.startswith('sha256='):
        return False
    expected = hmac.new(
        settings.WHATSAPP_APP_SECRET.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header[7:])


def create_client_from_conv(conv) -> None:
    """Create (or link) a CRM Client from a completed bot conversation."""
    from apps.clients.models import Client

    data = conv.bot_data
    place_type = data.get('place_type', 'home')
    power = data.get('power_situation', 'has_power')

    client_type = (
        Client.TYPE_BUSINESS if place_type == 'business' else Client.TYPE_RESIDENTIAL
    )
    is_offgrid = power == 'no_power'

    bill = data.get('bill_rwf')
    daily_kwh = data.get('estimated_daily_kwh')
    monthly_kwh = round(daily_kwh * 30, 2) if daily_kwh else None

    phone = f"+{conv.wa_id}" if not conv.wa_id.startswith('+') else conv.wa_id
    name = data.get('name') or conv.display_name or phone

    # Avoid duplicates — match by phone number
    client, created = Client.objects.get_or_create(
        phone=phone,
        defaults=dict(
            name=name,
            location=data.get('location', ''),
            client_type=client_type,
            is_offgrid=is_offgrid,
            monthly_bill_rwf=bill,
            monthly_kwh=monthly_kwh,
            status=Client.STATUS_NEW,
            source='WhatsApp Bot',
            notes=_build_notes(data),
        ),
    )
    if not created:
        # Update notes with fresh bot data even for existing clients
        client.notes = (client.notes + '\n\n' + _build_notes(data)).strip()
        client.save()

    conv.client = client


def _build_notes(data: dict) -> str:
    lines = ["[WhatsApp Lead — auto-qualified by SHA bot]"]
    if data.get('location'):
        lines.append(f"Location: {data['location']}")
    if data.get('place_type'):
        lines.append(f"Place type: {data['place_type']}")
    if data.get('power_situation'):
        lines.append(f"Power situation: {data['power_situation']}")
    if data.get('solar_goal'):
        lines.append(f"Solar goal: {data['solar_goal']}")
    if data.get('usage'):
        lines.append(f"Usage preference: {data['usage']}")
    if data.get('bill_rwf'):
        lines.append(f"Monthly bill: {data['bill_rwf']:,} RWF")
    if data.get('estimated_daily_kwh'):
        lines.append(f"Estimated daily load: {data['estimated_daily_kwh']} kWh")
    if data.get('budget'):
        lines.append(f"Budget range: {data['budget']}")
    return '\n'.join(lines)
