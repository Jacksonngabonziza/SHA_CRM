from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import HttpResponse
from .models import Supplier, PurchaseOrder, PurchaseOrderItem
from .serializers import SupplierSerializer, PurchaseOrderSerializer, PurchaseOrderItemSerializer


class SupplierListCreateView(generics.ListCreateAPIView):
    queryset           = Supplier.objects.all()
    serializer_class   = SupplierSerializer
    permission_classes = [IsAuthenticated]


class SupplierDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Supplier.objects.all()
    serializer_class   = SupplierSerializer
    permission_classes = [IsAuthenticated]


class PurchaseOrderListCreateView(generics.ListCreateAPIView):
    serializer_class   = PurchaseOrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = PurchaseOrder.objects.select_related('supplier', 'created_by').prefetch_related('items__product').all()
        supplier = self.request.query_params.get('supplier')
        status_  = self.request.query_params.get('status')
        if supplier: qs = qs.filter(supplier_id=supplier)
        if status_:  qs = qs.filter(status=status_)
        return qs


class PurchaseOrderDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = PurchaseOrder.objects.select_related('supplier').prefetch_related('items__product').all()
    serializer_class   = PurchaseOrderSerializer
    permission_classes = [IsAuthenticated]


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_po_item(request, pk):
    try:
        po = PurchaseOrder.objects.get(pk=pk)
    except PurchaseOrder.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    serializer = PurchaseOrderItemSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(purchase_order=po)
    po.recalculate_total()
    return Response(PurchaseOrderSerializer(po).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_po_item(request, pk, item_pk):
    try:
        item = PurchaseOrderItem.objects.get(pk=item_pk, purchase_order_id=pk)
    except PurchaseOrderItem.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)
    item.delete()
    po = PurchaseOrder.objects.get(pk=pk)
    po.recalculate_total()
    return Response(PurchaseOrderSerializer(po).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def purchase_order_pdf(request, pk):
    try:
        po = PurchaseOrder.objects.select_related('supplier', 'created_by').prefetch_related('items__product').get(pk=pk)
    except PurchaseOrder.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    from io import BytesIO
    import os
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from django.conf import settings
    from apps.accounts.models import CompanySettings

    co   = CompanySettings.get()
    W, H = A4
    sup  = po.supplier

    NAVY  = colors.HexColor('#091928')
    GOLD  = colors.HexColor('#EA9D13')
    LIGHT = colors.HexColor('#F3F6F9')

    STAMP_COLORS = {
        'draft':     colors.HexColor('#6B7280'),
        'ordered':   colors.HexColor('#1D4ED8'),
        'received':  colors.HexColor('#15803D'),
        'cancelled': colors.HexColor('#B91C1C'),
    }
    STAMP_TEXTS = {
        'draft':     'DRAFT',
        'ordered':   'ORDERED',
        'received':  'RECEIVED',
        'cancelled': 'CANCELLED',
    }
    stamp_color = STAMP_COLORS.get(po.status, NAVY)
    stamp_text  = STAMP_TEXTS.get(po.status, po.status.upper())

    def ps(name, **kw):
        return ParagraphStyle(name, parent=getSampleStyleSheet()['Normal'], **kw)

    def rwf(v):
        return f"RWF {float(v):,.0f}"

    LOGO_PATH = os.path.join(settings.BASE_DIR, '..', 'frontend', 'public', 'logo_sha.png')
    USABLE    = W - 40*mm

    from apps.accounts.pdf_stamp import SHAStampFlowable, StatusStampFlowable
    from reportlab.platypus import KeepTogether

    def draw_bars(c, doc):
        c.saveState()
        c.setFillColor(GOLD); c.rect(0, H - 6, W, 6, stroke=0, fill=1)
        c.setFillColor(NAVY); c.rect(0, 0,     W, 4, stroke=0, fill=1)
        c.restoreState()

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=22*mm, bottomMargin=18*mm,
    )

    story = []

    # ── Header: logo left | PO label right ───────────────────────────────────
    logo_cell = []
    if os.path.exists(LOGO_PATH):
        logo_cell.append(Image(LOGO_PATH, width=44*mm, height=17*mm))
    else:
        logo_cell.append(Paragraph(co.company_name or 'SolarHope Africa',
                                   ps('cn', fontSize=16, fontName='Helvetica-Bold', textColor=NAVY)))
    co_sub_parts = []
    if co.company_address: co_sub_parts.append(co.company_address)
    if co.company_phone:   co_sub_parts.append(co.company_phone)
    if co.company_email:   co_sub_parts.append(co.company_email)
    if co_sub_parts:
        logo_cell.append(Paragraph('  ·  '.join(co_sub_parts),
                                   ps('cs', fontSize=8, textColor=colors.grey)))

    hdr_tbl = Table([[
        logo_cell,
        [Paragraph('PURCHASE ORDER', ps('pt', fontSize=9, fontName='Helvetica-Bold',
                                         textColor=colors.white, alignment=2)),
         Paragraph(f'PO-{po.id:05d}', ps('pn', fontSize=20, fontName='Helvetica-Bold',
                                           textColor=GOLD, alignment=2))],
    ]], colWidths=[USABLE * 0.55, USABLE * 0.45])
    hdr_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (1, 0), (1, 0), NAVY),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',    (1, 0), (1, 0), 10),
        ('BOTTOMPADDING', (1, 0), (1, 0), 10),
        ('RIGHTPADDING',  (1, 0), (1, 0), 14),
        ('LEFTPADDING',   (1, 0), (1, 0), 10),
    ]))
    story.append(hdr_tbl)
    story.append(Spacer(1, 4*mm))
    story.append(HRFlowable(width=USABLE, thickness=2, color=GOLD, spaceAfter=5*mm))

    # ── From / To two-column ──────────────────────────────────────────────────
    co_lines  = f"<b>{co.company_name or 'SolarHope Africa'}</b>"
    if co.company_address: co_lines += f"<br/>{co.company_address}"
    if co.company_phone:   co_lines += f"<br/>{co.company_phone}"
    if co.company_email:   co_lines += f"<br/>{co.company_email}"

    sup_lines = f"<b>{sup.name}</b>"
    if sup.contact_name: sup_lines += f"<br/>{sup.contact_name}"
    if sup.phone:        sup_lines += f"<br/>{sup.phone}"
    if sup.email:        sup_lines += f"<br/>{sup.email}"
    if sup.address:      sup_lines += f"<br/>{sup.address}"

    addr_tbl = Table([[
        [Paragraph('FROM', ps('fl1', fontSize=7, fontName='Helvetica-Bold', textColor=colors.grey)),
         Paragraph(co_lines,  ps('fv1', fontSize=9, textColor=NAVY, leading=13))],
        [Paragraph('TO (SUPPLIER)', ps('fl2', fontSize=7, fontName='Helvetica-Bold', textColor=colors.grey)),
         Paragraph(sup_lines, ps('fv2', fontSize=9, textColor=NAVY, leading=13))],
    ]], colWidths=[USABLE * 0.5, USABLE * 0.5])
    addr_tbl.setStyle(TableStyle([
        ('VALIGN',       (0, 0), (-1, -1), 'TOP'),
        ('LINERIGHT',    (0, 0), (0, -1), 0.5, colors.HexColor('#DDE3EA')),
        ('TOPPADDING',   (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(addr_tbl)
    story.append(Spacer(1, 5*mm))

    # ── Meta strip ────────────────────────────────────────────────────────────
    meta = [
        [Paragraph('ORDER DATE', ps('ml1', fontSize=7, fontName='Helvetica-Bold', textColor=colors.grey)),
         Paragraph('STATUS',     ps('ml2', fontSize=7, fontName='Helvetica-Bold', textColor=colors.grey)),
         Paragraph('YOUR REF',   ps('ml3', fontSize=7, fontName='Helvetica-Bold', textColor=colors.grey)),
         Paragraph('PREPARED BY',ps('ml4', fontSize=7, fontName='Helvetica-Bold', textColor=colors.grey))],
        [Paragraph(str(po.order_date), ps('mv1', fontSize=9, textColor=NAVY)),
         Paragraph(po.get_status_display().upper(), ps('mv2', fontSize=9, textColor=stamp_color, fontName='Helvetica-Bold')),
         Paragraph(po.ref_number or '—', ps('mv3', fontSize=9, textColor=NAVY)),
         Paragraph(po.created_by.get_full_name() if po.created_by else '—', ps('mv4', fontSize=9, textColor=NAVY))],
    ]
    meta_tbl = Table(meta, colWidths=[USABLE/4]*4)
    meta_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), LIGHT),
        ('TOPPADDING',    (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING',   (0, 0), (-1, -1), 8),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 8),
        ('LINEBELOW',     (0, 0), (-1, 0), 1.5, GOLD),
    ]))
    story.append(meta_tbl)
    story.append(Spacer(1, 6*mm))

    # ── Section label ─────────────────────────────────────────────────────────
    story.append(Paragraph('ORDER ITEMS',
                            ps('sh', fontSize=8, fontName='Helvetica-Bold', textColor=colors.grey)))
    story.append(HRFlowable(width=USABLE, thickness=0.5, color=GOLD, spaceAfter=3))

    # ── Items table ───────────────────────────────────────────────────────────
    col_w = [USABLE * 0.45, USABLE * 0.13, USABLE * 0.21, USABLE * 0.21]
    th = lambda t, align=0: Paragraph(f'<b>{t}</b>',
                                       ps(f'th_{t}', fontSize=9, fontName='Helvetica-Bold',
                                          textColor=colors.white, alignment=align))
    item_rows = [[th('Product'), th('Qty', 1), th('Unit Cost', 2), th('Line Total', 2)]]
    for i, item in enumerate(po.items.all()):
        prod  = item.product
        label = prod.name
        if prod.brand or prod.model:
            parts = [p for p in [prod.brand, prod.model] if p]
            label += f" ({' '.join(parts)})"
        item_rows.append([
            Paragraph(label, ps(f'it{i}', fontSize=9, textColor=NAVY)),
            Paragraph(str(item.quantity), ps(f'iq{i}', fontSize=9, textColor=NAVY, alignment=1)),
            Paragraph(rwf(item.unit_cost_rwf), ps(f'ic{i}', fontSize=9, textColor=NAVY, alignment=2)),
            Paragraph(rwf(item.line_total),    ps(f'il{i}', fontSize=9, fontName='Helvetica-Bold', textColor=NAVY, alignment=2)),
        ])

    items_tbl = Table(item_rows, colWidths=col_w, repeatRows=1)
    row_count  = len(item_rows)
    items_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0), NAVY),
        ('TOPPADDING',    (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING',   (0, 0), (-1, -1), 8),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 8),
        ('LINEBELOW',     (0, 1), (-1, -1), 0.3, colors.HexColor('#DDE3EA')),
        *[('BACKGROUND', (0, r), (-1, r), LIGHT) for r in range(2, row_count, 2)],
    ]))
    story.append(items_tbl)
    story.append(Spacer(1, 3*mm))

    # ── Total box ─────────────────────────────────────────────────────────────
    total_tbl = Table(
        [[Paragraph('TOTAL ORDER VALUE', ps('tl', fontSize=10, fontName='Helvetica-Bold', textColor=NAVY)),
          Paragraph(rwf(po.total_cost_rwf), ps('tv', fontSize=20, fontName='Helvetica-Bold',
                                               textColor=NAVY, alignment=2))]],
        colWidths=[USABLE * 0.55, USABLE * 0.45],
    )
    total_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), GOLD),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',    (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING',   (0, 0), (-1, -1), 14),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 14),
    ]))
    story.append(total_tbl)

    if po.received_date:
        story.append(Spacer(1, 3*mm))
        story.append(Paragraph(f"Received on: {po.received_date}",
                               ps('rd', fontSize=9, textColor=colors.HexColor('#15803D'), fontName='Helvetica-Bold')))

    if po.notes:
        story.append(Spacer(1, 5*mm))
        story.append(Paragraph('NOTES', ps('nh', fontSize=8, fontName='Helvetica-Bold', textColor=colors.grey)))
        story.append(HRFlowable(width=USABLE, thickness=0.5, color=GOLD, spaceAfter=3))
        story.append(Paragraph(po.notes, ps('nt', fontSize=9, textColor=colors.grey)))

    # ── Authorization section with inline stamps ──────────────────────────────
    story.append(Spacer(1, 8*mm))
    story.append(HRFlowable(width=USABLE, thickness=0.5, color=colors.HexColor('#DDE3EA'),
                             spaceAfter=4*mm))

    stamp_size = 42
    prepared_by = po.created_by.get_full_name() if po.created_by else '—'
    foot_parts  = list(filter(None, [
        co.company_name, co.company_address, co.company_email, co.company_phone
    ]))
    auth_tbl = Table([[
        [Paragraph('Prepared by:', ps('pb', fontSize=7, textColor=colors.grey)),
         Paragraph(f'<b>{prepared_by}</b>', ps('pbn', fontSize=9, textColor=NAVY)),
         Spacer(1, 6*mm),
         Paragraph('  ·  '.join(foot_parts), ps('ft', fontSize=7, textColor=colors.grey))],
        StatusStampFlowable(stamp_text, stamp_color, w_mm=stamp_size + 14, h_mm=stamp_size),
        SHAStampFlowable(co, size_mm=stamp_size),
    ]], colWidths=[USABLE * 0.38, USABLE * 0.30, USABLE * 0.32])
    auth_tbl.setStyle(TableStyle([
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN',         (1, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING',    (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(KeepTogether(auth_tbl))

    doc.build(story, onFirstPage=draw_bars, onLaterPages=draw_bars)
    buf.seek(0)
    filename = f"PO-{po.id:05d}_{sup.name.replace(' ', '_')}.pdf"
    response = HttpResponse(buf, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_po_received(request, pk):
    try:
        po = PurchaseOrder.objects.prefetch_related('items__product').get(pk=pk)
    except PurchaseOrder.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    if po.status == PurchaseOrder.STATUS_RECEIVED:
        return Response({'detail': 'Already marked as received.'}, status=400)
    if po.status == PurchaseOrder.STATUS_CANCELLED:
        return Response({'detail': 'Cannot receive a cancelled order.'}, status=400)

    received_date = request.data.get('received_date') or None
    po.mark_received(received_date)
    return Response(PurchaseOrderSerializer(po).data)
