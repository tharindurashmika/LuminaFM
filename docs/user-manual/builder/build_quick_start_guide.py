"""
LuminaFM Enterprise CMMS & Decision Support Platform
Quick Start Field Guide Publisher (build_quick_start_guide.py)
Generates docs/user-manual/release/LuminaFM_Quick_Start_Guide.pdf
Tailored for Boiler Plant Operators and Maintenance Technicians.
"""

import os
from PIL import Image as PILImage

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Image,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from build_pdf_manual import PdfManualBuilder, NumberedCanvas, BASE_DIR, RELEASE_DIR

class QuickStartCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_decorations(self, page_count):
        if self._pageNumber == 1:
            return

        self.saveState()
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#475569"))

        # Header
        self.drawString(36, 756, "LuminaFM™ Quick Start Guide — Plant Floor & Field Operations")
        self.setFont("Helvetica", 7.5)
        self.drawRightString(576, 756, "Field Edition v1.4")

        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(36, 750, 576, 750)

        # Footer
        self.line(36, 40, 576, 40)
        self.setFont("Helvetica", 7)
        self.drawString(36, 28, "Colombo Grand Luxury Hotel & Spa • Operator & Technician Field Reference")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.setFont("Helvetica-Bold", 7.5)
        self.drawRightString(576, 28, page_str)

        self.restoreState()


def build_quick_start_guide():
    os.makedirs(RELEASE_DIR, exist_ok=True)
    out_pdf = os.path.join(RELEASE_DIR, "LuminaFM_Quick_Start_Guide.pdf")
    print("[Quick Start Builder] Generating LuminaFM Quick Start Guide PDF...")

    builder = PdfManualBuilder()
    doc = SimpleDocTemplate(
        out_pdf,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=54,
        bottomMargin=54,
    )

    story = []

    # 1. Cover Page
    story.append(Spacer(1, 30))
    story.append(Paragraph(
        "<b>LUMINA FM™ • FIELD OPERATIONAL QUICK START GUIDE</b>",
        ParagraphStyle("QSBadge", parent=builder.styles["Normal"], fontSize=10, leading=12, textColor=colors.HexColor("#d97706"), alignment=1),
    ))
    story.append(Spacer(1, 15))
    story.append(Paragraph("Plant Floor Operations &amp;<br/>Technician Field Manual", builder.title_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Standard Operating Procedures for Boiler Plant Operators and Maintenance Technicians: "
        "Shift Logging, Glove-Mode Telemetry Entry, Work Order Execution, Offline Sync, and Safety Rocker Checks.",
        builder.subtitle_style,
    ))
    story.append(HRFlowable(width="80%", thickness=2, color=colors.HexColor("#d97706"), spaceBefore=10, spaceAfter=20))

    meta_data = [
        [
            Paragraph("<b>Target Roles:</b>", builder.meta_style),
            Paragraph("Boiler Plant Operator, Maintenance Technician", builder.meta_style),
            Paragraph("<b>Version:</b>", builder.meta_style),
            Paragraph("v1.4.0 (Field Edition)", builder.meta_style),
        ],
        [
            Paragraph("<b>Core Focus:</b>", builder.meta_style),
            Paragraph("Work Orders, Daily Logbook, Floor Kiosk", builder.meta_style),
            Paragraph("<b>Hardware Scope:</b>", builder.meta_style),
            Paragraph("Handheld Tablets (Portrait) & Desk Mounts", builder.meta_style),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[110, 160, 110, 160])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 30))
    story.append(Paragraph(
        "<b>Important:</b> Keep this guide readily accessible in the boiler control room and on inspection carts.",
        ParagraphStyle("QSWarn", parent=builder.styles["Italic"], fontSize=8, leading=11, textColor=colors.HexColor("#475569"), alignment=1),
    ))
    story.append(PageBreak())

    # Selected Quick Start Files
    qs_files = [
        ("1. Fast Sign-In & Role Switching", os.path.join(BASE_DIR, "02-account-and-navigation", "login.md")),
        ("2. Shell Navigation & Touch Controls", os.path.join(BASE_DIR, "02-account-and-navigation", "navigation.md")),
        ("3. Work Order Execution & Resource Tracking", os.path.join(BASE_DIR, "03-module-guides", "04-work-orders.md")),
        ("4. Daily Shift Boiler Logbook", os.path.join(BASE_DIR, "03-module-guides", "06-boiler-management.md")),
        ("5. Industrial Floor Operator Tablet Kiosk", os.path.join(BASE_DIR, "03-module-guides", "07-floor-operator-kiosk.md")),
        ("6. Glove Ergonomics & Offline Sync Engine", os.path.join(BASE_DIR, "08-device-guides", "05-industrial-kiosk-ergonomics.md")),
        ("7. Offline Synchronization Recovery & Diagnostics", os.path.join(BASE_DIR, "06-troubleshooting", "03-offline-sync-and-network.md")),
        ("8. Quick Navigation & Shortcuts", os.path.join(BASE_DIR, "07-reference", "quick-navigation-reference.md")),
    ]

    for item_title, file_path in qs_files:
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                md_text = f.read()
            story.append(Paragraph(item_title, builder.h1_style))
            story.append(Spacer(1, 4))
            parsed = builder.parse_markdown(md_text, max_width=540)
            story.extend(parsed)
            story.append(PageBreak())

    doc.build(story, canvasmaker=QuickStartCanvas)
    size = os.path.getsize(out_pdf)
    print(f"[Quick Start Builder] Generated: {out_pdf} ({size:,} bytes)")
    return out_pdf, size

if __name__ == "__main__":
    build_quick_start_guide()
