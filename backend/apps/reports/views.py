
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from datetime import timedelta
from apps.accounts.permissions import IsAuthenticatedAdmin
from apps.clients.models import Client
from apps.quotes.models import Quote
from apps.payments.models import Payment
from apps.installations.models import Installation


@api_view(["GET"])
@permission_classes([IsAuthenticatedAdmin])
def monthly_report(request):
    """Full monthly performance report — admin only."""
    year  = int(request.query_params.get("year",  timezone.now().year))
    month = int(request.query_params.get("month", timezone.now().month))

    from django.utils.timezone import make_aware
    from datetime import datetime
    m_start = make_aware(datetime(year, month, 1))
    if month == 12:
        m_end = make_aware(datetime(year+1, 1, 1))
    else:
        m_end = make_aware(datetime(year, month+1, 1))

    clients_qs     = Client.objects.filter(created_at__gte=m_start, created_at__lt=m_end)
    quotes_qs      = Quote.objects.filter(created_at__gte=m_start,  created_at__lt=m_end)
    payments_qs    = Payment.objects.filter(payment_date__gte=m_start.date(), payment_date__lt=m_end.date(), status="confirmed")
    installs_qs    = Installation.objects.filter(completed_at__gte=m_start, completed_at__lt=m_end)

    # Per-salesperson breakdown
    from apps.accounts.models import User
    sales_breakdown = []
    for user in User.objects.filter(role__in=["admin","sales"], is_active=True):
        uq  = quotes_qs.filter(created_by=user)
        won = uq.filter(status="approved")
        sales_breakdown.append({
            "name": user.get_full_name() or user.username,
            "role": user.role,
            "new_clients": clients_qs.filter(created_by=user).count(),
            "quotes_sent": uq.count(),
            "quotes_won":  won.count(),
            "revenue":     float(won.aggregate(t=Sum("total_price_rwf"))["t"] or 0),
        })

    return Response({
        "period": f"{year}-{month:02d}",
        "summary": {
            "new_clients":    clients_qs.count(),
            "quotes_created": quotes_qs.count(),
            "quotes_won":     quotes_qs.filter(status="approved").count(),
            "revenue_collected": float(payments_qs.aggregate(t=Sum("amount_rwf"))["t"] or 0),
            "installations_completed": installs_qs.count(),
            "avg_system_size": float(quotes_qs.filter(status="approved").aggregate(a=Avg("system_size_kwp"))["a"] or 0),
        },
        "by_client_type": list(
            clients_qs.values("client_type").annotate(count=Count("id")).order_by("-count")
        ),
        "top_packages": list(
            Quote.objects.filter(created_at__gte=m_start, created_at__lt=m_end, status="approved")
            .values("system_size_kwp").annotate(count=Count("id")).order_by("-count")[:5]
        ),
        "sales_breakdown": sales_breakdown,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticatedAdmin])
def revenue_report(request):
    """12-month rolling revenue report."""
    today = timezone.now().date()
    rows  = []
    for i in range(11, -1, -1):
        ms = (today.replace(day=1) - timedelta(days=i*30)).replace(day=1)
        me = (ms.replace(day=28) + timedelta(days=4)).replace(day=1) if i else today
        won = Quote.objects.filter(status="approved", created_at__date__gte=ms, created_at__date__lt=me)
        paid = Payment.objects.filter(status="confirmed", payment_date__gte=ms, payment_date__lt=me)
        rows.append({
            "month":    ms.strftime("%b %Y"),
            "won":      won.count(),
            "revenue_quoted":   float(won.aggregate(t=Sum("total_price_rwf"))["t"] or 0),
            "revenue_collected":float(paid.aggregate(t=Sum("amount_rwf"))["t"] or 0),
        })
    return Response({"months": rows})
