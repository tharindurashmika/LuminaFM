"""
LuminaFM Enterprise CMMS & Decision Support Platform
Administrator & Reliability Engineer Guide Publisher (build_admin_guide.py)
Generates docs/user-manual/release/LuminaFM_Administrator_Guide.pdf
Tailored for Organization Administrators and Plant Reliability Engineers.
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

from build_pdf_manual import PdfManualBuilder, BASE_DIR, RELEASE_DIR

class AdminGuideCanvas(canvas.Canvas):
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
        self.drawString(36, 756, "LuminaFM™ Administrator Guide — Tenant Governance & Reliability Analytics")
        self.setFont("Helvetica", 7.5)
        self.drawRightString(576, 756, "Executive Edition v1.4")

        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(36, 750, 576, 750)

        # Footer
        self.line(36, 40, 576, 40)
        self.setFont("Helvetica", 7)
        self.drawString(36, 28, "Colombo Grand Luxury Hotel & Spa • Executive Governance Reference")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.setFont("Helvetica-Bold", 7.5)
        self.drawRightString(576, 28, page_str)

        self.restoreState()


def build_admin_guide():
    os.makedirs(RELEASE_DIR, exist_ok=True)
    out_pdf = os.path.join(RELEASE_DIR, "LuminaFM_Administrator_Guide.pdf")
    print("[Admin Guide Builder] Generating LuminaFM Administrator Guide PDF...")

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
        "<b>LUMINA FM™ • EXECUTIVE &amp; RELIABILITY ADMINISTRATOR GUIDE</b>",
        ParagraphStyle("AdminBadge", parent=builder.styles["Normal"], fontSize=10, leading=12, textColor=colors.HexColor("#4338ca"), alignment=1),
    ))
    story.append(Spacer(1, 15))
    story.append(Paragraph("Enterprise Governance, Asset Modeling &amp;<br/>Reliability Engineering Manual", builder.title_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Architectural &amp; Management Handbook for Organization Administrators and Plant Reliability Engineers: "
        "Multi-Tenant Postgres RLS Isolation, White-Label Customization, Kingsbury ANP Model Governance, "
        "Financial Cost Analytics, and Statutory ASME Compliance Auditing.",
        builder.subtitle_style,
    ))
    story.append(HRFlowable(width="80%", thickness=2, color=colors.HexColor("#4338ca"), spaceBefore=10, spaceAfter=20))

    meta_data = [
        [
            Paragraph("<b>Target Roles:</b>", builder.meta_style),
            Paragraph("Organization Admin, Plant Reliability Engineer", builder.meta_style),
            Paragraph("<b>Version:</b>", builder.meta_style),
            Paragraph("v1.4.0 (Executive Edition)", builder.meta_style),
        ],
        [
            Paragraph("<b>Governance Scope:</b>", builder.meta_style),
            Paragraph("ANP Baseline (CR &lt; 0.10), RLS Security", builder.meta_style),
            Paragraph("<b>Regulatory Tier:</b>", builder.meta_style),
            Paragraph("ASME Section I, IV &amp; NBIC Compliance", builder.meta_style),
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
        "<b>Notice:</b> This document contains proprietary architectural algorithms and statutory compliance audit procedures.",
        ParagraphStyle("AdminWarn", parent=builder.styles["Italic"], fontSize=8, leading=11, textColor=colors.HexColor("#475569"), alignment=1),
    ))
    story.append(PageBreak())

    # Selected Admin & Engineer Files
    admin_files = [
        ("1. Multi-Tenant Architecture & Postgres RLS Isolation", os.path.join(BASE_DIR, "04-role-based-guides", "01-organization-admin-guide.md")),
        ("2. Plant Reliability Engineering & Decision Framework", os.path.join(BASE_DIR, "04-role-based-guides", "02-plant-reliability-engineer-guide.md")),
        ("3. White-Label Branding, Crest Logos & Deployment Settings", os.path.join(BASE_DIR, "03-module-guides", "12-white-label-and-settings.md")),
        ("4. System Roles & Audited Permission Matrix", os.path.join(BASE_DIR, "07-reference", "permissions-matrix.md")),
        ("5. Asset Master Registry & Dynamic JSONB Specs", os.path.join(BASE_DIR, "03-module-guides", "02-asset-management.md")),
        ("6. Preventive Maintenance Planning & PM Calendar", os.path.join(BASE_DIR, "03-module-guides", "03-maintenance-planning.md")),
        ("7. Decision Support & Kingsbury Limit Supermatrix", os.path.join(BASE_DIR, "03-module-guides", "08-decision-support-and-reporting.md")),
        ("8. ANP Model Governance & Academic Baseline Validation", os.path.join(BASE_DIR, "03-module-guides", "11-decision-governance.md")),
        ("9. Maintenance Financial Cost Analysis", os.path.join(BASE_DIR, "03-module-guides", "10-maintenance-cost-analysis.md")),
        ("10. Immutable Audit Trail & ASME Evidence Vault", os.path.join(BASE_DIR, "03-module-guides", "09-audit-and-evidence-vault.md")),
        ("11. Non-Boiler Extensibility (Chiller Module & Isolation Guard)", os.path.join(BASE_DIR, "05-workflows", "17-chiller-extensibility-and-isolation.md")),
    ]

    for item_title, file_path in admin_files:
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                md_text = f.read()
            story.append(Paragraph(item_title, builder.h1_style))
            story.append(Spacer(1, 4))
            parsed = builder.parse_markdown(md_text, max_width=540)
            story.extend(parsed)
            story.append(PageBreak())

    doc.build(story, canvasmaker=AdminGuideCanvas)
    size = os.path.getsize(out_pdf)
    print(f"[Admin Guide Builder] Generated: {out_pdf} ({size:,} bytes)")
    return out_pdf, size

if __name__ == "__main__":
    build_admin_guide()
