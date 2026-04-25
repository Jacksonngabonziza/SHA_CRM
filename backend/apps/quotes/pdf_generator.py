from io import BytesIO
from decimal import Decimal
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY

# Brand colors
NAVY    = HexColor('#091928')
AMBER   = HexColor('#EA9D13')
GREEN   = HexColor('#71AA1F')
LGREY   = HexColor('#F5F5F5')
DGREY   = HexColor('#64748B')
WHITE   = HexColor('#FFFFFF')

W, H = A4

def PS(name, **kw):
    return ParagraphStyle(name, fontName='Helvetica', **kw)


def generate_quote_pdf(quote) -> BytesIO:
    from apps.accounts.models import CompanySettings
    cfg = CompanySettings.get()

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=15*mm, rightMargin=15*mm,
        topMargin=12*mm, bottomMargin=15*mm,
        title=f"Quote {quote.ref_number}",
    )

    CW = W - 30*mm
    story = []

    # ── HEADER ────────────────────────────────────────────────────────────────
    header_data = [[
        Paragraph(
            f'<font color="#091928"><b>{cfg.company_name}</b></font>',
            PS('Logo', fontSize=22, leading=26)
        ),
        Paragraph(
            f'<font color="#64748B"><i>{cfg.company_tagline}</i></font><br/>'
            f'<font color="#091928">{cfg.company_phone}</font><br/>'
            f'<font color="#091928">{cfg.company_email}</font><br/>'
            f'<font color="#091928">{cfg.company_website}</font>',
            PS('Contact', fontSize=9, leading=14, alignment=TA_RIGHT)
        ),
    ]]
    ht = Table(header_data, colWidths=[CW*0.5, CW*0.5])
    ht.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(ht)
    story.append(HRFlowable(width='100%', thickness=3, color=AMBER, spaceAfter=6))
    story.append(HRFlowable(width='100%', thickness=1.5, color=GREEN, spaceAfter=10))

    # ── QUOTE TITLE ───────────────────────────────────────────────────────────
    story.append(Paragraph(
        '<b>SOLAR SYSTEM QUOTATION</b>',
        PS('Title', fontSize=16, textColor=NAVY, alignment=TA_CENTER, spaceAfter=2)
    ))
    story.append(Paragraph(
        f'Reference: <b>{quote.ref_number}</b>   |   '
        f'Date: <b>{quote.created_at.strftime("%d %B %Y")}</b>   |   '
        f'Valid Until: <b>{quote.valid_until.strftime("%d %B %Y") if quote.valid_until else "—"}</b>',
        PS('Ref', fontSize=9, textColor=DGREY, alignment=TA_CENTER, spaceAfter=12)
    ))

    # ── CLIENT INFO ───────────────────────────────────────────────────────────
    client = quote.client
    client_data = [
        [_header_cell('CLIENT INFORMATION'), ''],
        [_label('Name'), _value(client.name)],
        [_label('Phone'), _value(client.phone)],
        [_label('Email'), _value(client.email or '—')],
        [_label('Location'), _value(client.location or '—')],
        [_label('Type'), _value(client.get_client_type_display())],
        [_label('Grid Connected'), _value('Off-Grid' if client.is_offgrid else 'On-Grid')],
    ]
    if client.monthly_bill_rwf:
        client_data.append([_label('Monthly Bill'), _value(f'RWF {client.monthly_bill_rwf:,.0f}')])

    ct = _section_table(client_data, CW)
    story.append(ct)
    story.append(Spacer(1, 8))

    # ── LOAD SUMMARY ──────────────────────────────────────────────────────────
    if quote.appliances.exists():
        load_rows = [[
            _th('Appliance'), _th('Qty'), _th('Watts'), _th('Hrs/Day'), _th('kWh/Day')
        ]]
        for a in quote.appliances.all():
            load_rows.append([
                _td(a.name), _td(str(a.quantity)),
                _td(f'{a.wattage}W'), _td(str(a.hours_per_day)),
                _td(f'{a.daily_kwh:.2f}'),
            ])
        load_rows.append([
            Paragraph('<b>TOTAL</b>', PS('T', fontSize=9, textColor=NAVY)),
            '', '', '',
            Paragraph(f'<b>{quote.total_daily_kwh:.2f} kWh</b>',
                      PS('T', fontSize=9, textColor=AMBER)),
        ])

        lt = Table(load_rows, colWidths=[CW*0.35, CW*0.1, CW*0.15, CW*0.15, CW*0.25])
        lt.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), NAVY),
            ('TEXTCOLOR', (0,0), (-1,0), WHITE),
            ('BACKGROUND', (0,-1), (-1,-1), HexColor('#FFF8E7')),
            ('ROWBACKGROUNDS', (0,1), (-1,-2), [WHITE, HexColor('#F8F9FA')]),
            ('GRID', (0,0), (-1,-1), 0.5, HexColor('#E2E8F0')),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
        ]))

        story.append(Paragraph('<b>LOAD SUMMARY</b>',
            PS('SH', fontSize=10, textColor=NAVY, spaceBefore=4, spaceAfter=4)))
        story.append(lt)
        story.append(Spacer(1, 8))

    # ── SYSTEM DESIGN ─────────────────────────────────────────────────────────
    sys_data = [
        [_header_cell('PROPOSED SOLAR SYSTEM'), ''],
        [_label('Total System Size'), _value(f'{quote.system_size_kwp:.2f} kWp')],
        [_label('Number of Solar Panels'), _value(f'{quote.num_panels} pcs')],
        *([[_label('Number of Inverters'), _value(f'{quote.num_inverters} units')]] if (quote.num_inverters or 1) > 1 else []),
        [_label('Daily Generation (est.)'), _value(f'{float(quote.system_size_kwp) * float(quote.peak_sun_hours):.1f} kWh')],
        [_label('Battery Backup'), _value(f'{quote.backup_hours}h autonomy')],
        [_label('Peak Sun Hours (Rwanda)'), _value(f'{quote.peak_sun_hours}h/day')],
        [_label('Self-Sufficiency'), _value(f'{min(100, round(float(quote.system_size_kwp)*float(quote.peak_sun_hours)/float(quote.total_daily_kwh)*100 if quote.total_daily_kwh else 0))}%')],
    ]
    story.append(_section_table(sys_data, CW))
    story.append(Spacer(1, 8))

    # ── COMPONENTS ────────────────────────────────────────────────────────────
    comp_rows = _build_comp_rows(quote)

    ct2 = Table(comp_rows, colWidths=[CW*0.22, CW*0.30, CW*0.16, CW*0.12, CW*0.20])
    ct2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('TEXTCOLOR', (0,0), (-1,0), WHITE),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, HexColor('#F8F9FA')]),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))

    story.append(Paragraph('<b>SYSTEM COMPONENTS</b>',
        PS('SH', fontSize=10, textColor=NAVY, spaceBefore=4, spaceAfter=4)))
    story.append(ct2)
    story.append(Spacer(1, 8))

    # ── PRICING ───────────────────────────────────────────────────────────────
    price_rows = _build_price_rows(quote)
    pt = Table(price_rows, colWidths=[CW*0.6, CW*0.4])
    pt.setStyle(TableStyle([
        ('ROWBACKGROUNDS', (0,0), (-1,-1), [WHITE, HexColor('#F8F9FA')]),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))

    total_row = Table([[
        Paragraph('<b>TOTAL INVESTMENT</b>',
                  PS('TL', fontSize=12, textColor=WHITE)),
        Paragraph(f'<b>RWF {quote.total_price_rwf:,.0f}</b>',
                  PS('TV', fontSize=12, textColor=WHITE, alignment=TA_RIGHT)),
    ]], colWidths=[CW*0.6, CW*0.4])
    total_row.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), NAVY),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))

    story.append(Paragraph('<b>PRICING SUMMARY</b>',
        PS('SH', fontSize=10, textColor=NAVY, spaceBefore=4, spaceAfter=4)))
    story.append(pt)
    story.append(total_row)
    story.append(Spacer(1, 8))

    # ── SAVINGS ───────────────────────────────────────────────────────────────
    savings_data = [
        [_header_cell('RETURN ON INVESTMENT'), ''],
        [_label('Annual Electricity Savings'), _value(f'RWF {quote.annual_savings_rwf:,.0f}/year')],
        [_label('Static Payback Period'), _value(f'{quote.payback_years} Years')],
        [_label('Grid Tariff Used'), _value(f'RWF {quote.grid_tariff_rwf_kwh}/kWh')],
        [_label('System Lifespan'), _value(cfg.system_lifespan or '25–30 years')],
    ]
    story.append(_section_table(savings_data, CW))
    story.append(Spacer(1, 10))

    # ── NOTES ─────────────────────────────────────────────────────────────────
    if quote.notes:
        story.append(Paragraph('<b>NOTES</b>',
            PS('SH', fontSize=10, textColor=NAVY, spaceAfter=4)))
        story.append(Paragraph(quote.notes,
            PS('N', fontSize=9, textColor=DGREY, leading=14)))
        story.append(Spacer(1, 8))

    # ── TERMS ─────────────────────────────────────────────────────────────────
    if cfg.quote_terms:
        story.append(Paragraph('<b>TERMS & CONDITIONS</b>',
            PS('SH', fontSize=10, textColor=NAVY, spaceAfter=4)))
        story.append(Paragraph(cfg.quote_terms,
            PS('T', fontSize=8, textColor=DGREY, leading=12)))
        story.append(Spacer(1, 8))

    # ── FOOTER ────────────────────────────────────────────────────────────────
    story.append(HRFlowable(width='100%', thickness=1.5, color=GREEN, spaceBefore=10, spaceAfter=4))
    story.append(HRFlowable(width='100%', thickness=3, color=AMBER, spaceAfter=6))
    story.append(Paragraph(
        f'This quotation is valid for the period stated above. Prices are subject to change after expiry. '
        f'For queries contact us at {cfg.company_email} or {cfg.company_phone}.',
        PS('Footer', fontSize=8, textColor=DGREY, alignment=TA_CENTER, leading=12)
    ))
    story.append(Paragraph(
        f'<b>{cfg.company_name.upper()}</b> · <i>{cfg.company_tagline}</i>',
        PS('Footer2', fontSize=8, textColor=NAVY, alignment=TA_CENTER, spaceBefore=4)
    ))

    doc.build(story)
    buf.seek(0)
    return buf


