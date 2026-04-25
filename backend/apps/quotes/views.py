from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.http import HttpResponse
from django.core.mail import EmailMessage
from django.conf import settings as django_settings
from apps.accounts.permissions import IsAdminOrOwner
from .models import Quote, ClientFeedback
from .serializers import (
    QuoteSerializer, QuoteListSerializer, QuoteCreateSerializer,
    CalculateRequestSerializer, ClientFeedbackSerializer,
)
from .engine import calculate_system
from .pdf_generator import generate_quote_pdf


def _decrement_stock(quote):
    """Decrement product stock when a quote is approved. Idempotent — safe to call multiple times."""
    from apps.products.models import Product
    from django.db.models import F

    if quote.panel_id and quote.num_panels > 0:
        Product.objects.filter(pk=quote.panel_id, stock_quantity__gt=0).update(
            stock_quantity=F('stock_quantity') - quote.num_panels
        )
    if quote.battery_id:
        # Derive qty from battery cost / unit price to avoid under/over-decrement
        try:
            battery = Product.objects.get(pk=quote.battery_id)
            qty = max(1, round(float(quote.battery_cost) / float(battery.price_rwf))) if battery.price_rwf else 1
            Product.objects.filter(pk=quote.battery_id, stock_quantity__gt=0).update(
                stock_quantity=F('stock_quantity') - qty
            )
        except Product.DoesNotExist:
            pass
    if quote.inverter_id:
        Product.objects.filter(pk=quote.inverter_id, stock_quantity__gt=0).update(
            stock_quantity=F('stock_quantity') - 1
        )
    if quote.generator_id:
        Product.objects.filter(pk=quote.generator_id, stock_quantity__gt=0).update(
            stock_quantity=F('stock_quantity') - 1
        )


def _auto_expire(quote):
    """Silently expire a quote if its validity date has passed."""
    from django.utils import timezone
    if quote.status in ('draft', 'sent') and quote.valid_until and quote.valid_until < timezone.now().date():
        quote.status = 'expired'
        quote.save(update_fields=['status'])


class QuoteListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields   = ['status', 'client', 'created_by']
    search_fields      = ['ref_number', 'client__name', 'client__phone']
    ordering_fields    = ['created_at', 'total_price_rwf']
    ordering           = ['-created_at']

    def get_queryset(self):
        qs = Quote.objects.select_related(
            'client', 'panel', 'battery', 'inverter', 'generator', 'created_by'
        ).prefetch_related('appliances', 'feedback', 'versions').all()
        # Sales only sees own quotes
        if self.request.user.role == 'sales':
            qs = qs.filter(created_by=self.request.user)
        return qs

    def list(self, request, *args, **kwargs):
        """Lazily expire any overdue quotes before returning the list."""
        from django.utils import timezone
        Quote.objects.filter(
            status__in=['draft', 'sent'],
            valid_until__lt=timezone.now().date(),
        ).update(status='expired')
        return super().list(request, *args, **kwargs)

    def get_serializer_class(self):
        return QuoteCreateSerializer if self.request.method == 'POST' else QuoteListSerializer


class QuoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminOrOwner]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return QuoteCreateSerializer
        return QuoteSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        # Return full QuoteSerializer response so frontend gets all display fields
        return Response(QuoteSerializer(instance, context={'request': request}).data)

    def get_queryset(self):
        qs = Quote.objects.select_related(
            'client', 'panel', 'battery', 'inverter', 'generator', 'created_by'
        ).prefetch_related('appliances', 'feedback', 'versions').all()
        if self.request.user.role == 'sales':
            qs = qs.filter(created_by=self.request.user)
        return qs

    def retrieve(self, request, *args, **kwargs):
        """Lazy expiry: auto-expire overdue quotes on first view."""
        instance = self.get_object()
        _auto_expire(instance)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            return Response({'detail': 'Only admins can delete quotes.'}, status=403)
        return super().destroy(request, *args, **kwargs)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calculate_quote(request):
    """Smart engine — calculate without saving."""
    serializer = CalculateRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    d = serializer.validated_data
    result = calculate_system(
        appliances_data=d['appliances'],
        backup_hours=d.get('backup_hours', 8.0),
        peak_sun_hours=d.get('peak_sun_hours', 5.5),
        panel_id=d.get('panel_id'),
        battery_id=d.get('battery_id'),
        inverter_id=d.get('inverter_id'),
        generator_id=d.get('generator_id'),
    )
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def quote_pdf(request, pk):
    try:
        qs = Quote.objects.select_related('client', 'panel', 'battery', 'inverter', 'generator', 'created_by').prefetch_related('appliances')
        if request.user.role == 'sales':
            qs = qs.filter(created_by=request.user)
        quote = qs.get(pk=pk)
    except Quote.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    buf = generate_quote_pdf(quote)
    response = HttpResponse(buf, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="Quote-{quote.ref_number}.pdf"'
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def email_quote(request, pk):
    """Send quote PDF to client email via Gmail SMTP."""
    try:
        qs = Quote.objects.select_related('client', 'panel', 'battery', 'inverter', 'generator').prefetch_related('appliances')
        if request.user.role == 'sales':
            qs = qs.filter(created_by=request.user)
        quote = qs.get(pk=pk)
    except Quote.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    client = quote.client
    recipient = request.data.get('email') or client.email
    if not recipient:
        return Response({'detail': 'No email address for this client.'}, status=400)

    try:
        pdf_buf = generate_quote_pdf(quote)
        share_url = f"{django_settings.FRONTEND_URL}/quote/{quote.share_token}"

        from apps.accounts.models import CompanySettings
        cfg = CompanySettings.get()

        body = f"""Dear {client.name},

Please find attached your solar system quotation from {cfg.company_name}.

Quote Reference: {quote.ref_number}
System Size: {quote.system_size_kwp} kWp
Total Investment: RWF {quote.total_price_rwf:,.0f}
Valid Until: {quote.valid_until.strftime('%d %B %Y') if quote.valid_until else 'N/A'}

You can also view your quote online and leave feedback here:
{share_url}

For any questions, please contact us:
📞 {cfg.company_phone}
📧 {cfg.company_email}

{cfg.company_tagline}
{cfg.company_name}
"""

        email = EmailMessage(
            subject=f"Your Solar Quotation — {quote.ref_number} | {cfg.company_name}",
            body=body,
            from_email=f"{cfg.company_name} <{django_settings.EMAIL_HOST_USER}>",
            to=[recipient],
            reply_to=[django_settings.EMAIL_HOST_USER],
        )
        email.attach(f"Quote-{quote.ref_number}.pdf", pdf_buf.read(), 'application/pdf')
        email.send(fail_silently=False)

        # Update quote status
        if quote.status == 'draft':
            quote.status = 'sent'
            quote.save()

        return Response({'detail': f'Quote emailed to {recipient}'})

    except Exception as e:
        return Response({'detail': f'Email failed: {str(e)}'}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def whatsapp_share(request, pk):
    """Generate WhatsApp share URL with quote summary."""
    try:
        qs = Quote.objects.select_related('client').all()
        if request.user.role == 'sales':
            qs = qs.filter(created_by=request.user)
        quote = qs.get(pk=pk)
    except Quote.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    share_url = f"{django_settings.FRONTEND_URL}/quote/{quote.share_token}"
    client = quote.client

    from apps.accounts.models import CompanySettings
    cfg = CompanySettings.get()

    message = (
        f"Hello {client.name}! 🌞\n\n"
        f"Your solar system quotation from *{cfg.company_name}* is ready.\n\n"
        f"📋 *Quote:* {quote.ref_number}\n"
        f"⚡ *System:* {quote.system_size_kwp} kWp solar system\n"
        f"💰 *Investment:* RWF {quote.total_price_rwf:,.0f}\n"
        f"📅 *Valid until:* {quote.valid_until.strftime('%d %B %Y') if quote.valid_until else 'N/A'}\n\n"
        f"View full quote & give feedback:\n{share_url}\n\n"
        f"_{cfg.company_tagline}_ 🌍"
    )

    import urllib.parse
    phone = client.phone.replace('+', '').replace(' ', '').replace('-', '')
    wa_url = f"https://wa.me/{phone}?text={urllib.parse.quote(message)}"

    # Update status
    if quote.status == 'draft':
        quote.status = 'sent'
        quote.save()

    return Response({'whatsapp_url': wa_url, 'message': message, 'phone': phone})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_quote_version(request, pk):
    """Create a new version of an existing quote."""
    try:
        original = Quote.objects.prefetch_related('appliances').get(pk=pk)
    except Quote.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    from .models import Appliance
    import uuid

    # Clone the quote
    original.pk        = None
    original.ref_number = f"{original.ref_number.split('-v')[0]}-v{uuid.uuid4().hex[:3].upper()}"
    original.share_token = uuid.uuid4()
    original.status    = 'draft'
    original.parent_quote_id = pk
    original.save()

    # Clone appliances
    for a in Quote.objects.get(pk=pk).appliances.all():
        a.pk    = None
        a.quote = original
        a.save()

    return Response(QuoteSerializer(original, context={'request': request}).data, status=201)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_quote_status(request, pk):
    try:
        qs = Quote.objects.all()
        if request.user.role == 'sales':
            qs = qs.filter(created_by=request.user)
        quote = qs.get(pk=pk)
    except Quote.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    new_status = request.data.get('status')
    if new_status not in dict(Quote.STATUS_CHOICES):
        return Response({'detail': 'Invalid status.'}, status=400)

    old_status = quote.status
    quote.status = new_status
    quote.save()

    if new_status == 'approved' and old_status != 'approved':
        _decrement_stock(quote)

    return Response(QuoteSerializer(quote, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def shared_quote(request, token):
    try:
        quote = Quote.objects.select_related(
            'client', 'panel', 'battery', 'inverter', 'generator'
        ).prefetch_related('appliances', 'feedback').get(share_token=token)
    except Quote.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)
    return Response(QuoteSerializer(quote, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def submit_feedback(request, token):
    try:
        quote = Quote.objects.select_related('client', 'created_by').get(share_token=token)
    except Quote.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    # Don't accept feedback on quotes that are already closed or expired
    if quote.status in ('approved', 'rejected', 'expired'):
        return Response(
            {'detail': 'This quote is no longer accepting feedback.'},
            status=400,
        )

    serializer = ClientFeedbackSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    feedback = serializer.save(quote=quote)

    # Update quote and client status based on feedback
    client = quote.client
    if feedback.status == ClientFeedback.STATUS_APPROVED:
        quote.status = Quote.STATUS_APPROVED
        _decrement_stock(quote)
        if client.status not in ('won',):
            client.status = 'won'
            client.save()
    elif feedback.status == ClientFeedback.STATUS_REJECTED:
        quote.status = Quote.STATUS_REJECTED
        if client.status not in ('won', 'lost'):
            client.status = 'lost'
            client.save()
    quote.save()

    # Notify the sales rep who owns this quote
    _notify_rep_of_feedback(quote, feedback)

    return Response(serializer.data, status=201)


def _notify_rep_of_feedback(quote, feedback):
    """Send an email to the sales rep when a client responds to their quote."""
    from django.core.mail import send_mail
    from apps.accounts.models import CompanySettings

    rep = quote.created_by
    if not rep or not rep.email:
        return

    cfg = CompanySettings.get()
    action = 'APPROVED' if feedback.status == 'approved' else 'REJECTED' if feedback.status == 'rejected' else 'commented on'
    subject = f'[{cfg.company_name}] Client {action} Quote {quote.ref_number}'

    body = (
        f'Hi {rep.get_full_name() or rep.username},\n\n'
        f'{quote.client.name} has responded to quote {quote.ref_number}.\n\n'
        f'Decision: {feedback.status.upper()}\n'
        f'Message: {feedback.message or "(no message)"}\n\n'
        f'Quote: {quote.ref_number}\n'
        f'System: {quote.system_size_kwp} kWp\n'
        f'Value: RWF {quote.total_price_rwf:,.0f}\n\n'
    )

    if feedback.status == 'approved':
        body += 'The quote status has been updated to Approved and the client marked as Won.\nYou can now create an installation job from the quote page.\n\n'
    elif feedback.status == 'rejected':
        body += 'The quote status has been updated to Rejected.\nConsider following up to understand objections or create a revised version.\n\n'

    body += f'{cfg.company_tagline}\n{cfg.company_name}'

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=cfg.company_email,
            recipient_list=[rep.email],
            fail_silently=True,
        )
    except Exception:
        pass  # Never let notification failure break the feedback submission


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_quotes_csv(request):
    import csv
    from django.http import HttpResponse

    qs = Quote.objects.select_related(
        'client', 'panel', 'battery', 'inverter', 'generator', 'created_by'
    ).order_by('-created_at')
    if request.user.role == 'sales':
        qs = qs.filter(created_by=request.user)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="quotes.csv"'

    writer = csv.writer(response)
    writer.writerow([
        'Ref', 'Client', 'Phone', 'Status', 'System Size (kWp)',
        'Panels', 'Panel Model', 'Battery Model', 'Inverter Model', 'Generator Model',
        'Total (RWF)', 'Annual Savings (RWF)', 'Payback (yrs)',
        'Valid Until', 'Created By', 'Created At',
    ])
    for q in qs:
        writer.writerow([
            q.ref_number,
            q.client.name if q.client else '',
            q.client.phone if q.client else '',
            q.get_status_display(),
            q.system_size_kwp,
            q.num_panels,
            f'{q.panel.brand} {q.panel.model}' if q.panel else '',
            f'{q.battery.brand} {q.battery.model}' if q.battery else '',
            f'{q.inverter.brand} {q.inverter.model}' if q.inverter else '',
            f'{q.generator.brand} {q.generator.model}' if q.generator else '',
            float(q.total_price_rwf),
            float(q.annual_savings_rwf),
            float(q.payback_years),
            q.valid_until or '',
            q.created_by.get_full_name() if q.created_by else '',
            q.created_at.strftime('%Y-%m-%d'),
        ])
    return response
