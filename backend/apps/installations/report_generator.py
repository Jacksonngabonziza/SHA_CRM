"""
Installation Completion Report – SolarHope Africa
Sent to the client to confirm system delivery and request final payment.
"""
from io import BytesIO
from decimal import Decimal
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether,
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

# ── Brand palette ─────────────────────────────────────────────────────────────
NAVY  = HexColor('#091928')
AMBER = HexColor('#EA9D13')
GREEN = HexColor('#71AA1F')
RED   = HexColor('#DC2626')
LGREY = HexColor('#F8F9FA')
MGREY = HexColor('#E5E7EB')
DGREY = HexColor('#6B7280')
WHITE = HexColor('#FFFFFF')
AMBER_LIGHT = HexColor('#FEF3C7')

W, H = A4
MARGIN = 14 * mm
CW = W - MARGIN * 2


# ── Helpers ───────────────────────────────────────────────────────────────────
def _ps(name, **kw):
    kw.setdefault('fontName', 'Helvetica')
    return ParagraphStyle(name, **kw)


def _fmt(v):
    try:
        return f"RWF {int(v):,}"
    except Exception:
        return str(v)


def _date(d):
    if not d:
        return '—'
    if hasattr(d, 'strftime'):
        return d.strftime('%d %B %Y')
    return str(d)


def _datetime(d):
    if not d:
        return '—'
    if hasattr(d, 'strftime'):
        return d.strftime('%d %b %Y, %H:%M')
    return str(d)


def _section_heading(text):
    """Amber-labelled section heading with bottom rule."""
    return KeepTogether([
        Paragraph(
            text,
            _ps('sh', fontSize=8, fontName='Helvetica-Bold',
                textColor=AMBER, spaceBefore=10, spaceAfter=2,
                letterSpacing=0.8),
        ),
        HRFlowable(width=CW, thickness=1, color=AMBER, spaceAfter=5),
    ])



