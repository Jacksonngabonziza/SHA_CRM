"""
Shared SolarHope Africa letterhead for all ReportLab PDF exports.
Draws logo, decorative solar-panel pattern, and branded footer on every page.
"""
import os
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4

NAVY  = HexColor('#091928')
GOLD  = HexColor('#EA9D13')
GREEN = HexColor('#71AA1F')
WHITE = HexColor('#FFFFFF')
LGREY = HexColor('#F5F5F5')
DGREY = HexColor('#64748B')

W, H = A4


def _draw_letterhead(canvas, doc):
    canvas.saveState()

    # ── LOGO (top-left) ───────────────────────────────────────────────────────
    from django.conf import settings as django_settings
    logo_path = os.path.join(django_settings.MEDIA_ROOT, 'products', 'logo_sha.png')
    if os.path.exists(logo_path):
        canvas.drawImage(
            logo_path,
            x=15*mm, y=H - 27*mm,
            width=46*mm, height=19*mm,
            preserveAspectRatio=True, anchor='sw', mask='auto',
        )

    # Tagline beneath logo
    canvas.setFont('Helvetica-Oblique', 7.5)
    canvas.setFillColor(NAVY)
    canvas.drawString(15*mm, H - 32*mm, 'Light Up Dreams, The Solar Way')

    # ── DECORATIVE BRACKET PATTERN (top-right) ───────────────────────────────
    # Series of Γ-shaped outlines (horizontal bar → vertical drop → small foot)
    # Heights decrease left → right, matching the SHA official letterhead
    heights_mm = [25, 22, 19, 16.5, 14, 12, 10, 8.5, 7]
    n_shapes   = len(heights_mm)
    pat_start  = W * 0.35          # starts just right of the logo
    pat_end    = W - 8 * mm        # 8 mm from right edge
    spacing    = (pat_end - pat_start) / n_shapes
    bar_w      = spacing * 0.80    # top bar is 80% of each slot
    foot_w     = 3.5 * mm
    top_y      = H - 6 * mm       # very close to the top of the page

    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(1.8)
    canvas.setLineCap(0)           # square/butt line caps

    for i, h_mm in enumerate(heights_mm):
        x     = pat_start + i * spacing
        bot_y = top_y - h_mm * mm

        p = canvas.beginPath()
        p.moveTo(x,                top_y)   # top-left of bar
        p.lineTo(x + bar_w,        top_y)   # → horizontal bar
        p.lineTo(x + bar_w,        bot_y)   # ↓ vertical drop
        p.lineTo(x + bar_w + foot_w, bot_y) # → small foot
        canvas.drawPath(p, fill=0, stroke=1)

    # ── FOOTER ────────────────────────────────────────────────────────────────
    # Double gold rule
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(2.5)
    canvas.line(15*mm, 25*mm, W - 15*mm, 25*mm)
    canvas.setLineWidth(1)
    canvas.line(15*mm, 22.5*mm, W - 15*mm, 22.5*mm)

    # Contact info
    canvas.setFont('Helvetica', 7.5)
    canvas.setFillColor(NAVY)
    canvas.drawString(15*mm, 16*mm, '+250 780 348 624 / +250 788 445 849')
    canvas.drawString(15*mm, 12*mm, 'Info@solarhopeafrica.com')
    canvas.setFillColor(GOLD)
    canvas.drawString(15*mm, 8*mm,  'www.solarhopeafrica.com')

    canvas.restoreState()


def build_pdf(buf, title, story, *, left=15, right=15, top=42, bottom=32):
    """
    Build a Platypus story into buf using the SHA letterhead on every page.
    Margins are in mm; defaults leave clearance for header (42 mm) and footer (32 mm).
    """
    from reportlab.platypus import SimpleDocTemplate

    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=left * mm, rightMargin=right * mm,
        topMargin=top  * mm, bottomMargin=bottom * mm,
        title=title,
    )
    doc.build(story, onFirstPage=_draw_letterhead, onLaterPages=_draw_letterhead)
    buf.seek(0)
    return buf
