
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from django.http import HttpResponse
from datetime import timedelta, date as date_type
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
    quotes_qs      = Quote.objects.filter(quote_type=Quote.TYPE_INSTALLATION, created_at__gte=m_start, created_at__lt=m_end)
    orders_qs      = Quote.objects.filter(quote_type=Quote.TYPE_PRODUCT_ORDER, created_at__gte=m_start, created_at__lt=m_end)
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
            "new_clients":          clients_qs.count(),
            "quotes_created":       quotes_qs.count(),
            "quotes_won":           quotes_qs.filter(status="approved").count(),
            "orders_created":       orders_qs.count(),
            "orders_won":           orders_qs.filter(status="approved").count(),
            "revenue_collected":    float(payments_qs.aggregate(t=Sum("amount_rwf"))["t"] or 0),
            "installations_completed": installs_qs.count(),
            "avg_system_size":      float(quotes_qs.filter(status="approved").aggregate(a=Avg("system_size_kwp"))["a"] or 0),
        },
        "by_client_type": list(
            clients_qs.values("client_type").annotate(count=Count("id")).order_by("-count")
        ),
        "top_packages": list(
            Quote.objects.filter(quote_type=Quote.TYPE_INSTALLATION, created_at__gte=m_start, created_at__lt=m_end, status="approved")
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
        won_quotes = Quote.objects.filter(
            quote_type=Quote.TYPE_INSTALLATION, status="approved",
            created_at__date__gte=ms, created_at__date__lt=me,
        )
        won_orders = Quote.objects.filter(
            quote_type=Quote.TYPE_PRODUCT_ORDER, status="approved",
            created_at__date__gte=ms, created_at__date__lt=me,
        )
        paid = Payment.objects.filter(status="confirmed", payment_date__gte=ms, payment_date__lt=me)
        rows.append({
            "month":              ms.strftime("%b %Y"),
            "won":                won_quotes.count(),
            "orders_won":         won_orders.count(),
            "revenue_quoted":     float(won_quotes.aggregate(t=Sum("total_price_rwf"))["t"] or 0),
            "orders_revenue":     float(won_orders.aggregate(t=Sum("total_price_rwf"))["t"] or 0),
            "revenue_collected":  float(paid.aggregate(t=Sum("amount_rwf"))["t"] or 0),
        })
    return Response({"months": rows})


# ── Financial Summary ─────────────────────────────────────────────────────────

CATEGORY_LABELS = {
    'rent': 'Rent', 'utilities': 'Utilities', 'fuel': 'Fuel',
    'materials': 'Materials', 'salaries': 'Salaries',
    'contractor': 'Contractor Commission', 'marketing': 'Marketing',
    'transport': 'Transport', 'maintenance': 'Maintenance', 'other': 'Other',
}


def _parse_date(val, fallback):
    if not val:
        return fallback
    try:
        return date_type.fromisoformat(val)
    except ValueError:
        return fallback


def _build_financial_data(from_date, to_date):
    from apps.expenses.models import Expense
    from apps.purchases.models import PurchaseOrder

    # Revenue — approved quotes & orders in period
    install_qs = Quote.objects.filter(
        quote_type=Quote.TYPE_INSTALLATION, status='approved',
        created_at__date__gte=from_date, created_at__date__lte=to_date,
    )
    order_qs = Quote.objects.filter(
        quote_type=Quote.TYPE_PRODUCT_ORDER, status='approved',
        created_at__date__gte=from_date, created_at__date__lte=to_date,
    )
    install_rev = float(install_qs.aggregate(t=Sum('total_price_rwf'))['t'] or 0)
    order_rev   = float(order_qs.aggregate(t=Sum('total_price_rwf'))['t'] or 0)
    gross_rev   = install_rev + order_rev

    # Cash actually collected
    cash = float(
        Payment.objects.filter(
            status='confirmed',
            payment_date__gte=from_date, payment_date__lte=to_date,
        ).aggregate(t=Sum('amount_rwf'))['t'] or 0
    )

    # Cost of goods — received purchase orders
    cogs = float(
        PurchaseOrder.objects.filter(
            status='received',
            received_date__gte=from_date, received_date__lte=to_date,
        ).aggregate(t=Sum('total_cost_rwf'))['t'] or 0
    )

    # Operating expenses
    exp_qs      = Expense.objects.filter(date__gte=from_date, date__lte=to_date)
    total_opex  = float(exp_qs.aggregate(t=Sum('amount_rwf'))['t'] or 0)
    by_category = [
        {'category': row['category'],
         'label': CATEGORY_LABELS.get(row['category'], row['category'].title()),
         'total': float(row['total'])}
        for row in exp_qs.values('category').annotate(total=Sum('amount_rwf')).order_by('-total')
    ]

    # Monthly breakdown within range (one row per calendar month)
    months = []
    cur = from_date.replace(day=1)
    while cur <= to_date:
        if cur.month == 12:
            nxt = cur.replace(year=cur.year + 1, month=1)
        else:
            nxt = cur.replace(month=cur.month + 1)
        me = min(nxt - timedelta(days=1), to_date)

        m_rev = float(
            Quote.objects.filter(status='approved',
                                 created_at__date__gte=cur, created_at__date__lte=me)
            .aggregate(t=Sum('total_price_rwf'))['t'] or 0
        )
        m_cash = float(
            Payment.objects.filter(status='confirmed',
                                   payment_date__gte=cur, payment_date__lte=me)
            .aggregate(t=Sum('amount_rwf'))['t'] or 0
        )
        m_exp = float(
            Expense.objects.filter(date__gte=cur, date__lte=me)
            .aggregate(t=Sum('amount_rwf'))['t'] or 0
        )
        m_cogs = float(
            PurchaseOrder.objects.filter(status='received',
                                         received_date__gte=cur, received_date__lte=me)
            .aggregate(t=Sum('total_cost_rwf'))['t'] or 0
        )
        months.append({
            'month':     cur.strftime('%b %Y'),
            'revenue':   m_rev,
            'cash':      m_cash,
            'expenses':  m_exp,
            'cogs':      m_cogs,
            'net_profit': m_rev - m_cogs - m_exp,
        })
        cur = nxt

    gross_profit = gross_rev - cogs
    net_profit   = gross_profit - total_opex

    return {
        'period':   {'from': str(from_date), 'to': str(to_date)},
        'revenue':  {
            'installation':    install_rev,
            'orders':          order_rev,
            'gross':           gross_rev,
            'install_count':   install_qs.count(),
            'order_count':     order_qs.count(),
        },
        'cash':     {'collected': cash, 'outstanding': max(gross_rev - cash, 0)},
        'cogs':     cogs,
        'expenses': {'total': total_opex, 'by_category': by_category},
        'profit':   {
            'gross':             gross_profit,
            'gross_margin_pct':  round(gross_profit / gross_rev * 100, 1) if gross_rev else 0,
            'net':               net_profit,
            'net_margin_pct':    round(net_profit  / gross_rev * 100, 1) if gross_rev else 0,
        },
        'monthly_trend': months,
    }


@api_view(['GET'])
@permission_classes([IsAuthenticatedAdmin])
def financial_summary(request):
    today     = timezone.now().date()
    from_date = _parse_date(request.query_params.get('from_date'), today.replace(day=1))
    to_date   = _parse_date(request.query_params.get('to_date'),   today)
    return Response(_build_financial_data(from_date, to_date))


@api_view(['GET'])
@permission_classes([IsAuthenticatedAdmin])
def financial_pdf(request):
    today     = timezone.now().date()
    from_date = _parse_date(request.query_params.get('from_date'), today.replace(day=1))
    to_date   = _parse_date(request.query_params.get('to_date'),   today)
    data      = _build_financial_data(from_date, to_date)

    from io import BytesIO
    import os
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                    Table, TableStyle, HRFlowable, Image, KeepTogether)
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from django.conf import settings
    from apps.accounts.models import CompanySettings
    from apps.accounts.pdf_stamp import SHAStampFlowable

    co    = CompanySettings.get()
    W, H  = A4
    NAVY  = colors.HexColor('#091928')
    GOLD  = colors.HexColor('#EA9D13')
    LIGHT = colors.HexColor('#F3F6F9')
    GREEN = colors.HexColor('#15803D')
    RED   = colors.HexColor('#B91C1C')
    GREY  = colors.grey

    USABLE    = W - 40*mm
    LOGO_PATH = os.path.join(settings.BASE_DIR, '..', 'frontend', 'public', 'logo_sha.png')

    def ps(name, **kw):
        return ParagraphStyle(name, parent=getSampleStyleSheet()['Normal'], **kw)

    def rwf(v):
        v = float(v)
        if abs(v) >= 1_000_000:
            return f"RWF {v/1_000_000:.2f}M"
        if abs(v) >= 1_000:
            return f"RWF {v/1_000:.0f}K"
        return f"RWF {v:,.0f}"

    def draw_bars(c, doc):
        c.saveState()
        c.setFillColor(GOLD); c.rect(0, H-6, W, 6, stroke=0, fill=1)
        c.setFillColor(NAVY); c.rect(0, 0,   W, 4, stroke=0, fill=1)
        c.restoreState()

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=20*mm, rightMargin=20*mm,
                            topMargin=22*mm, bottomMargin=18*mm)
    story = []

    # ── Header ───────────────────────────────────────────────────────────────
    logo_cell = [Image(LOGO_PATH, width=44*mm, height=17*mm)] if os.path.exists(LOGO_PATH) else [
        Paragraph(co.company_name or 'SolarHope Africa',
                  ps('cn', fontSize=16, fontName='Helvetica-Bold', textColor=NAVY))]

    hdr = Table([[
        logo_cell,
        [Paragraph('FINANCIAL REPORT', ps('pt', fontSize=9, fontName='Helvetica-Bold',
                                           textColor=colors.white, alignment=2)),
         Paragraph(f"{data['period']['from']}  →  {data['period']['to']}",
                   ps('pd', fontSize=12, fontName='Helvetica-Bold', textColor=GOLD, alignment=2))],
    ]], colWidths=[USABLE * 0.5, USABLE * 0.5])
    hdr.setStyle(TableStyle([
        ('BACKGROUND',    (1, 0), (1, 0), NAVY),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',    (1, 0), (1, 0), 12),
        ('BOTTOMPADDING', (1, 0), (1, 0), 12),
        ('RIGHTPADDING',  (1, 0), (1, 0), 16),
        ('LEFTPADDING',   (1, 0), (1, 0), 10),
    ]))
    story += [hdr, Spacer(1, 3*mm),
              HRFlowable(width=USABLE, thickness=2.5, color=GOLD, spaceAfter=6*mm)]

    # ── KPI row ───────────────────────────────────────────────────────────────
    net = data['profit']['net']
    kpi_data = [
        ['GROSS REVENUE', 'CASH COLLECTED', 'COST OF GOODS', 'TOTAL EXPENSES', 'NET PROFIT'],
        [rwf(data['revenue']['gross']), rwf(data['cash']['collected']),
         rwf(data['cogs']), rwf(data['expenses']['total']),
         rwf(net)],
    ]
    net_color = GREEN if net >= 0 else RED
    kpi_tbl = Table(kpi_data, colWidths=[USABLE/5]*5)
    kpi_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0), NAVY),
        ('BACKGROUND',    (4, 1), (4, 1), net_color),
        ('TEXTCOLOR',     (0, 0), (-1, 0), colors.white),
        ('TEXTCOLOR',     (0, 1), (3, 1), NAVY),
        ('TEXTCOLOR',     (4, 1), (4, 1), colors.white),
        ('FONTNAME',      (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, 0), 7),
        ('FONTSIZE',      (0, 1), (-1, 1), 9),
        ('ALIGN',         (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',    (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW',     (0, 0), (-1, 0), 2, GOLD),
        ('BACKGROUND',    (0, 1), (3, 1), LIGHT),
    ]))
    story += [kpi_tbl, Spacer(1, 7*mm)]

    # ── P&L Statement ─────────────────────────────────────────────────────────
    story.append(Paragraph('INCOME STATEMENT',
                            ps('sh', fontSize=8, fontName='Helvetica-Bold', textColor=GREY)))
    story.append(HRFlowable(width=USABLE, thickness=0.5, color=GOLD, spaceAfter=3))

    _pl_idx = [0]
    def pl_row(label, value, bold=False, color=NAVY, indent=0):
        fn = 'Helvetica-Bold' if bold else 'Helvetica'
        pad = '&nbsp;' * indent
        _pl_idx[0] += 1
        val_str = rwf(value) if value != '' else ''
        return [
            Paragraph(f'{pad}{label}', ps(f'pl_{_pl_idx[0]}', fontSize=9, fontName=fn, textColor=NAVY)),
            Paragraph(val_str, ps(f'pv_{_pl_idx[0]}', fontSize=9, fontName=fn, textColor=color, alignment=2)),
        ]

    pl_rows = [
        pl_row('REVENUE', '', bold=True),
        pl_row('Installation Quotes Approved', data['revenue']['installation'], indent=4),
        pl_row('Product Order Sales', data['revenue']['orders'], indent=4),
        pl_row('Total Revenue', data['revenue']['gross'], bold=True),
        pl_row('', ''),
        pl_row('COST OF GOODS SOLD (COGS)', '', bold=True),
        pl_row('Purchase Orders Received', data['cogs'], indent=4),
        pl_row('Gross Profit', data['profit']['gross'], bold=True,
               color=GREEN if data['profit']['gross'] >= 0 else RED),
        pl_row('', ''),
        pl_row('OPERATING EXPENSES', '', bold=True),
    ]
    for cat in data['expenses']['by_category']:
        pl_rows.append(pl_row(cat['label'], cat['total'], indent=4))
    pl_rows += [
        pl_row('Total Operating Expenses', data['expenses']['total'], bold=True),
        pl_row('', ''),
        pl_row('NET PROFIT / (LOSS)', data['profit']['net'], bold=True,
               color=GREEN if data['profit']['net'] >= 0 else RED),
        pl_row('', ''),
        pl_row('CASH POSITION', '', bold=True),
        pl_row('Cash Collected', data['cash']['collected'], indent=4),
        pl_row('Outstanding Receivables', data['cash']['outstanding'], indent=4),
    ]

    pl_tbl = Table(pl_rows, colWidths=[USABLE * 0.65, USABLE * 0.35])
    pl_styles = [
        ('TOPPADDING',    (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING',   (0, 0), (-1, -1), 6),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 6),
    ]
    # Shade section header rows
    header_rows = [0, 5, 7, 9, len(pl_rows)-4, len(pl_rows)-3]
    for r in header_rows:
        if r < len(pl_rows):
            pl_styles.append(('BACKGROUND', (0, r), (-1, r), LIGHT))
    # Bottom border on key rows
    for r in [3, 7, len(pl_rows)-5, len(pl_rows)-3]:
        if r < len(pl_rows):
            pl_styles.append(('LINEBELOW', (0, r), (-1, r), 1, GOLD))

    pl_tbl.setStyle(TableStyle(pl_styles))
    story += [pl_tbl, Spacer(1, 7*mm)]

    # ── Expense breakdown bar ─────────────────────────────────────────────────
    if data['expenses']['by_category']:
        story.append(Paragraph('EXPENSE BREAKDOWN',
                                ps('sh2', fontSize=8, fontName='Helvetica-Bold', textColor=GREY)))
        story.append(HRFlowable(width=USABLE, thickness=0.5, color=GOLD, spaceAfter=3))
        total_exp = data['expenses']['total'] or 1
        cat_rows = []
        for cat in data['expenses']['by_category']:
            pct     = cat['total'] / total_exp
            bar_w   = USABLE * 0.38 * pct
            cat_rows.append([
                Paragraph(cat['label'], ps(f"cl_{cat['category']}", fontSize=8, textColor=NAVY)),
                Table([['']], colWidths=[bar_w], rowHeights=[8*mm],
                      style=[('BACKGROUND', (0, 0), (0, 0), GOLD)]),
                Paragraph(f"{pct*100:.1f}%", ps(f"cp_{cat['category']}", fontSize=8,
                                                  textColor=GREY, alignment=1)),
                Paragraph(rwf(cat['total']), ps(f"cv_{cat['category']}", fontSize=8,
                                                  fontName='Helvetica-Bold', textColor=NAVY, alignment=2)),
            ])
        cat_tbl = Table(cat_rows, colWidths=[USABLE*0.28, USABLE*0.38, USABLE*0.12, USABLE*0.22])
        cat_tbl.setStyle(TableStyle([
            ('TOPPADDING',    (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
            ('LINEBELOW',     (0, 0), (-1, -1), 0.3, colors.HexColor('#EEF0F2')),
        ]))
        story += [cat_tbl, Spacer(1, 7*mm)]

    # ── Margins summary ───────────────────────────────────────────────────────
    margin_data = [[
        [Paragraph('GROSS MARGIN', ps('gml', fontSize=7, fontName='Helvetica-Bold', textColor=GREY)),
         Paragraph(f"{data['profit']['gross_margin_pct']}%",
                   ps('gmv', fontSize=22, fontName='Helvetica-Bold',
                      textColor=GREEN if data['profit']['gross_margin_pct'] >= 0 else RED))],
        [Paragraph('NET MARGIN', ps('nml', fontSize=7, fontName='Helvetica-Bold', textColor=GREY)),
         Paragraph(f"{data['profit']['net_margin_pct']}%",
                   ps('nmv', fontSize=22, fontName='Helvetica-Bold',
                      textColor=GREEN if data['profit']['net_margin_pct'] >= 0 else RED))],
        [Paragraph('OUTSTANDING', ps('osl', fontSize=7, fontName='Helvetica-Bold', textColor=GREY)),
         Paragraph(rwf(data['cash']['outstanding']),
                   ps('osv', fontSize=13, fontName='Helvetica-Bold', textColor=NAVY))],
    ]]
    margin_tbl = Table(margin_data, colWidths=[USABLE/3]*3)
    margin_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), LIGHT),
        ('TOPPADDING',    (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING',   (0, 0), (-1, -1), 14),
        ('LINERIGHT',     (0, 0), (1, 0), 0.5, colors.HexColor('#DDE3EA')),
    ]))
    story.append(margin_tbl)

    # ── Authorization ─────────────────────────────────────────────────────────
    story.append(Spacer(1, 8*mm))
    story.append(HRFlowable(width=USABLE, thickness=0.5, color=colors.HexColor('#DDE3EA'),
                             spaceAfter=4*mm))
    foot_parts = list(filter(None, [
        co.company_name, co.company_address, co.company_email, co.company_phone
    ]))
    auth = Table([[
        [Paragraph('Prepared by system — SolarHope Africa CRM',
                   ps('pb', fontSize=7, textColor=GREY)),
         Spacer(1, 4*mm),
         Paragraph('  ·  '.join(foot_parts), ps('ft', fontSize=7, textColor=GREY))],
        SHAStampFlowable(co, size_mm=42),
    ]], colWidths=[USABLE * 0.68, USABLE * 0.32])
    auth.setStyle(TableStyle([
        ('VALIGN',  (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN',   (1, 0), (1, 0),  'CENTER'),
    ]))
    story.append(KeepTogether(auth))

    doc.build(story, onFirstPage=draw_bars, onLaterPages=draw_bars)
    buf.seek(0)
    filename = f"Financial-Report-{from_date}-to-{to_date}.pdf"
    resp = HttpResponse(buf, content_type='application/pdf')
    resp['Content-Disposition'] = f'attachment; filename="{filename}"'
    return resp