def generate_installation_report(installation) -> BytesIO:
    from apps.accounts.models import CompanySettings
    from apps.payments.models import Payment
    from django.utils import timezone as tz

    cfg    = CompanySettings.get()
    quote  = installation.quote
    client = installation.client
    logs   = list(installation.logs.order_by('created_at'))

    # Payment data
    payments    = Payment.objects.filter(quote=quote, status='confirmed').order_by('payment_date')
    total_paid  = sum(p.amount_rwf for p in payments)
    balance_due = max(Decimal('0'), quote.total_price_rwf - total_paid)

    # ── Document setup ────────────────────────────────────────────────────────
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=10 * mm, bottomMargin=14 * mm,
        title=f"Installation Report – {client.name}",
    )
    story = []

    # ── HEADER ────────────────────────────────────────────────────────────────
    # Top amber strip
    strip = Table([['']], colWidths=[CW])
    strip.setStyle(TableStyle([
        ('BACKGROUND',     (0, 0), (-1, -1), AMBER),
        ('TOPPADDING',     (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING',  (0, 0), (-1, -1), 3),
    ]))
    story.append(strip)
    story.append(Spacer(1, 4))

    # Company name + contact
    hdr = Table([[
        Paragraph(
            f'<font name="Helvetica-Bold" color="#091928" size="18">{cfg.company_name}</font><br/>'
            f'<font name="Helvetica" color="#6B7280" size="8">{cfg.company_tagline}</font>',
            _ps('hn', leading=22),
        ),
        Paragraph(
            f'<font color="#6B7280">{cfg.company_phone or ""}</font><br/>'
            f'<font color="#6B7280">{cfg.company_email or ""}</font><br/>'
            f'<font color="#6B7280">{cfg.company_website or ""}</font>',
            _ps('hc', fontSize=8, textColor=DGREY, leading=12, alignment=TA_RIGHT),
        ),
    ]], colWidths=[CW * 0.6, CW * 0.4])
    hdr.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',    (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(hdr)
    story.append(HRFlowable(width=CW, thickness=2, color=NAVY, spaceAfter=5))

    # Title band
    title_tbl = Table([[
        Paragraph(
            'INSTALLATION COMPLETION REPORT',
            _ps('tt', fontSize=13, fontName='Helvetica-Bold', textColor=WHITE, alignment=TA_CENTER),
        ),
        Table([[
            Paragraph(f'Ref: <b>{quote.ref_number}</b>',
                      _ps('tr', fontSize=8, textColor=WHITE, alignment=TA_RIGHT)),
            Paragraph(f'Date: <b>{_date(installation.completed_at or installation.scheduled_date)}</b>',
                      _ps('td', fontSize=8, textColor=WHITE, alignment=TA_RIGHT)),
        ]], colWidths=[CW * 0.2, CW * 0.18]),
    ]], colWidths=[CW * 0.62, CW * 0.38])
    title_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), NAVY),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',    (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 9),
        ('LEFTPADDING',   (0, 0), (0, -1),  12),
        ('RIGHTPADDING',  (-1, 0), (-1, -1), 8),
    ]))
    story.append(title_tbl)
    story.append(Spacer(1, 8))

    # ── CLIENT + INSTALLATION (side by side) ─────────────────────────────────
    story.append(_section_heading('CLIENT & INSTALLATION DETAILS'))

    client_rows = [
        ['Client Name',  client.name],
        ['Phone',        client.phone or '—'],
        ['Email',        client.email or '—'],
        ['Address',      client.address or '—'],
        ['Client Type',  client.get_client_type_display() if hasattr(client, 'get_client_type_display') else (client.client_type or '—')],
    ]
    install_rows = [
        ['Status',          installation.get_status_display()],
        ['Scheduled Date',  _date(installation.scheduled_date)],
        ['Started',         _date(installation.scheduled_date)],
        ['Completed',       _date(installation.completed_at)],
        ['Commissioning',   '✓ Done' if installation.commissioning_done else '✗ Pending'],
        ['Client Training', '✓ Done' if installation.client_training_done else '✗ Pending'],
    ]

    def _mini_info(rows, title):
        head = Table([[
            Paragraph(title, _ps('mh', fontSize=7, fontName='Helvetica-Bold', textColor=WHITE)),
        ]], colWidths=[(CW - 8) * 0.5])
        head.setStyle(TableStyle([
            ('BACKGROUND',    (0, 0), (-1, -1), NAVY),
            ('TOPPADDING',    (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING',   (0, 0), (-1, -1), 8),
        ]))
        body = Table(rows, colWidths=[(CW - 8) * 0.28, (CW - 8) * 0.22])
        body.setStyle(TableStyle([
            ('FONTSIZE',       (0, 0), (-1, -1), 8),
            ('LEADING',        (0, 0), (-1, -1), 12),
            ('TEXTCOLOR',      (0, 0),  (0, -1), DGREY),
            ('FONTNAME',       (1, 0),  (1, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR',      (1, 0),  (1, -1), NAVY),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [WHITE, LGREY]),
            ('TOPPADDING',     (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING',  (0, 0), (-1, -1), 4),
            ('LEFTPADDING',    (0, 0), (-1, -1), 8),
            ('RIGHTPADDING',   (0, 0), (-1, -1), 6),
        ]))
        return [head, body]

    left_items  = _mini_info(client_rows,  'CLIENT DETAILS')
    right_items = _mini_info(install_rows, 'INSTALLATION DETAILS')

    side_tbl = Table([[
        Table([[i] for i in left_items],  colWidths=[(CW - 8) * 0.5]),
        Spacer(8, 1),
        Table([[i] for i in right_items], colWidths=[(CW - 8) * 0.5]),
    ]], colWidths=[CW * 0.49, 8, CW * 0.49])
    side_tbl.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(side_tbl)
    story.append(Spacer(1, 8))

    # ── SYSTEM INSTALLED ──────────────────────────────────────────────────────
    story.append(_section_heading('SYSTEM INSTALLED'))

    hrow = [
        Paragraph(t, _ps(f'ch{i}', fontSize=8, fontName='Helvetica-Bold', textColor=WHITE,
                         alignment=TA_RIGHT if i == 3 else TA_LEFT))
        for i, t in enumerate(['Component', 'Brand / Model', 'Specification', 'Qty'])
    ]
    comp_rows = [hrow]

    def _cr(component, brand_model, spec, qty):
        return [
            Paragraph(component,   _ps('c', fontSize=8, textColor=NAVY, fontName='Helvetica-Bold')),
            Paragraph(brand_model, _ps('c', fontSize=8)),
            Paragraph(spec,        _ps('c', fontSize=8, textColor=DGREY)),
            Paragraph(str(qty),    _ps('c', fontSize=8, alignment=TA_RIGHT, fontName='Helvetica-Bold')),
        ]

    if quote.panel:
        comp_rows.append(_cr('Solar Panel', f'{quote.panel.brand} {quote.panel.model}',
                             f'{quote.panel.wattage_wp}Wp per panel', quote.num_panels))
    if quote.generator:
        comp_rows.append(_cr('All-in-One ESS', f'{quote.generator.brand} {quote.generator.model}',
                             f'{quote.generator.power_kw}kW / {quote.generator.builtin_capacity_kwh or "—"}kWh', 1))
    if quote.inverter:
        num_inv = quote.num_inverters or 1
        comp_rows.append(_cr('Hybrid Inverter', f'{quote.inverter.brand} {quote.inverter.model}',
                             f'{quote.inverter.power_kw}kW each', num_inv))
    if quote.battery:
        num_bat = quote.num_batteries or 1
        comp_rows.append(_cr('Battery Storage', f'{quote.battery.brand} {quote.battery.model}',
                             f'{quote.battery.capacity_kwh}kWh each', num_bat))
    comp_rows.append(_cr('Cables & BOS',  'DC/AC cables, MC4, conduit, mounting hardware', '—', '—'))
    comp_rows.append(_cr('Installation',  'Professional installation & commissioning',     '—', '—'))

    comp_tbl = Table(comp_rows, colWidths=[CW * 0.22, CW * 0.32, CW * 0.30, CW * 0.16])
    comp_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1,  0), NAVY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, LGREY]),
        ('FONTSIZE',      (0, 0), (-1, -1), 8),
        ('LEADING',       (0, 0), (-1, -1), 12),
        ('TOPPADDING',    (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING',   (0, 0), (-1, -1), 6),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 6),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('LINEBELOW',     (0,  0), (-1,  0), 0, WHITE),
        ('LINEBELOW',     (0, -1), (-1, -1), 0.5, MGREY),
    ]))
    story.append(comp_tbl)
    story.append(Spacer(1, 8))

    # ── PAYMENT SUMMARY ───────────────────────────────────────────────────────
    story.append(_section_heading('PAYMENT SUMMARY'))

    pay_hrow = [
        Paragraph(t, _ps(f'ph{i}', fontSize=8, fontName='Helvetica-Bold', textColor=WHITE,
                         alignment=TA_RIGHT if i == 4 else TA_LEFT))
        for i, t in enumerate(['Date', 'Type', 'Method', 'Reference', 'Amount'])
    ]
    pay_rows = [pay_hrow]

    for p in payments:
        pay_rows.append([
            Paragraph(_date(p.payment_date),          _ps('p', fontSize=8)),
            Paragraph(p.get_payment_type_display(),   _ps('p', fontSize=8)),
            Paragraph(p.get_payment_method_display(), _ps('p', fontSize=8)),
            Paragraph(p.reference or '—',             _ps('p', fontSize=8, textColor=DGREY)),
            Paragraph(_fmt(p.amount_rwf),             _ps('p', fontSize=8, alignment=TA_RIGHT,
                                                          fontName='Helvetica-Bold', textColor=GREEN)),
        ])

    if not payments:
        pay_rows.append([
            Paragraph('No payments recorded yet', _ps('p', fontSize=8, textColor=DGREY)),
            '', '', '', '',
        ])

    pay_tbl = Table(pay_rows, colWidths=[CW * 0.14, CW * 0.17, CW * 0.16, CW * 0.24, CW * 0.29])
    pay_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1,  0), NAVY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, LGREY]),
        ('FONTSIZE',      (0, 0), (-1, -1), 8),
        ('LEADING',       (0, 0), (-1, -1), 12),
        ('TOPPADDING',    (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING',   (0, 0), (-1, -1), 6),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 6),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('LINEBELOW',     (0, -1), (-1, -1), 0.5, MGREY),
        ('SPAN',          (0,  1), (4,  1)) if not payments else ('NOSPLIT', (0, 0), (-1, -1)),
    ]))
    story.append(pay_tbl)
    story.append(Spacer(1, 3))

    # Totals block
    totals_data = [
        [Paragraph('Total System Value', _ps('tl', fontSize=9, textColor=DGREY)),
         Paragraph(_fmt(quote.total_price_rwf), _ps('tv', fontSize=9, alignment=TA_RIGHT, fontName='Helvetica-Bold'))],
        [Paragraph('Total Paid',          _ps('tl', fontSize=9, textColor=DGREY)),
         Paragraph(_fmt(total_paid),       _ps('tv', fontSize=9, alignment=TA_RIGHT, fontName='Helvetica-Bold', textColor=GREEN))],
    ]
    totals_tbl = Table(totals_data, colWidths=[CW * 0.71, CW * 0.29])
    totals_tbl.setStyle(TableStyle([
        ('TOPPADDING',    (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING',   (0, 0), (-1, -1), 6),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 6),
        ('LINEBELOW',     (0, -1), (-1, -1), 0.5, MGREY),
    ]))
    story.append(totals_tbl)

    # Balance due
    bal_color = RED if balance_due > 0 else GREEN
    bal_label = 'BALANCE DUE' if balance_due > 0 else '✓  FULLY PAID'
    bal_tbl = Table([[
        Paragraph(bal_label, _ps('bl', fontSize=11, fontName='Helvetica-Bold', textColor=WHITE)),
        Paragraph(_fmt(balance_due) if balance_due > 0 else '—',
                  _ps('bv', fontSize=11, fontName='Helvetica-Bold', textColor=WHITE, alignment=TA_RIGHT)),
    ]], colWidths=[CW * 0.71, CW * 0.29])
    bal_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), bal_color),
        ('TOPPADDING',    (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING',   (0, 0), (-1, -1), 10),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 10),
        ('ROUNDEDCORNERS', [3, 3, 3, 3]),
    ]))
    story.append(bal_tbl)
    story.append(Spacer(1, 8))

    # ── PAYMENT INSTRUCTIONS ──────────────────────────────────────────────────
    if balance_due > 0:
        story.append(_section_heading('PAYMENT INSTRUCTIONS'))
        parts = []
        if cfg.bank_name and cfg.bank_account:
            parts.append(f'Bank Transfer: {cfg.bank_account} – {cfg.bank_name}')
        if cfg.momo_number:
            label = f' ({cfg.momo_name})' if cfg.momo_name else ''
            parts.append(f'Mobile Money: {cfg.momo_number}{label}')
        default_instructions = (
            'Please settle the balance due via ' + ' or '.join(parts) + ' and send the payment confirmation to our office. Reference your quote number in the transaction.'
            if parts else
            'Please settle the balance due and send the payment confirmation to our office.'
        )
        instructions = cfg.payment_instructions or default_instructions
        box = Table([[
            Paragraph(instructions, _ps('pi', fontSize=9, textColor=NAVY, leading=14)),
        ]], colWidths=[CW])
        box.setStyle(TableStyle([
            ('BACKGROUND',    (0, 0), (-1, -1), AMBER_LIGHT),
            ('TOPPADDING',    (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING',   (0, 0), (-1, -1), 10),
            ('RIGHTPADDING',  (0, 0), (-1, -1), 10),
            ('LINEBELOW',     (0, 0), (-1, -1), 2, AMBER),
        ]))
        story.append(box)
        story.append(Spacer(1, 8))

    # ── HANDOVER NOTES ────────────────────────────────────────────────────────
    if installation.handover_notes:
        story.append(_section_heading('HANDOVER NOTES'))
        story.append(Paragraph(installation.handover_notes,
                                _ps('hn', fontSize=9, textColor=DGREY, leading=14, spaceAfter=8)))

    # ── ACTIVITY LOG ─────────────────────────────────────────────────────────
    if logs:
        story.append(_section_heading(f'ACTIVITY LOG  ({len(logs)} entries)'))

        log_rows = [[
            Paragraph('Date & Time', _ps('lh', fontSize=8, fontName='Helvetica-Bold', textColor=WHITE)),
            Paragraph('Logged By',   _ps('lh', fontSize=8, fontName='Helvetica-Bold', textColor=WHITE)),
            Paragraph('Note',        _ps('lh', fontSize=8, fontName='Helvetica-Bold', textColor=WHITE)),
        ]]
        for log in logs:
            log_rows.append([
                Paragraph(_datetime(log.created_at), _ps('ld', fontSize=8, textColor=DGREY)),
                Paragraph(
                    log.logged_by.get_full_name() if log.logged_by else '—',
                    _ps('lb', fontSize=8, fontName='Helvetica-Bold', textColor=NAVY),
                ),
                Paragraph(log.note or '', _ps('ln', fontSize=8, textColor=NAVY, leading=12)),
            ])

        log_tbl = Table(log_rows, colWidths=[CW * 0.20, CW * 0.20, CW * 0.60])
        log_tbl.setStyle(TableStyle([
            ('BACKGROUND',     (0, 0), (-1,  0), NAVY),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, LGREY]),
            ('FONTSIZE',       (0, 0), (-1, -1), 8),
            ('LEADING',        (0, 0), (-1, -1), 12),
            ('TOPPADDING',     (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING',  (0, 0), (-1, -1), 5),
            ('LEFTPADDING',    (0, 0), (-1, -1), 6),
            ('RIGHTPADDING',   (0, 0), (-1, -1), 6),
            ('VALIGN',         (0, 0), (-1, -1), 'TOP'),
            ('LINEBELOW',      (0, -1), (-1, -1), 0.5, MGREY),
            ('LINEBEFORE',     (2, 1), (2, -1), 1, AMBER),
        ]))
        story.append(log_tbl)
        story.append(Spacer(1, 8))

    # ── SIGNATURE BLOCK ───────────────────────────────────────────────────────
    story.append(_section_heading('ACKNOWLEDGEMENT'))
    rep_name = installation.created_by.get_full_name() if installation.created_by else cfg.company_name
    ack_tbl = Table([[
        Table([[
            Paragraph('CLIENT', _ps('ak', fontSize=7, fontName='Helvetica-Bold', textColor=DGREY, spaceAfter=2)),
            Paragraph(client.name, _ps('av', fontSize=11, fontName='Helvetica-Bold', textColor=NAVY)),
        ]], colWidths=[CW * 0.47]),
        Spacer(CW * 0.06, 1),
        Table([[
            Paragraph('COMPANY REPRESENTATIVE', _ps('ak', fontSize=7, fontName='Helvetica-Bold', textColor=DGREY, spaceAfter=2)),
            Paragraph(rep_name, _ps('av', fontSize=11, fontName='Helvetica-Bold', textColor=NAVY)),
            Paragraph(cfg.company_name, _ps('as', fontSize=8, textColor=DGREY)),
        ]], colWidths=[CW * 0.47]),
    ]], colWidths=[CW * 0.47, CW * 0.06, CW * 0.47])
    ack_tbl.setStyle(TableStyle([
        ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND',    (0, 0), (0,  0),  LGREY),
        ('BACKGROUND',    (2, 0), (2,  0),  LGREY),
        ('TOPPADDING',    (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING',   (0, 0), (-1, -1), 10),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 10),
        ('LINEBELOW',     (0, 0), (0,  0),  2, AMBER),
        ('LINEBELOW',     (2, 0), (2,  0),  2, AMBER),
    ]))
    story.append(ack_tbl)
    story.append(Spacer(1, 10))

    # ── FOOTER ────────────────────────────────────────────────────────────────
    story.append(HRFlowable(width=CW, thickness=1.5, color=AMBER, spaceAfter=4))
    story.append(Paragraph(
        f'<b>{cfg.company_name}</b>  ·  {cfg.company_phone or ""}  ·  '
        f'{cfg.company_email or ""}  ·  {cfg.company_website or ""}',
        _ps('ft', fontSize=7, textColor=DGREY, alignment=TA_CENTER, leading=10),
    ))
    story.append(Paragraph(
        f'<i>Generated on {_date(tz.now())}  ·  Ref: {quote.ref_number}</i>',
        _ps('fs', fontSize=6, textColor=HexColor('#9CA3AF'), alignment=TA_CENTER, spaceBefore=2),
    ))

    doc.build(story)
    buf.seek(0)
    return buf
