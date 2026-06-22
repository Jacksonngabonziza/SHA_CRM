from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta

from apps.clients.models import Client
from apps.quotes.models import Quote
from apps.products.models import Product
from apps.clients.serializers import ClientListSerializer
from apps.quotes.serializers import QuoteListSerializer, QuoteSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    user      = request.user
    is_admin  = user.role == 'admin'
    today     = timezone.now().date()
    m_start   = today.replace(day=1)
    lm_start  = (m_start - timedelta(days=1)).replace(day=1)

    # ── Base querysets filtered by role ───────────────────────────────────────
    client_qs = Client.objects.all() if is_admin else Client.objects.filter(created_by=user)
    _all_qs   = Quote.objects.all()  if is_admin else Quote.objects.filter(created_by=user)
    quote_qs  = _all_qs.filter(quote_type=Quote.TYPE_INSTALLATION)
    order_qs  = _all_qs.filter(quote_type=Quote.TYPE_PRODUCT_ORDER)

    # ── Client stats ──────────────────────────────────────────────────────────
    total_clients     = client_qs.count()
    new_this_month    = client_qs.filter(created_at__date__gte=m_start).count()
    new_last_month    = client_qs.filter(created_at__date__gte=lm_start, created_at__date__lt=m_start).count()
    clients_by_status = {s: client_qs.filter(status=s).count() for s, _ in Client.STATUS_CHOICES}

    # ── Quote stats ───────────────────────────────────────────────────────────
    total_quotes      = quote_qs.count()
    quotes_this_month = quote_qs.filter(created_at__date__gte=m_start).count()
    won_quotes        = quote_qs.filter(status='approved').count()
    conversion_rate   = round(won_quotes / total_quotes * 100, 1) if total_quotes else 0
    quotes_by_status  = {s: quote_qs.filter(status=s).count() for s, _ in Quote.STATUS_CHOICES}

    # ── Revenue — admin only ──────────────────────────────────────────────────
    revenue = {}
    if is_admin:
        total_rev  = quote_qs.filter(status='approved').aggregate(t=Sum('total_price_rwf'))['t'] or 0
        rev_month  = quote_qs.filter(status='approved', created_at__date__gte=m_start).aggregate(t=Sum('total_price_rwf'))['t'] or 0
        rev_lmonth = quote_qs.filter(status='approved', created_at__date__gte=lm_start, created_at__date__lt=m_start).aggregate(t=Sum('total_price_rwf'))['t'] or 0
        revenue = {'total': float(total_rev), 'this_month': float(rev_month), 'last_month': float(rev_lmonth)}

    # ── Follow-ups ────────────────────────────────────────────────────────────
    followup_qs    = client_qs.filter(followup_date__lte=today, status='followup')
    overdue_qs     = followup_qs.filter(followup_date__lt=today)
    followups_today = followup_qs.filter(followup_date=today)

    # ── Products (admin only) ─────────────────────────────────────────────────
    product_stats = {}
    if is_admin:
        from django.conf import settings
        threshold = getattr(settings, 'LOW_STOCK_THRESHOLD', 2)
        product_stats = {
            'total': Product.objects.filter(is_active=True).count(),
            'out_of_stock': Product.objects.filter(is_active=True, in_stock=False).count(),
            'low_stock': Product.objects.filter(is_active=True, in_stock=True, stock_quantity__lte=threshold).count(),
        }

    # ── Monthly chart (last 6 months) ─────────────────────────────────────────
    monthly = []
    for i in range(5, -1, -1):
        ms = (today.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        me = (ms.replace(day=28) + timedelta(days=4)).replace(day=1) if i else today
        row = {
            'month': ms.strftime('%b %Y'),
            'quotes': quote_qs.filter(created_at__date__gte=ms, created_at__date__lt=me).count(),
        }
        if is_admin:
            row['revenue'] = float(
                quote_qs.filter(status='approved', created_at__date__gte=ms, created_at__date__lt=me)
                .aggregate(t=Sum('total_price_rwf'))['t'] or 0
            )
        monthly.append(row)

    # ── Top performers (admin only) ───────────────────────────────────────────
    top_performers = []
    if is_admin:
        from apps.accounts.models import User
        from apps.accounts.serializers import UserSerializer
        performers = (
            Quote.objects.filter(status='approved', quote_type=Quote.TYPE_INSTALLATION)
            .values('created_by__id', 'created_by__first_name', 'created_by__last_name', 'created_by__username')
            .annotate(won=Count('id'), revenue=Sum('total_price_rwf'))
            .order_by('-revenue')[:5]
        )
        top_performers = list(performers)

    # ── Alerts ───────────────────────────────────────────────────────────────────
    expiring_soon = Quote.objects.filter(
        quote_type=Quote.TYPE_INSTALLATION,
        status__in=('draft', 'sent'),
        valid_until__gte=today,
        valid_until__lte=today + timedelta(days=7),
    ).select_related('client')[:10]

    return Response({
        'is_admin': is_admin,
        'clients': {
            'total': total_clients,
            'new_this_month': new_this_month,
            'new_last_month': new_last_month,
            'by_status': clients_by_status,
        },
        'quotes': {
            'total': total_quotes,
            'this_month': quotes_this_month,
            'won': won_quotes,
            'conversion_rate': conversion_rate,
            'by_status': quotes_by_status,
        },
        'revenue': revenue,
        'followups': {
            'overdue': followup_qs.count(),
            'overdue_count': overdue_qs.count(),
            'today_count': followups_today.count(),
            'due': ClientListSerializer(
                followup_qs.order_by('followup_date').select_related('assigned_to')[:10],
                many=True,
            ).data,
        },
        'products': product_stats,
        'recent_quotes': QuoteListSerializer(quote_qs.order_by('-created_at')[:5], many=True).data,
        'recent_clients': ClientListSerializer(client_qs.order_by('-created_at')[:5], many=True).data,
        'alerts': {
            'expiring_quotes': QuoteListSerializer(expiring_soon, many=True).data,
            'expiring_count': expiring_soon.count(),
        },
        'orders': {
            'total': order_qs.count(),
            'this_month': order_qs.filter(created_at__date__gte=m_start).count(),
            'won': order_qs.filter(status='approved').count(),
        },
        'monthly_data': monthly,
        'top_performers': top_performers,
    })
