import json
import logging

from django.conf import settings
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import WAConversation, WAMessage
from .serializers import WAConversationSerializer, WAConversationDetailSerializer
from .services import send_message

logger = logging.getLogger(__name__)


# ── Meta Webhook ──────────────────────────────────────────────────────────────

@csrf_exempt
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def webhook(request):
    if request.method == 'GET':
        return _verify_webhook(request)
    return _handle_webhook(request)


def _verify_webhook(request):
    mode = request.GET.get('hub.mode')
    token = request.GET.get('hub.verify_token')
    challenge = request.GET.get('hub.challenge')
    if mode == 'subscribe' and token == settings.WHATSAPP_VERIFY_TOKEN:
        return Response(int(challenge), status=200)
    return Response({'detail': 'Forbidden'}, status=403)


def _handle_webhook(request):
    """Process inbound events from Meta. Always return 200 to avoid retries."""
    try:
        data = request.data
        for entry in data.get('entry', []):
            for change in entry.get('changes', []):
                value = change.get('value', {})
                _process_messages(value)
                _process_statuses(value)
    except Exception:
        logger.exception("Error processing WhatsApp webhook payload")
    return Response({'status': 'ok'})


def _process_messages(value: dict):
    from .bot import process_inbound

    contacts = {c['wa_id']: c.get('profile', {}).get('name', '') for c in value.get('contacts', [])}
    for msg in value.get('messages', []):
        wa_id = msg.get('from', '')
        wa_msg_id = msg.get('id', '')
        ts = int(msg.get('timestamp', 0))
        msg_type = msg.get('type', 'text')
        body = ''

        if msg_type == 'text':
            body = msg.get('text', {}).get('body', '').strip()
        elif msg_type in ('image', 'audio', 'video', 'document'):
            caption = msg.get(msg_type, {}).get('caption', '')
            body = caption or f'[{msg_type}]'
        else:
            body = f'[{msg_type}]'
            msg_type = 'other'

        # Idempotency check
        if wa_msg_id and WAMessage.objects.filter(wa_message_id=wa_msg_id).exists():
            continue

        # Get or create conversation
        conv, created = WAConversation.objects.get_or_create(
            wa_id=wa_id,
            defaults={'display_name': contacts.get(wa_id, ''), 'status': WAConversation.STATUS_BOT},
        )
        if not created and not conv.display_name and contacts.get(wa_id):
            conv.display_name = contacts[wa_id]

        msg_ts = timezone.datetime.fromtimestamp(ts, tz=timezone.utc) if ts else timezone.now()

        # Save incoming message
        WAMessage.objects.create(
            conversation=conv,
            wa_message_id=wa_msg_id,
            direction=WAMessage.DIR_IN,
            message_type=msg_type,
            body=body,
            timestamp=msg_ts,
        )
        conv.last_message_at = msg_ts
        conv.unread_count = conv.unread_count + 1
        conv.save(update_fields=['display_name', 'last_message_at', 'unread_count'])

        # Let the bot process the message
        process_inbound(conv, body, msg_type)


def _process_statuses(value: dict):
    for st in value.get('statuses', []):
        wa_msg_id = st.get('id', '')
        new_status = st.get('status', '')
        if wa_msg_id and new_status in ('delivered', 'read', 'failed'):
            WAMessage.objects.filter(wa_message_id=wa_msg_id).update(status=new_status)


# ── CRM API ───────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conversation_list(request):
    qs = WAConversation.objects.select_related('client', 'assigned_to')
    status_filter = request.GET.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)
    serializer = WAConversationSerializer(qs[:100], many=True)
    return Response(serializer.data)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def conversation_detail(request, pk):
    try:
        conv = WAConversation.objects.select_related('client', 'assigned_to').prefetch_related('messages__sent_by').get(pk=pk)
    except WAConversation.DoesNotExist:
        return Response({'detail': 'Not found'}, status=404)

    if request.method == 'GET':
        # Clear unread count when agent opens the conversation
        if conv.unread_count:
            conv.unread_count = 0
            conv.save(update_fields=['unread_count'])
        return Response(WAConversationDetailSerializer(conv).data)

    # PATCH — update status or assigned_to
    allowed = {'status', 'assigned_to'}
    for field in allowed:
        if field in request.data:
            setattr(conv, field, request.data[field])
    conv.save()
    return Response(WAConversationSerializer(conv).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_manual_message(request, pk):
    try:
        conv = WAConversation.objects.get(pk=pk)
    except WAConversation.DoesNotExist:
        return Response({'detail': 'Not found'}, status=404)

    text = (request.data.get('message') or '').strip()
    if not text:
        return Response({'detail': 'Message cannot be empty'}, status=400)

    ok = send_message(conv.wa_id, text)
    WAMessage.objects.create(
        conversation=conv,
        direction=WAMessage.DIR_OUT,
        message_type=WAMessage.TYPE_TEXT,
        body=text,
        sent_by=request.user,
        status=WAMessage.STATUS_SENT if ok else WAMessage.STATUS_FAILED,
        timestamp=timezone.now(),
    )
    conv.last_message_at = timezone.now()
    if conv.status == conv.STATUS_BOT:
        conv.status = conv.STATUS_HUMAN
    conv.save(update_fields=['last_message_at', 'status'])

    return Response({'sent': ok})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def transfer_to_whatsapp(request, pk):
    """Mark conversation as transferred and return the wa.me deep link."""
    try:
        conv = WAConversation.objects.get(pk=pk)
    except WAConversation.DoesNotExist:
        return Response({'detail': 'Not found'}, status=404)

    conv.status = WAConversation.STATUS_TRANSFERRED
    conv.save(update_fields=['status'])

    # Construct wa.me link for the business's main WhatsApp number
    business_number = getattr(settings, 'WHATSAPP_BUSINESS_NUMBER', '')
    # Strip non-digit chars for wa.me
    digits = ''.join(filter(str.isdigit, business_number))
    name = conv.display_name or conv.wa_id
    link = f"https://wa.me/{digits}?text=Hi%2C+I+was+speaking+with+{name.replace(' ', '+')}+on+WhatsApp"
    return Response({'link': link, 'status': 'transferred'})
