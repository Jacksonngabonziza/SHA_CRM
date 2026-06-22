
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from django.http import HttpResponse
from apps.accounts.permissions import IsAdminOrReadOnly
from .models import Payment
from .serializers import PaymentSerializer

class PaymentListCreateView(generics.ListCreateAPIView):
    serializer_class   = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Payment.objects.select_related("quote","client","recorded_by").all()
        quote_id = self.request.query_params.get("quote")
        client_id= self.request.query_params.get("client")
        if quote_id:  qs = qs.filter(quote_id=quote_id)
        if client_id: qs = qs.filter(client_id=client_id)
        return qs

class PaymentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Payment.objects.select_related("quote","client").all()
    serializer_class   = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        if request.user.role != "admin":
            return Response({"detail":"Only admins can delete payments."}, status=403)
        return super().destroy(request, *args, **kwargs)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def quote_payment_summary(request, quote_id):
    from apps.quotes.models import Quote
    try:
        quote = Quote.objects.get(pk=quote_id)
    except Quote.DoesNotExist:
        return Response({"detail":"Not found."}, status=404)
    payments = Payment.objects.filter(quote=quote)
    total_paid = payments.filter(status="confirmed").aggregate(t=Sum("amount_rwf"))["t"] or 0
    return Response({
        "quote_ref": quote.ref_number,
        "total_price": float(quote.total_price_rwf),
        "total_paid": float(total_paid),
        "balance_due": float(quote.total_price_rwf) - float(total_paid),
        "payments": PaymentSerializer(payments, many=True).data,
        "is_fully_paid": float(total_paid) >= float(quote.total_price_rwf),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_receipt_pdf(request, pk):
    try:
        payment = Payment.objects.select_related('quote', 'client', 'recorded_by').get(pk=pk)
    except Payment.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    from io import BytesIO
    import os
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image, KeepTogether
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from django.conf import settings
    from apps.accounts.models import CompanySettings
    from apps.accounts.pdf_stamp import SHAStampFlowable, StatusStampFlowable
    from django.db.models import Sum as DSum

    co   = CompanySettings.get()
    W, H = A4
    NAVY  = colors.HexColor('#091928')
    GOLD  = colors.HexColor('#EA9D13')
    LIGHT = colors.HexColor('#F3F6F9')
    DIVIDER = colors.HexColor('#DDE3EA')

    confirmed  = payment.status == 'confirmed'
    total_paid = Payment.objects.filter(
        quote=payment.quote, status='confirmed'
    ).aggregate(t=DSum('amount_rwf'))['t'] or 0
    balance = max(float(payment.quote.total_price_rwf) - float(total_paid), 0)

    def rwf(v): return f"RWF {float(v):,.0f}"
    def ps(name, **kw):
        return ParagraphStyle(name, parent=getSampleStyleSheet()['Normal'], **kw)

    USABLE    = W - 40*mm
    LOGO_PATH = os.path.join(settings.BASE_DIR, '..', 'frontend', 'public', 'logo_sha.png')

    def draw_bars(c, doc):
        c.saveState()
        c.setFillColor(GOLD);  c.rect(0, H - 6, W, 6, stroke=0, fill=1)
        c.setFillColor(NAVY);  c.rect(0, 0,     W, 4, stroke=0, fill=1)
        c.restoreState()

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=20*mm, rightMargin=20*mm,
                            topMargin=22*mm, bottomMargin=18*mm)
    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    logo_cell = [Image(LOGO_PATH, width=44*mm, height=17*mm)] if os.path.exists(LOGO_PATH) else [
        Paragraph(co.company_name or 'SolarHope Africa',
                  ps('cn', fontSize=16, fontName='Helvetica-Bold', textColor=NAVY))]

    hdr = Table([[
        logo_cell,
        [Paragraph('PAYMENT RECEIPT', ps('pt', fontSize=9, fontName='Helvetica-Bold',
                                          textColor=colors.white, alignment=2)),
         Paragraph(f'#{payment.id:05d}', ps('pn', fontSize=22, fontName='Helvetica-Bold',
                                             textColor=GOLD, alignment=2))],
    ]], colWidths=[USABLE * 0.55, USABLE * 0.45])
    hdr.setStyle(TableStyle([
        ('BACKGROUND',    (1, 0), (1, 0), NAVY),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',    (1, 0), (1, 0), 12),
        ('BOTTOMPADDING', (1, 0), (1, 0), 12),
        ('RIGHTPADDING',  (1, 0), (1, 0), 16),
        ('LEFTPADDING',   (1, 0), (1, 0), 10),
    ]))
    story += [hdr, Spacer(1, 4*mm),
              HRFlowable(width=USABLE, thickness=2.5, color=GOLD, spaceAfter=5*mm)]

    # ── FROM / BILLED TO ──────────────────────────────────────────────────────
    co_lines  = f"<b>{co.company_name or 'SolarHope Africa'}</b>"
    if co.company_address: co_lines += f"<br/>{co.company_address}"
    if co.company_phone:   co_lines += f"<br/>{co.company_phone}"
    if co.company_email:   co_lines += f"<br/>{co.company_email}"

    cli = payment.client
    cli_lines = f"<b>{cli.name}</b>"
    if cli.phone:    cli_lines += f"<br/>{cli.phone}"
    if cli.email:    cli_lines += f"<br/>{cli.email}"
    if cli.location: cli_lines += f"<br/>{cli.location}"

    addr = Table([[
        [Paragraph('FROM',      ps('fl',  fontSize=7, fontName='Helvetica-Bold', textColor=colors.grey)),
         Paragraph(co_lines,    ps('fv',  fontSize=9, textColor=NAVY, leading=14))],
        [Paragraph('BILLED TO', ps('fl2', fontSize=7, fontName='Helvetica-Bold', textColor=colors.grey)),
         Paragraph(cli_lines,   ps('fv2', fontSize=9, textColor=NAVY, leading=14))],
    ]], colWidths=[USABLE * 0.5, USABLE * 0.5])
    addr.setStyle(TableStyle([
        ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
        ('LINERIGHT',     (0, 0), (0, -1), 0.5, DIVIDER),
        ('TOPPADDING',    (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 12),
    ]))
    story += [addr, Spacer(1, 5*mm)]

    # ── Details strip (4 cols, wider quote ref column) ────────────────────────
    col_w = [26*mm, USABLE - 26*mm - 30*mm - 38*mm - 36*mm, 30*mm, 38*mm, 36*mm]
    meta = [
        [Paragraph(h, ps(f'mh{i}', fontSize=7, fontName='Helvetica-Bold', textColor=colors.grey))
         for i, h in enumerate(['DATE', 'QUOTE / ORDER', 'METHOD', 'TYPE', 'REFERENCE'])],
        [Paragraph(str(payment.payment_date),              ps('mv0', fontSize=8.5, textColor=NAVY)),
         Paragraph(payment.quote.ref_number,               ps('mv1', fontSize=8.5, textColor=NAVY)),
         Paragraph(payment.get_payment_method_display(),   ps('mv2', fontSize=8.5, textColor=NAVY)),
         Paragraph(payment.get_payment_type_display(),     ps('mv3', fontSize=8.5, textColor=NAVY)),
         Paragraph(payment.reference or '—',               ps('mv4', fontSize=8.5, textColor=NAVY))],
    ]
    meta_tbl = Table(meta, colWidths=col_w)
    meta_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), LIGHT),
        ('TOPPADDING',    (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING',   (0, 0), (-1, -1), 8),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 8),
        ('LINEBELOW',     (0, 0), (-1, 0), 2, GOLD),
    ]))
    story += [meta_tbl, Spacer(1, 6*mm)]

    # ── Amount box ────────────────────────────────────────────────────────────
    amt = Table([[
        Paragraph('AMOUNT PAID', ps('al', fontSize=11, fontName='Helvetica-Bold', textColor=NAVY)),
        Paragraph(rwf(payment.amount_rwf), ps('av', fontSize=22, fontName='Helvetica-Bold',
                                              textColor=NAVY, alignment=2)),
    ]], colWidths=[USABLE * 0.45, USABLE * 0.55])
    amt.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), GOLD),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',    (0, 0), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
        ('LEFTPADDING',   (0, 0), (-1, -1), 16),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 16),
    ]))
    story.append(amt)

    # ── Balance strip ─────────────────────────────────────────────────────────
    bal_color = colors.HexColor('#15803D') if balance == 0 else colors.HexColor('#B91C1C')
    bal = Table([[
        Paragraph(f"Quote Total: {rwf(payment.quote.total_price_rwf)}",
                  ps('bs1', fontSize=9, textColor=colors.grey)),
        Paragraph(f"Total Paid: {rwf(total_paid)}",
                  ps('bs2', fontSize=9, textColor=colors.grey, alignment=1)),
        Paragraph(f"Balance Due: {rwf(balance)}",
                  ps('bs3', fontSize=9, fontName='Helvetica-Bold', textColor=bal_color, alignment=2)),
    ]], colWidths=[USABLE/3]*3)
    bal.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), LIGHT),
        ('TOPPADDING',    (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING',   (0, 0), (-1, -1), 10),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 10),
        ('LINEABOVE',     (2, 0), (2, 0), 2.5, bal_color),
    ]))
    story.append(bal)

    if payment.notes:
        story += [Spacer(1, 4*mm),
                  Paragraph(f"<b>Notes:</b> {payment.notes}",
                             ps('nt', fontSize=9, textColor=colors.grey))]

    # ── Authorization section with inline stamps ───────────────────────────────
    story.append(Spacer(1, 8*mm))
    story.append(HRFlowable(width=USABLE, thickness=0.5, color=DIVIDER, spaceAfter=4*mm))

    paid_color  = colors.HexColor('#B91C1C') if confirmed else colors.HexColor('#6B7280')
    paid_text   = 'PAID' if confirmed else 'PENDING'
    stamp_size  = 42

    auth_tbl = Table([[
        [Paragraph('Thank you for your business!',
                   ps('ty', fontSize=9, textColor=GOLD, fontName='Helvetica-Bold')),
         Spacer(1, 3*mm),
         Paragraph('  ·  '.join(filter(None, [
             co.company_name, co.company_address, co.company_email, co.company_phone
         ])), ps('ft', fontSize=7, textColor=colors.grey))],
        StatusStampFlowable(paid_text, paid_color, w_mm=stamp_size + 14, h_mm=stamp_size),
        SHAStampFlowable(co, size_mm=stamp_size),
    ]], colWidths=[USABLE * 0.42, USABLE * 0.28, USABLE * 0.30])
    auth_tbl.setStyle(TableStyle([
        ('VALIGN',  (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN',   (1, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING',    (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(KeepTogether(auth_tbl))

    doc.build(story, onFirstPage=draw_bars, onLaterPages=draw_bars)
    buf.seek(0)
    resp = HttpResponse(buf, content_type='application/pdf')
    resp['Content-Disposition'] = f'attachment; filename="Receipt-{payment.id:05d}.pdf"'
    return resp


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_payments_csv(request):
    import csv
    from django.http import HttpResponse

    qs = Payment.objects.select_related('quote', 'recorded_by').order_by('-payment_date')
    if request.user.role == 'sales':
        qs = qs.filter(recorded_by=request.user)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="payments.csv"'

    writer = csv.writer(response)
    writer.writerow([
        'Quote Ref', 'Client', 'Amount (RWF)', 'Type', 'Method',
        'Status', 'Reference', 'Payment Date', 'Notes', 'Recorded By',
    ])
    for p in qs:
        writer.writerow([
            p.quote_ref,
            p.client_name,
            float(p.amount_rwf),
            p.get_payment_type_display(),
            p.get_payment_method_display(),
            p.get_status_display(),
            p.reference,
            p.payment_date,
            p.notes,
            p.recorded_by.get_full_name() if p.recorded_by else '',
        ])
    return response
