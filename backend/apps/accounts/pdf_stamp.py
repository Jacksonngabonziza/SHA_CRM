"""
PDF stamp utilities for Solar Hope Africa documents.

Provides:
  draw_sha_stamp(canvas, cx, cy, co)  — low-level canvas draw
  SHAStampFlowable(co)               — inline Platypus Flowable
  StatusStampFlowable(text, color)   — oval status stamp Flowable
"""
import math
from reportlab.platypus import Flowable
from reportlab.lib.units import mm
from reportlab.lib import colors

STAMP_BLUE = colors.HexColor('#0A2472')


# ── Low-level canvas draw ──────────────────────────────────────────────────────

def draw_sha_stamp(c, cx, cy, co, radius=19):
    r = radius * mm

    name_text   = (co.company_name or 'SOLAR HOPE AFRICA').upper()
    tin_text    = f"Tin:{co.company_tin}"   if getattr(co, 'company_tin',  '') else ''
    phone_text  = f"Tel:{co.company_phone}" if getattr(co, 'company_phone', '') else ''
    bottom_text = 'Kigali - Rwanda'

    c.saveState()
    c.translate(cx, cy)
    c.setStrokeColor(STAMP_BLUE)
    c.setFillColor(STAMP_BLUE)

    # Outer circle
    c.setLineWidth(2.4)
    c.circle(0, 0, r, stroke=1, fill=0)
    # Inner ring
    c.setLineWidth(0.9)
    c.circle(0, 0, r - 3.2 * mm, stroke=1, fill=0)

    # Side dots
    dot_r = r - 1.6 * mm
    c.circle( dot_r, 0, 1.1 * mm, stroke=0, fill=1)
    c.circle(-dot_r, 0, 1.1 * mm, stroke=0, fill=1)

    # Sun icon
    sun_cy = 3 * mm
    sun_r  = 4.5 * mm
    c.setLineWidth(1.1)
    c.circle(0, sun_cy, sun_r, stroke=1, fill=0)
    c.circle(0, sun_cy, 1.1 * mm, stroke=0, fill=1)
    c.setLineWidth(0.9)
    for deg in range(0, 360, 45):
        rad = math.radians(deg)
        x1 = (sun_r + 1.2 * mm) * math.cos(rad)
        y1 = sun_cy + (sun_r + 1.2 * mm) * math.sin(rad)
        x2 = (sun_r + 3.0 * mm) * math.cos(rad)
        y2 = sun_cy + (sun_r + 3.0 * mm) * math.sin(rad)
        c.line(x1, y1, x2, y2)

    # TIN + phone
    c.setFont('Helvetica-Bold', 5.8)
    if tin_text:
        c.drawCentredString(0, -1.5 * mm, tin_text)
    if phone_text:
        c.drawCentredString(0, -4.2 * mm, phone_text)

    # Curved top text
    text_r    = r - 2.2 * mm
    arc_span  = 162
    start_deg = 90 + arc_span / 2
    n = len(name_text)
    c.setFont('Helvetica-Bold', 6.2)
    for i, ch in enumerate(name_text):
        angle = start_deg - (i / max(n - 1, 1)) * arc_span
        rad   = math.radians(angle)
        x = text_r * math.cos(rad)
        y = text_r * math.sin(rad)
        c.saveState()
        c.translate(x, y)
        c.rotate(angle - 90)
        c.drawCentredString(0, 0, ch)
        c.restoreState()

    # Curved bottom text
    arc_span_b  = 115
    start_deg_b = -(90 + arc_span_b / 2)
    nb = len(bottom_text)
    c.setFont('Helvetica', 5.8)
    for i, ch in enumerate(bottom_text):
        angle = start_deg_b + (i / max(nb - 1, 1)) * arc_span_b
        rad   = math.radians(angle)
        x = text_r * math.cos(rad)
        y = text_r * math.sin(rad)
        c.saveState()
        c.translate(x, y)
        c.rotate(angle + 90)
        c.drawCentredString(0, 0, ch)
        c.restoreState()

    c.restoreState()


def draw_oval_stamp(c, cx, cy, text, color, w=32*mm, h=14*mm):
    """Draw a rotated oval status stamp centred at (cx, cy)."""
    c.saveState()
    c.translate(cx, cy)
    c.rotate(-18)
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(2.5)
    c.ellipse(-w/2, -h/2, w/2, h/2, stroke=1, fill=0)
    c.setLineWidth(1)
    c.ellipse(-w/2 + 3, -h/2 + 3, w/2 - 3, h/2 - 3, stroke=1, fill=0)
    font_size = 12 if len(text) <= 8 else 8.5
    c.setFont('Helvetica-Bold', font_size)
    c.drawCentredString(0, -font_size / 2 + 1, text)
    c.restoreState()


# ── Inline Platypus Flowables ─────────────────────────────────────────────────

class SHAStampFlowable(Flowable):
    """Inline company stamp — use inside a Table cell."""
    def __init__(self, co, size_mm=40):
        super().__init__()
        self.co      = co
        self.width   = size_mm * mm
        self.height  = size_mm * mm
        self._radius = size_mm / 2 * 0.88   # leave a small margin

    def draw(self):
        draw_sha_stamp(self.canv, self.width / 2, self.height / 2,
                       self.co, radius=self._radius)


class StatusStampFlowable(Flowable):
    """Inline oval status stamp — use inside a Table cell."""
    def __init__(self, text, color, w_mm=56, h_mm=40):
        super().__init__()
        self.text   = text
        self.color  = color
        self.width  = w_mm * mm
        self.height = h_mm * mm

    def draw(self):
        draw_oval_stamp(
            self.canv,
            cx=self.width / 2,
            cy=self.height / 2,
            text=self.text,
            color=self.color,
            w=46 * mm,
            h=18 * mm,
        )