# ── Helpers ──────────────────────────────────────────────────────────────────
def _header_cell(text):
    return Paragraph(f'<b>{text}</b>',
        ParagraphStyle('HC', fontName='Helvetica-Bold', fontSize=9,
                       textColor=WHITE, leading=12))

def _label(text):
    return Paragraph(text,
        ParagraphStyle('L', fontName='Helvetica', fontSize=9, textColor=DGREY, leading=13))

def _value(text):
    return Paragraph(f'<b>{text}</b>',
        ParagraphStyle('V', fontName='Helvetica-Bold', fontSize=9, textColor=NAVY, leading=13))

def _price(val):
    return Paragraph(f'RWF {float(val):,.0f}',
        ParagraphStyle('P', fontName='Helvetica', fontSize=9,
                       textColor=NAVY, leading=13, alignment=TA_RIGHT))

def _th(text):
    return Paragraph(f'<b>{text}</b>',
        ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8.5,
                       textColor=WHITE, leading=12))

def _td(text):
    return Paragraph(str(text),
        ParagraphStyle('TD', fontName='Helvetica', fontSize=8.5,
                       textColor=NAVY, leading=12))

def _build_comp_rows(quote):
    rows = [[_th('Component'), _th('Brand / Model'), _th('Spec'), _th('Qty'), _th('Warranty')]]
    if quote.panel:
        rows.append([
            _td('Solar Panels'), _td(f'{quote.panel.brand} {quote.panel.model}'),
            _td(f'{quote.panel.wattage_wp}Wp'), _td(str(quote.num_panels)),
            _td(f'{quote.panel.warranty_years}yr'),
        ])
    if quote.generator:
        gen = quote.generator
        kwh_part = f' / {gen.capacity_kwh}kWh' if gen.capacity_kwh else ''
        rows.append([
            _td('All-in-One Generator'), _td(f'{gen.brand} {gen.model}'),
            _td(f'{gen.power_kw}kW{kwh_part}'), _td('1'),
            _td(f'{gen.warranty_years}yr'),
        ])
    if quote.inverter:
        num_inv = quote.num_inverters or 1
        inv_spec = f'{quote.inverter.power_kw}kW'
        if num_inv > 1:
            inv_spec += f' each ({num_inv * quote.inverter.power_kw}kW total)'
        rows.append([
            _td('Hybrid Inverter'), _td(f'{quote.inverter.brand} {quote.inverter.model}'),
            _td(inv_spec), _td(str(num_inv)),
            _td(f'{quote.inverter.warranty_years}yr'),
        ])
    if quote.battery:
        num_bat = quote.num_batteries or 1
        bat_spec = f'{quote.battery.capacity_kwh}kWh'
        if num_bat > 1:
            bat_spec += f' each ({num_bat * quote.battery.capacity_kwh}kWh total)'
        rows.append([
            _td('Battery Storage'), _td(f'{quote.battery.brand} {quote.battery.model}'),
            _td(bat_spec), _td(str(num_bat)),
            _td(f'{quote.battery.warranty_years}yr'),
        ])
    rows.append([_td('Cables & BOS'), _td('DC/AC cables, mounting, connectors'), _td('—'), _td('—'), _td('—')])
    rows.append([_td('Installation'), _td('Professional installation & commissioning'), _td('—'), _td('—'), _td('—')])
    return rows


def _build_price_rows(quote):
    rows = [[_label('Solar Panels'), _price(quote.panels_cost)]]
    if quote.is_all_in_one_mode:
        rows.append([_label('All-in-One Generator'), _price(quote.generator_cost)])
    else:
        rows.append([_label('Inverter'), _price(quote.inverter_cost)])
        rows.append([_label('Battery Storage'), _price(quote.battery_cost)])
    rows += [
        [_label('Cables & BOS'), _price(quote.accessories_cost)],
        [_label('Installation'), _price(quote.installation_cost)],
    ]
    return rows


def _section_table(data, cw):
    t = Table(data, colWidths=[cw*0.4, cw*0.6])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('SPAN', (0,0), (-1,0)),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, HexColor('#F8F9FA')]),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('LINEBEFORE', (0,0), (0,-1), 3, AMBER),
    ]))
    return t
