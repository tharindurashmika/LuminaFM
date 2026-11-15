#!/usr/bin/env python3
"""
LuminaFM Concept & Expert Review Document Generator
Generates:
1. docs/LuminaFM_FM_Expert_Concept_Brief.pdf (via ReportLab)
2. docs/LuminaFM_FM_Expert_Concept_Brief.docx (via python-docx)
"""

import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "docs"))
os.makedirs(OUTPUT_DIR, exist_ok=True)
PDF_PATH = os.path.join(OUTPUT_DIR, "LuminaFM_FM_Expert_Concept_Brief.pdf")
DOCX_PATH = os.path.join(OUTPUT_DIR, "LuminaFM_FM_Expert_Concept_Brief.docx")

# Color Palette
NAVY = colors.HexColor("#0F294A")       # Primary Header
SLATE_BLUE = colors.HexColor("#1E40AF") # Secondary Section
GOLD = colors.HexColor("#B45309")       # Accent Gold
CHARCOAL = colors.HexColor("#1F2937")   # Body text
MUTED = colors.HexColor("#4B5563")      # Captions/Muted
BG_LIGHT = colors.HexColor("#F8FAFC")   # Callout background
BORDER_LIGHT = colors.HexColor("#E2E8F0")
ACCENT_BG = colors.HexColor("#EFF6FF")  # Soft blue tint

class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and stamp total page count."""
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, total_pages):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (Pages 2+)
        if self._pageNumber > 1:
            self.drawString(46, 802, "LuminaFM: A Smarter Approach to Facility Maintenance Management")
            self.drawRightString(595.27 - 46, 802, "Expert Concept & Strategic Review Brief")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.6)
            self.line(46, 796, 595.27 - 46, 796)

        # Footer (All Pages)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.6)
        self.line(46, 42, 595.27 - 46, 42)
        
        self.drawString(46, 30, "LuminaFM Concept Brief | Confidential - For FM Expert Review Only")
        page_str = f"Page {self._pageNumber} of {total_pages}"
        self.drawRightString(595.27 - 46, 30, page_str)
        
        self.restoreState()


def create_pdf():
    doc = SimpleDocTemplate(
        PDF_PATH,
        pagesize=A4,
        leftMargin=44,
        rightMargin=44,
        topMargin=46,
        bottomMargin=46
    )

    styles = getSampleStyleSheet()

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=NAVY,
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=SLATE_BLUE,
        spaceAfter=12
    )
    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=NAVY,
        spaceBefore=0,
        spaceAfter=8,
        keepWithNext=True
    )
    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=SLATE_BLUE,
        spaceBefore=6,
        spaceAfter=4,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.8,
        leading=12.2,
        textColor=CHARCOAL,
        spaceAfter=6
    )
    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    bullet_style = ParagraphStyle(
        'Bullet',
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3.5
    )
    callout_style = ParagraphStyle(
        'Callout',
        parent=body_style,
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=11.8,
        textColor=NAVY
    )
    meta_label = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=NAVY
    )
    meta_val = ParagraphStyle(
        'MetaVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=CHARCOAL
    )
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=10.5,
        textColor=CHARCOAL
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.8,
        leading=10.5,
        textColor=NAVY
    )
    table_cell_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.white
    )

    story = []

    # =========================================================================
    # PAGE 1: INTRODUCING LUMINAFM
    # =========================================================================
    story.append(Paragraph("LuminaFM: A Smarter Approach to Facility Maintenance Management", title_style))
    story.append(Paragraph("A Concept & Vision Brief for Facility Management Professionals", subtitle_style))

    # Meta Table Box
    meta_data = [
        [
            Paragraph("<b>Target Audience:</b> Senior Facility Managers, Chief Engineers, Operations Directors", meta_label),
            Paragraph("<b>Project Phase:</b> Concept Validation & Expert Consultation", meta_label)
        ],
        [
            Paragraph("<b>Document Purpose:</b> Professional Review & Feedback", meta_label),
            Paragraph("<b>Scope:</b> Core CMMS Architecture & Specialized Boiler Intelligence", meta_label)
        ]
    ]
    t_meta = Table(meta_data, colWidths=[270, 237])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER_LIGHT),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_LIGHT),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 10))

    story.append(Paragraph("1. Introducing LuminaFM", h1_style))
    story.append(Paragraph(
        "<b>LuminaFM</b> is being developed as a modern, practical software platform designed specifically for facility and maintenance teams. Its primary purpose is to help organizations manage their physical buildings, facilities, equipment, daily maintenance routines, and technical personnel within a single, well-organized system.",
        body_style
    ))
    story.append(Paragraph(
        "In many commercial and industrial facilities today, critical maintenance information remains fragmented. Equipment manuals sit in forgotten filing cabinets, daily operating logs are scribbled into paper notebooks, preventive maintenance schedules live in isolated spreadsheets, and emergency repairs are coordinated through chaotic phone calls and messaging chats. When an asset breaks down, maintenance supervisors often have to reconstruct its history from memory or sift through stacks of weathered paper.",
        body_style
    ))
    story.append(Paragraph(
        "LuminaFM aims to replace this scattered approach with a unified, transparent digital workspace that brings maintenance information and daily activities into one structured platform.",
        body_style
    ))
    story.append(Spacer(1, 6))

    # Visual Flow Diagram Table
    story.append(Paragraph("<b>The Operational Flow: From Physical Buildings to Better Decisions</b>", h2_style))
    flow_data = [
        [
            Paragraph("<b>1. Organization</b><br/><font size='6.8' color='#4B5563'>Companies, Owners & FM Teams</font>", table_cell_bold),
            Paragraph("<b>&rarr;</b>", ParagraphStyle('Arr', parent=body_style, fontName='Helvetica-Bold', fontSize=12, alignment=1, textColor=GOLD)),
            Paragraph("<b>2. Facilities</b><br/><font size='6.8' color='#4B5563'>Buildings, Plants & Utility Rooms</font>", table_cell_bold),
            Paragraph("<b>&rarr;</b>", ParagraphStyle('Arr', parent=body_style, fontName='Helvetica-Bold', fontSize=12, alignment=1, textColor=GOLD)),
            Paragraph("<b>3. Equipment</b><br/><font size='6.8' color='#4B5563'>Boilers, Chillers, Pumps, AHUs</font>", table_cell_bold),
        ],
        [
            Paragraph("<b>&darr;</b>", ParagraphStyle('Arr', parent=body_style, fontName='Helvetica-Bold', fontSize=12, alignment=1, textColor=GOLD)),
            Paragraph("", table_cell),
            Paragraph("", table_cell),
            Paragraph("", table_cell),
            Paragraph("<b>&darr;</b>", ParagraphStyle('Arr', parent=body_style, fontName='Helvetica-Bold', fontSize=12, alignment=1, textColor=GOLD)),
        ],
        [
            Paragraph("<b>6. Better Decisions</b><br/><font size='6.8' color='#4B5563'>Extended Life, Safety & Low Cost</font>", table_cell_bold),
            Paragraph("<b>&larr;</b>", ParagraphStyle('Arr', parent=body_style, fontName='Helvetica-Bold', fontSize=12, alignment=1, textColor=GOLD)),
            Paragraph("<b>5. Structured Info</b><br/><font size='6.8' color='#4B5563'>Service History, Trends & Alarms</font>", table_cell_bold),
            Paragraph("<b>&larr;</b>", ParagraphStyle('Arr', parent=body_style, fontName='Helvetica-Bold', fontSize=12, alignment=1, textColor=GOLD)),
            Paragraph("<b>4. Maintenance</b><br/><font size='6.8' color='#4B5563'>Inspections, PM & Repairs</font>", table_cell_bold),
        ]
    ]
    t_flow = Table(flow_data, colWidths=[120, 20, 120, 20, 120], hAlign='CENTER')
    t_flow.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), BG_LIGHT),
        ('BACKGROUND', (2,0), (2,0), BG_LIGHT),
        ('BACKGROUND', (4,0), (4,0), BG_LIGHT),
        ('BACKGROUND', (0,2), (0,2), ACCENT_BG),
        ('BACKGROUND', (2,2), (2,2), BG_LIGHT),
        ('BACKGROUND', (4,2), (4,2), BG_LIGHT),
        ('BOX', (0,0), (0,0), 1, BORDER_LIGHT),
        ('BOX', (2,0), (2,0), 1, BORDER_LIGHT),
        ('BOX', (4,0), (4,0), 1, BORDER_LIGHT),
        ('BOX', (0,2), (0,2), 1.5, SLATE_BLUE),
        ('BOX', (2,2), (2,2), 1, BORDER_LIGHT),
        ('BOX', (4,2), (4,2), 1, BORDER_LIGHT),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_flow)
    story.append(Spacer(1, 8))

    story.append(Paragraph("The Core Philosophy: Shifting from Reactive Chaos to Proactive Clarity", h2_style))
    story.append(Paragraph(
        "The fundamental vision behind LuminaFM is that <b>maintenance should not be reactive guesswork</b>. Every piece of equipment tells a continuous operational story through its temperatures, pressures, running hours, and subtle physical symptoms. When this operational information is recorded consistently and connected directly to maintenance work orders, maintenance leaders gain the clarity needed to protect building occupants, prevent costly breakdowns, and extend asset longevity.",
        body_style
    ))

    # Page 1 Callout
    p1_box = [
        [Paragraph(
            "<b>Key Insight for FM Professionals:</b> LuminaFM is not another complex generic database. It is built from the ground up around the physical realities of equipment rooms, plant operators, and the critical decisions facility managers must make every day.",
            callout_style
        )]
    ]
    t_p1 = Table(p1_box, colWidths=[507])
    t_p1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, GOLD),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_p1)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: THE PROBLEMS WE WANT TO SOLVE
    # =========================================================================
    story.append(Paragraph("2. The Problems We Want to Solve", h1_style))
    story.append(Paragraph(
        "Facility managers and maintenance engineers face demanding daily operational responsibilities. Keeping complex facilities running smoothly, safely, and cost-effectively requires balancing dozens of competing priorities. Through industry observation and field research, we have identified several common operational challenges that LuminaFM aims to address:",
        body_style
    ))
    story.append(Spacer(1, 4))

    challenges = [
        ("Scattered and Fragile Maintenance Records", "Maintenance logs, equipment manuals, past repair notes, and compliance certificates are frequently distributed across physical binders, loose paper sheets, and disconnected spreadsheets. Important historical records are easily lost, misplaced, or physically damaged."),
        ("Difficulty Tracking Equipment History", "When a critical machine malfunctions, technicians rarely have immediate access to its full history. Knowing when it was last overhauled, what parts were replaced, who performed the work, and whether the same symptom occurred six months ago requires tedious manual investigation."),
        ("Preventive Maintenance Being Missed", "When preventive maintenance schedules rely on memory, wall calendars, or static spreadsheets, routine inspections and filter changes can easily be postponed or forgotten during busy operational periods—eventually triggering preventable equipment breakdowns."),
        ("Manual and Disjointed Work Coordination", "Work requests, job assignments, and progress updates are frequently handled verbally or through informal messaging chats. Without a centralized tracking board, managers struggle to know which jobs are active, which are delayed, and which have been properly verified."),
        ("Delayed Response to Equipment Problems", "Machines rarely fail without warning. An unusual vibration, a slight temperature rise, or a drop in operating pressure usually precedes a breakdown. When shift logs are kept on paper, these warning trends remain invisible until the equipment suddenly stops."),
        ("Difficulty Understanding Recurring Failures", "Without structured failure categorization, maintenance teams find it difficult to analyze repeat breakdowns. Repeatedly repairing the same symptom without addressing the root cause wastes labor and increases long-term repair expenditure."),
        ("Limited Visibility into Maintenance Team Performance", "Facility executives often find it difficult to determine the exact annual cost of maintaining a specific asset, how many labor hours were spent on corrective repairs versus preventive care, or whether an aging machine has become uneconomical to keep in service."),
        ("Maintenance Decisions Made Without Historical Information", "Decisions about which equipment to overhaul, what spare parts to stock, or how to allocate limited maintenance budgets are often made under pressure using gut feeling rather than verifiable operational data."),
        ("Loss of Operational Knowledge When Employees Leave", "Experienced operators and senior technicians possess invaluable practical knowledge about the idiosyncrasies of specific machines. When these senior staff members retire or change jobs, decades of operational wisdom walk out the door with them.")
    ]

    for title, desc in challenges:
        p_text = f"<b>&bull; {title}:</b> {desc}"
        story.append(Paragraph(p_text, bullet_style))

    story.append(Spacer(1, 4))
    story.append(Paragraph("How a Structured Platform Addresses These Challenges", h2_style))
    story.append(Paragraph(
        "LuminaFM is designed to eliminate these operational blind spots. By consolidating asset records, shift inspection logs, scheduled servicing routines, and corrective repair histories into one accessible system, the platform creates an <b>indelible operational memory</b> for the facility. Every team member—from the plant operator recording morning gauge readings to the Chief Engineer reviewing quarterly maintenance budgets—works from the same clear, reliable picture.",
        body_style
    ))

    p2_box = [
        [Paragraph(
            "<b>Industry Context Note:</b> These challenges are presented as widespread industry operational patterns observed across commercial facilities, not as confirmed problems at any single organization. Our goal is to verify which of these issues resonate most strongly with your professional experience.",
            callout_style
        )]
    ]
    t_p2 = Table(p2_box, colWidths=[507])
    t_p2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER_LIGHT),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_p2)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: HOW LUMINAFM WILL WORK
    # =========================================================================
    story.append(Paragraph("3. How LuminaFM Will Work", h1_style))
    story.append(Paragraph(
        "LuminaFM is built around the natural operational lifecycle of a professional facility management department. The entire platform supports ten straightforward, practical steps:",
        body_style
    ))

    # 10 Steps Table for clean compact layout
    steps_data = [
        [Paragraph("Step", table_cell_header), Paragraph("Workflow Stage", table_cell_header), Paragraph("Practical Operation & Everyday Example", table_cell_header)],
        [Paragraph("1", table_cell_bold), Paragraph("Register Equipment", table_cell_bold), Paragraph("Catalog every physical machine with unique asset tags, locations, and system hierarchies (e.g., Boiler KHB-BLR-001 in Central Plant Room).", table_cell)],
        [Paragraph("2", table_cell_bold), Paragraph("Record Technical Data", table_cell_bold), Paragraph("Store design specifications, manufacturer nameplates, rated capacities, design pressures, and baseline operating parameters.", table_cell)],
        [Paragraph("3", table_cell_bold), Paragraph("Create PM Schedules", table_cell_bold), Paragraph("Establish recurring calendar and runtime maintenance routines (e.g., weekly lubrication, monthly safety valve checks, annual overhauls).", table_cell)],
        [Paragraph("4", table_cell_bold), Paragraph("Record Inspections & Logs", table_cell_bold), Paragraph("Shift operators log routine walkthroughs, gauge pressures, temperatures, and physical observations directly on digital forms.", table_cell)],
        [Paragraph("5", table_cell_bold), Paragraph("Report Problems / Defects", table_cell_bold), Paragraph("Any operator or technician can immediately flag an abnormal sound, steam leak, or vibration with photos and severity ratings.", table_cell)],
        [Paragraph("6", table_cell_bold), Paragraph("Create Work Orders", table_cell_bold), Paragraph("Reported defects and scheduled preventive jobs convert into formal work orders detailing scope of work, safety hazards, and priority.", table_cell)],
        [Paragraph("7", table_cell_bold), Paragraph("Assign to Technicians", table_cell_bold), Paragraph("Supervisors assign jobs to specific in-house mechanical/electrical technicians or specialized external contractors.", table_cell)],
        [Paragraph("8", table_cell_bold), Paragraph("Record Completed Work", table_cell_bold), Paragraph("Technicians record labor hours, describe repairs performed, list spare parts consumed, and attach photographic proof of completion.", table_cell)],
        [Paragraph("9", table_cell_bold), Paragraph("Review Asset History", table_cell_bold), Paragraph("Every completed inspection, work order, and reading is permanently linked to the asset's digital timeline for auditing.", table_cell)],
        [Paragraph("10", table_cell_bold), Paragraph("Improve Future Decisions", table_cell_bold), Paragraph("Management reviews recurring failure modes and maintenance costs to refine PM frequencies and forecast capital replacements.", table_cell)],
    ]
    t_steps = Table(steps_data, colWidths=[28, 110, 369])
    t_steps.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('ALIGN', (0,0), (0,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, NAVY),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_steps)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Current Implementation Status vs. Proposed Future Roadmap", h2_style))
    status_data = [
        [
            Paragraph("<b>Verified Implemented Capabilities (Available Now)</b>", table_cell_bold),
            Paragraph("<b>Proposed Future Enhancements (Under Evaluation)</b>", table_cell_bold)
        ],
        [
            Paragraph(
                "&bull; Central multi-tier asset registry with custom attributes<br/>"
                "&bull; Work order lifecycle (Draft &rarr; Assigned &rarr; Completed)<br/>"
                "&bull; Preventive maintenance schedule engine (Time/Cycles)<br/>"
                "&bull; 2-hour digital boiler operational logbook & history<br/>"
                "&bull; Role-based security (Admin, Engineer, Operator, Tech)",
                table_cell
            ),
            Paragraph(
                "&bull; Offline-first mobile app with QR-code equipment scanning<br/>"
                "&bull; Spare parts inventory & automated reorder thresholds<br/>"
                "&bull; External specialized maintenance contractor portal<br/>"
                "&bull; Automated utility consumption & energy cost tracking<br/>"
                "&bull; Multi-site corporate portfolio benchmarking dashboard",
                table_cell
            )
        ]
    ]
    t_status = Table(status_data, colWidths=[253, 254])
    t_status.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), BG_LIGHT),
        ('BACKGROUND', (1,0), (1,0), ACCENT_BG),
        ('BOX', (0,0), (0,1), 1, BORDER_LIGHT),
        ('BOX', (1,0), (1,1), 1, SLATE_BLUE),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_status)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: WHY THE PROJECT STARTS WITH BOILER MAINTENANCE
    # =========================================================================
    story.append(Paragraph("4. Why the Project Starts with Boiler Maintenance", h1_style))
    story.append(Paragraph(
        "While LuminaFM is designed as a comprehensive facility management platform, our initial deep specialist application focuses specifically on <b>industrial steam boilers</b>. This focus is grounded in academic research conducted at the Department of Building Economics, University of Moratuwa, Sri Lanka, in close collaboration with premier commercial facilities (specifically evaluating the central boiler plant at The Kingsbury Hotel, Colombo).",
        body_style
    ))

    story.append(Paragraph("The Critical Importance of Industrial Steam Boilers", h2_style))
    story.append(Paragraph(
        "In commercial hospitality, healthcare, and industrial manufacturing environments, the central steam boiler is often described as the 'heart of the utility plant':",
        body_style
    ))

    boiler_points = [
        ("Vital Facility Services", "Boilers generate high-pressure steam essential for central laundry operations, domestic hot water distribution, commercial kitchen food preparation, and space heating. A boiler outage immediately degrades guest comfort and halts critical hotel services."),
        ("Extreme Operational and Safety Risks", "Steam boilers operate under high pressures (typically 8 to 9 bar in commercial hotels) and severe combustion temperatures. Neglected maintenance, valve failures, or water level cut-off malfunctions can lead to catastrophic pressure vessel explosions, structural destruction, and loss of life."),
        ("Massive Energy and Fuel Costs", "Industrial burners consume thousands of liters of heavy fuel oil or diesel daily. Thermodynamic research demonstrates that even a microscopic 1 mm layer of boiler scale on heat transfer tubes can increase fuel consumption by 5% to 8%, wasting millions of rupees in annual energy expenses."),
        ("The Reality of Developing Facilities", "Unlike modern European utility plants with automated SCADA telemetry and continuous IoT sensors, commercial boiler plants across developing regions rely entirely on manual shift logbooks, periodic visual inspections, and the hands-on intuition of plant operators.")
    ]
    for bp_title, bp_desc in boiler_points:
        story.append(Paragraph(f"<b>&bull; {bp_title}:</b> {bp_desc}", bullet_style))

    story.append(Spacer(1, 4))
    story.append(Paragraph("The Research Foundation: 4 Subsystems and 35 Validated Maintenance Activities", h2_style))
    story.append(Paragraph(
        "The foundational research analyzed four thermodynamic systems comprising ten primary physical components. Through an iterative validation process with deeply experienced industrial practitioners—including Chief Engineers, specialized steam engineering executives, and senior boiler operators with up to 52 years of hands-on experience—the research codified <b>35 essential maintenance activities</b>:",
        body_style
    ))

    # Subsystems summary table
    sub_data = [
        [Paragraph("Subsystem", table_cell_header), Paragraph("Key Components", table_cell_header), Paragraph("Validated Activities (35 Total)", table_cell_header)],
        [Paragraph("1. Feed Water System", table_cell_bold), Paragraph("Feed Pump, Economizer, Feed Water Tank", table_cell), Paragraph("11 Activities: Mechanical seal replacement, impeller service, bearing lubrication, Megger testing, coil de-sooting, sludge removal, insulation maintenance, valve checks.", table_cell)],
        [Paragraph("2. Steam Generation System", table_cell_bold), Paragraph("Heat Exchanger / Fire Tubes, Boiler Shell", table_cell), Paragraph("5 Activities: Chemical de-scaling, fire tube hydrostatic leak testing, tube brushing & soot cleaning, bottom blowdown servicing, pressure cut-off switch calibration.", table_cell)],
        [Paragraph("3. Fuel & Combustion System", table_cell_bold), Paragraph("Combustion Chamber, Burner Assembly, Exhaust Stack", table_cell), Paragraph("12 Activities: Refractory lining patch, burner nozzle replacement, electrode gap calibration, air damper adjustment, photocell cleaning, fuel pump filter service.", table_cell)],
        [Paragraph("4. Safety & Control System", table_cell_bold), Paragraph("Safety Relief Valves, Master Pressure Gauges", table_cell), Paragraph("7 Activities: Safety valve spring replacement, seat lapping, disc renewal, flange gasket replacement, Bourdon tube calibration, siphon tube port cleaning.", table_cell)],
    ]
    t_sub = Table(sub_data, colWidths=[120, 140, 247])
    t_sub.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, NAVY),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_sub)
    story.append(Spacer(1, 4))

    p4_box = [
        [Paragraph(
            "<b>Specialist Scope Clarification:</b> The boiler functionality is intended to provide a deep, specialist application within a broader FM platform. It proves that software can bridge the gap between manual shift logging and structured maintenance engineering.",
            callout_style
        )]
    ]
    t_p4 = Table(p4_box, colWidths=[507])
    t_p4.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER_LIGHT),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_p4)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: THE RESEARCH-BASED DECISION SUPPORT IDEA
    # =========================================================================
    story.append(Paragraph("5. The Research-Based Decision Support Idea", h1_style))
    story.append(Paragraph(
        "One of the most valuable aspects of the LuminaFM project is its research-based approach to <b>maintenance decision support</b>, derived from the <b>Analytic Network Process (ANP)</b>. In simple terms, this method reflects how an experienced Chief Engineer already thinks.",
        body_style
    ))

    # The Everyday Analogy Box
    analogy_content = [
        [Paragraph("<b>An Everyday Analogy: How Experienced Engineers Make Decisions</b>", ParagraphStyle('ATitle', parent=h2_style, textColor=NAVY, spaceAfter=2))],
        [Paragraph(
            "<i>\"Imagine you are a Chief Engineer arriving at your facility on Monday morning. Your maintenance supervisor presents you with several pressing issues across the boiler plant:</i><br/>"
            "&bull; <i>The burner nozzle shows signs of carbon buildup, and fuel consumption has crept up by 8%.</i><br/>"
            "&bull; <i>The feed water pump has logged 11,500 continuous running hours and is vibrating slightly.</i><br/>"
            "&bull; <i>The flue gas temperature is reading 198°C, which is 8°C higher than the normal operating baseline.</i><br/>"
            "&bull; <i>The safety relief valve is due for its mandatory semi-annual test next week.</i><br/>"
            "<i>Which task should your technicians tackle first?</i><br/><br/>"
            "<i>To answer this, you do not look at one factor in isolation. You instinctively weigh multiple connected considerations simultaneously: Which issue poses an immediate life-safety hazard? Which one risks a catastrophic plant shutdown? Which one is actively wasting costly fuel? What does the equipment's recent repair history show?\"</i>",
            callout_style
        )]
    ]
    t_analogy = Table(analogy_content, colWidths=[507])
    t_analogy.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, SLATE_BLUE),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_analogy)
    story.append(Spacer(1, 6))

    story.append(Paragraph("Why Maintenance Decisions Involve Connected Factors", h2_style))
    story.append(Paragraph(
        "In real facility operations, equipment symptoms are intimately connected. A high flue gas temperature (above 190°C) does not exist in isolation; it may be caused by insulating soot on fire tubes, poor air-to-fuel calibration in the burner, or mineral scale insulating the water side of the boiler shell. Traditional software systems treat maintenance tasks as independent checklists. The research model recognizes that <b>operating criteria, physical symptoms, and maintenance interventions influence one another</b>.",
        body_style
    ))

    story.append(Paragraph("The Dual-Network Architecture: Daily Triage vs. Lifecycle Planning", h2_style))
    dual_data = [
        [
            Paragraph("<b>Network 1: Daily Operational & Corrective Triage</b>", table_cell_bold),
            Paragraph("<b>Network 2: Lifecycle & Periodic Overhauls</b>", table_cell_bold)
        ],
        [
            Paragraph(
                "&bull; Evaluates 2-hourly shift logs against empirical limits<br/>"
                "&bull; Monitors steam pressure, feed pressure, temperatures<br/>"
                "&bull; Tracks sudden spikes, flame color, or gauge errors<br/>"
                "&bull; <b>Outcome:</b> Generates immediate corrective alerts and same-shift work order recommendations.",
                table_cell
            ),
            Paragraph(
                "&bull; Tracks cumulative running hours & calendar elapsed time<br/>"
                "&bull; Manages monthly, quarterly, and semi-annual routines<br/>"
                "&bull; Schedules annual statutory inspections & overhauls<br/>"
                "&bull; <b>Outcome:</b> Guides long-term shutdown scheduling, budgeting, and spare parts procurement.",
                table_cell
            )
        ]
    ]
    t_dual = Table(dual_data, colWidths=[253, 254])
    t_dual.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), BG_LIGHT),
        ('BACKGROUND', (1,0), (1,-1), ACCENT_BG),
        ('BOX', (0,0), (0,-1), 1, BORDER_LIGHT),
        ('BOX', (1,0), (1,-1), 1, SLATE_BLUE),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_dual)
    story.append(Spacer(1, 6))

    story.append(Paragraph("Decision Support, Not Decision Automation", h2_style))
    story.append(Paragraph(
        "We firmly believe that software should never attempt to replace the judgment, intuition, and legal responsibility of qualified facility engineers. LuminaFM does not act as an automated 'black box.' Instead, it organizes complex considerations into transparent, ranked advice—clearly explaining why an action is recommended—while ensuring that the <b>responsible Chief Engineer always retains final decision authority</b>.",
        body_style
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 6: THE BIGGER VISION
    # =========================================================================
    story.append(Paragraph("6. The Bigger Vision: Growing Beyond Boilers", h1_style))
    story.append(Paragraph(
        "Although LuminaFM begins with boiler maintenance as its specialized research foundation, the long-term vision is to create an <b>adaptable, modular enterprise CMMS</b> capable of managing all critical mechanical, electrical, and plumbing (MEP) assets across diverse facilities.",
        body_style
    ))

    story.append(Paragraph("The Core Engine + Specialist Equipment Modules Strategy", h2_style))
    story.append(Paragraph(
        "Different machines have fundamentally different physics, operating parameters, and failure modes. A generic maintenance form that treats a centrifugal chiller the same as a fire door fails to provide meaningful operational value. Our architectural vision pairs a <b>universal CMMS core</b> with <b>plug-in equipment intelligence modules</b>:",
        body_style
    ))

    modules_data = [
        [Paragraph("Equipment Category", table_cell_header), Paragraph("Status", table_cell_header), Paragraph("Key Parameters & Operational Focus", table_cell_header)],
        [
            Paragraph("<b>Industrial Steam Boilers</b>", table_cell_bold),
            Paragraph("<font color='#059669'><b>Implemented Baseline</b></font>", table_cell),
            Paragraph("Steam/feed pressures, flue gas temperatures, burner run hours, blowdown routines, water level cut-offs, 35 validated maintenance activities.", table_cell)
        ],
        [
            Paragraph("<b>Centrifugal & Screw Chillers</b>", table_cell_bold),
            Paragraph("<font color='#2563EB'>Future Roadmap</font>", table_cell),
            Paragraph("Refrigerant pressures, evaporator/condenser approach temperatures, compressor motor amps, oil level & acid analysis, condenser tube fouling.", table_cell)
        ],
        [
            Paragraph("<b>Pumps & Hydronic Systems</b>", table_cell_bold),
            Paragraph("<font color='#2563EB'>Future Roadmap</font>", table_cell),
            Paragraph("Vibration signatures, mechanical seal leakage rates, suction/discharge pressures, bearing operating temperatures, motor Megger logs.", table_cell)
        ],
        [
            Paragraph("<b>Diesel Standby Generators</b>", table_cell_bold),
            Paragraph("<font color='#2563EB'>Future Roadmap</font>", table_cell),
            Paragraph("Battery cranking voltage drops, fuel filtration differential pressure, coolant jacket temperatures, monthly off-load & full-load bank testing.", table_cell)
        ],
        [
            Paragraph("<b>Air Handling Units (AHUs)</b>", table_cell_bold),
            Paragraph("<font color='#2563EB'>Future Roadmap</font>", table_cell),
            Paragraph("Filter differential pressure drops, supply/return air delta-T, belt tension and pulley alignment, fan bearing acoustics, condensate pan drainage.", table_cell)
        ],
    ]
    t_mod = Table(modules_data, colWidths=[130, 85, 292])
    t_mod.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, NAVY),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_mod)
    story.append(Spacer(1, 6))

    story.append(Paragraph("Flexibility Across Diverse Facilities and Organizations", h2_style))
    story.append(Paragraph(
        "The LuminaFM architecture is being designed to support multiple organizational structures and diverse operational environments:",
        body_style
    ))

    sectors = [
        ("Five-Star Hotels & Resorts", "Ensuring 24/7 guest comfort, hot water reliability, laundry continuity, and banquet readiness without disruptive utility outages."),
        ("Hospitals & Healthcare Facilities", "Meeting stringent clean-air standards, sterilizer steam reliability, and zero-interruption emergency generator readiness."),
        ("Commercial High-Rise Towers", "Managing decentralized HVAC equipment, pumping systems, elevator reliability, and tenant maintenance requests."),
        ("Industrial Manufacturing Plants", "Minimizing unplanned production line downtime, optimizing energy consumption, and extending the operational lifespan of heavy machinery.")
    ]
    for sec_title, sec_desc in sectors:
        story.append(Paragraph(f"<b>&bull; {sec_title}:</b> {sec_desc}", bullet_style))

    p6_box = [
        [Paragraph(
            "<b>Development Commitment:</b> Specialized modules for chillers, generators, and AHUs represent future development plans. They will follow the exact same rigorous methodology as the boiler research: empirical field validation with experienced practitioners.",
            callout_style
        )]
    ]
    t_p6 = Table(p6_box, colWidths=[507])
    t_p6.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER_LIGHT),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_p6)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 7: WE NEED YOUR PROFESSIONAL EXPERIENCE
    # =========================================================================
    story.append(Paragraph("7. We Need Your Professional Experience", h1_style))
    story.append(Paragraph(
        "This document is not a commercial sales pitch. LuminaFM is currently in an active concept validation and refinement phase, and our highest priority is ensuring that the software reflects the practical, unvarnished realities of day-to-day facility maintenance.",
        body_style
    ))
    story.append(Paragraph(
        "Software developers understand databases, code, and user interfaces. <b>You understand buildings, mechanical plants, maintenance technicians, and operational crises.</b> We need your expert perspective to challenge our assumptions, identify operational blind spots, and guide the evolution of this platform.",
        body_style
    ))
    story.append(Spacer(1, 4))

    story.append(Paragraph("Ten Practical Questions for the Facility Management Expert", h2_style))

    questions = [
        ("1. Real-World Relevance", "Does this concept address genuine, frustrating challenges that you and your maintenance teams face in daily facility operations?"),
        ("2. Workflow Completeness", "Reviewing the 10-step maintenance lifecycle in Section 3, what critical maintenance activities, shift handovers, or statutory compliance procedures are missing?"),
        ("3. Asset Information Depth", "When onboarding a major mechanical asset into a maintenance system, what specific technical data, warranty terms, and nameplate details are most essential for technicians?"),
        ("4. Chief Engineer Dashboard Priorities", "If you opened LuminaFM on your office desktop or tablet at 8:00 AM, what top three to five key metrics or alerts would you need to see immediately to feel in complete control of your facility?"),
        ("5. Balancing Preventive vs. Corrective Care", "In your facility, what percentage of maintenance work is planned preventive care versus reactive breakdown repair? How can a system best help your team shift toward proactive maintenance?"),
        ("6. Technician Usability on the Plant Floor", "Technicians often work in noisy, dimly lit boiler rooms and plant basements with dirty or wet hands. What practical obstacles cause technicians to resist using digital tools, and how can we design our screens to make their logging effortless?"),
        ("7. Work Prioritization Criteria", "When multiple work orders compete for your technicians' limited time on a busy day, what real-world factors carry the most weight (e.g., life safety, guest comfort impact, energy cost, statutory compliance)?"),
        ("8. Completeness of Boiler Maintenance", "Reviewing the boiler subsystems and 35 maintenance activities outlined in Section 4, are there critical failure modes, daily chemical water quality checks, or regulatory boiler inspections that you believe must be included?"),
        ("9. Practical Adoption Factors", "Many facilities purchase expensive commercial CMMS software only for it to be abandoned or used merely as a glorified electronic calendar. What specific practical capability would make LuminaFM indispensable to your department?"),
        ("10. Critical Guidance for Next-Phase Development", "What single recommendation, warning, or improvement would you give our development team before we proceed with the next phase of development?")
    ]

    for q_num, q_text in questions:
        story.append(Paragraph(f"<b>{q_num}:</b> {q_text}", bullet_style))

    story.append(Spacer(1, 6))

    # Concluding Vision Callout Box
    closing_box = [
        [Paragraph(
            "<b>Our Commitment to Practical Facility Management:</b><br/>"
            "<i>\"We are not simply trying to build another maintenance recording system. Our aim is to develop a practical platform that helps FM professionals organize maintenance activities, understand equipment conditions, preserve operational knowledge, and make better-informed decisions.<br/><br/>"
            "Your professional experience can help us ensure that LuminaFM is designed around real facility management needs.\"</i>",
            ParagraphStyle('Closing', parent=callout_style, fontSize=8.5, leading=12, textColor=NAVY)
        )]
    ]
    t_close = Table(closing_box, colWidths=[507])
    t_close.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1.5, GOLD),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_close)
    story.append(Spacer(1, 6))

    story.append(Paragraph(
        "<b>Contact & Review Submission:</b> Please share your feedback, notes, and suggestions with the LuminaFM Research & Development Team. Every insight you provide will directly shape the design of our next software release. Thank you for your generous time and professional guidance.",
        ParagraphStyle('Contact', parent=body_style, fontSize=8, leading=11, textColor=MUTED)
    ))

    # Build PDF with NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[OK] PDF successfully generated at: {PDF_PATH}")


def create_docx():
    doc = docx.Document()

    # Set Margins (0.75 in / 54 pt)
    sections = doc.sections
    for s in sections:
        s.top_margin = Inches(0.75)
        s.bottom_margin = Inches(0.75)
        s.left_margin = Inches(0.75)
        s.right_margin = Inches(0.75)

    def set_cell_background(cell, fill_hex):
        tcPr = cell._tc.get_or_add_tcPr()
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
        tcPr.append(shd)

    def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
        tcPr.append(tcMar)

    # Document Header / Footer
    for section in doc.sections:
        header = section.header
        p_hdr = header.paragraphs[0]
        p_hdr.text = "LuminaFM: A Smarter Approach to Facility Maintenance Management | Expert Concept Brief"
        p_hdr.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p_hdr.runs[0].font.size = Pt(8.5)
        p_hdr.runs[0].font.color.rgb = RGBColor(100, 116, 139)

        footer = section.footer
        p_ftr = footer.paragraphs[0]
        p_ftr.text = "LuminaFM Concept Brief | Confidential - For FM Expert Review Only"
        p_ftr.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p_ftr.runs[0].font.size = Pt(8.5)
        p_ftr.runs[0].font.color.rgb = RGBColor(100, 116, 139)

    # Title & Subtitle
    p_title = doc.add_paragraph()
    r_title = p_title.add_run("LuminaFM: A Smarter Approach to Facility Maintenance Management")
    r_title.bold = True
    r_title.font.size = Pt(22)
    r_title.font.color.rgb = RGBColor(15, 41, 74) # Navy
    p_title.paragraph_format.space_after = Pt(2)

    p_sub = doc.add_paragraph()
    r_sub = p_sub.add_run("A Concept & Vision Brief for Facility Management Professionals")
    r_sub.font.size = Pt(12)
    r_sub.font.color.rgb = RGBColor(30, 64, 175) # Slate Blue
    p_sub.paragraph_format.space_after = Pt(12)

    # Metadata Table
    meta_table = doc.add_table(rows=2, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_rows = [
        ("Target Audience: Senior Facility Managers, Chief Engineers, Operations Directors", "Project Phase: Concept Validation & Strategic Consultation"),
        ("Document Purpose: Professional Review & Feedback", "Scope: Core CMMS Architecture & Specialized Boiler Intelligence")
    ]
    for i, row in enumerate(meta_rows):
        for j, text in enumerate(row):
            cell = meta_table.cell(i, j)
            set_cell_background(cell, "F8FAFC")
            set_cell_margins(cell, top=100, bottom=100, left=150, right=150)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(text)
            r.font.size = Pt(9)
            r.font.color.rgb = RGBColor(31, 41, 55)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # Section 1
    h1 = doc.add_heading(level=1)
    r1 = h1.add_run("1. Introducing LuminaFM")
    r1.font.color.rgb = RGBColor(15, 41, 74)
    h1.paragraph_format.space_before = Pt(14)
    h1.paragraph_format.space_after = Pt(6)

    doc.add_paragraph(
        "LuminaFM is being developed as a modern, practical software platform designed specifically for facility and maintenance teams. Its primary purpose is to help organizations manage their physical buildings, facilities, equipment, daily maintenance routines, and technical personnel within a single, well-organized system."
    )
    doc.add_paragraph(
        "In many commercial and industrial facilities today, critical maintenance information remains fragmented. Equipment manuals sit in forgotten filing cabinets, daily operating logs are scribbled into paper notebooks, preventive maintenance schedules live in isolated spreadsheets, and emergency repairs are coordinated through chaotic phone calls and messaging chats. When an asset breaks down, maintenance supervisors often have to reconstruct its history from memory or sift through stacks of weathered paper."
    )
    doc.add_paragraph(
        "LuminaFM aims to replace this scattered approach with a unified, transparent digital workspace that brings maintenance information and daily activities into one structured platform."
    )

    doc.add_heading("The Operational Flow: From Physical Buildings to Better Decisions", level=2)
    doc.add_paragraph(
        "Organization  -->  Facilities  -->  Equipment  -->  Maintenance Activities  -->  Structured Information  -->  Better Decisions"
    )

    doc.add_heading("The Core Philosophy: Shifting from Reactive Chaos to Proactive Clarity", level=2)
    doc.add_paragraph(
        "The fundamental vision behind LuminaFM is that maintenance should not be reactive guesswork. Every piece of equipment tells a continuous operational story through its temperatures, pressures, running hours, and subtle physical symptoms. When this operational information is recorded consistently and connected directly to maintenance work orders, maintenance leaders gain the clarity needed to protect building occupants, prevent costly breakdowns, and extend asset longevity."
    )

    doc.add_page_break()

    # Section 2
    h2 = doc.add_heading(level=1)
    r2 = h2.add_run("2. The Problems We Want to Solve")
    r2.font.color.rgb = RGBColor(15, 41, 74)
    h2.paragraph_format.space_before = Pt(14)
    h2.paragraph_format.space_after = Pt(6)

    doc.add_paragraph(
        "Facility managers and maintenance engineers face demanding daily operational responsibilities. Keeping complex facilities running smoothly, safely, and cost-effectively requires balancing dozens of competing priorities. Through industry observation and field research, we have identified several common operational challenges that LuminaFM aims to address:"
    )

    challenges = [
        ("Scattered and Fragile Maintenance Records", "Maintenance logs, equipment manuals, past repair notes, and compliance certificates are frequently distributed across physical binders, loose paper sheets, and disconnected spreadsheets. Important historical records are easily lost, misplaced, or physically damaged."),
        ("Difficulty Tracking Equipment History", "When a critical machine malfunctions, technicians rarely have immediate access to its full history. Knowing when it was last overhauled, what parts were replaced, who performed the work, and whether the same symptom occurred six months ago requires tedious manual investigation."),
        ("Preventive Maintenance Being Missed", "When preventive maintenance schedules rely on memory, wall calendars, or static spreadsheets, routine inspections and filter changes can easily be postponed or forgotten during busy operational periods—eventually triggering preventable equipment breakdowns."),
        ("Manual and Disjointed Work Coordination", "Work requests, job assignments, and progress updates are frequently handled verbally or through informal messaging chats. Without a centralized tracking board, managers struggle to know which jobs are active, which are delayed, and which have been properly verified."),
        ("Delayed Response to Equipment Problems", "Machines rarely fail without warning. An unusual vibration, a slight temperature rise, or a drop in operating pressure usually precedes a breakdown. When shift logs are kept on paper, these warning trends remain invisible until the equipment suddenly stops."),
        ("Difficulty Understanding Recurring Failures", "Without structured failure categorization, maintenance teams find it difficult to analyze repeat breakdowns. Repeatedly repairing the same symptom without addressing the root cause wastes labor and increases long-term repair expenditure."),
        ("Limited Visibility into Maintenance Team Performance", "Facility executives often find it difficult to determine the exact annual cost of maintaining a specific asset, how many labor hours were spent on corrective repairs versus preventive care, or whether an aging machine has become uneconomical to keep in service."),
        ("Maintenance Decisions Made Without Historical Information", "Decisions about which equipment to overhaul, what spare parts to stock, or how to allocate limited maintenance budgets are often made under pressure using gut feeling rather than verifiable operational data."),
        ("Loss of Operational Knowledge When Employees Leave", "Experienced operators and senior technicians possess invaluable practical knowledge about the idiosyncrasies of specific machines. When these senior staff members retire or change jobs, decades of operational wisdom walk out the door with them.")
    ]
    for c_title, c_desc in challenges:
        p_c = doc.add_paragraph(style='List Bullet')
        r_c_title = p_c.add_run(f"{c_title}: ")
        r_c_title.bold = True
        p_c.add_run(c_desc)

    doc.add_heading("How a Structured Platform Addresses These Challenges", level=2)
    doc.add_paragraph(
        "LuminaFM is designed to eliminate these operational blind spots. By consolidating asset records, shift inspection logs, scheduled servicing routines, and corrective repair histories into one accessible system, the platform creates an indelible operational memory for the facility. Every team member—from the plant operator recording morning gauge readings to the Chief Engineer reviewing quarterly maintenance budgets—works from the same clear, reliable picture."
    )

    doc.add_page_break()

    # Section 3
    h3 = doc.add_heading(level=1)
    r3 = h3.add_run("3. How LuminaFM Will Work")
    r3.font.color.rgb = RGBColor(15, 41, 74)
    h3.paragraph_format.space_before = Pt(14)
    h3.paragraph_format.space_after = Pt(6)

    doc.add_paragraph(
        "LuminaFM is built around the natural operational lifecycle of a professional facility management department. The entire platform supports ten straightforward, practical steps:"
    )

    steps = [
        ("Step 1: Register Equipment", "Catalog every physical asset with unique asset identification codes, locations, and system hierarchies."),
        ("Step 2: Record Equipment Information", "Store baseline engineering specifications, manufacturer nameplates, rated capacities, design pressures, and limits."),
        ("Step 3: Create Maintenance Schedules", "Establish recurring calendar-based or runtime-based preventive maintenance routines (e.g., daily, monthly, annual)."),
        ("Step 4: Record Inspections & Daily Readings", "Shift operators log routine walkthroughs, gauge pressures, temperatures, and physical observations directly on digital forms."),
        ("Step 5: Report Equipment Problems", "Any operator or technician can immediately flag an abnormal sound, steam leak, or vibration with photos and severity ratings."),
        ("Step 6: Create Maintenance Work Orders", "Reported defects and scheduled preventive tasks convert into formal work orders detailing scope of work, safety hazards, and priority."),
        ("Step 7: Assign Work to Technicians", "Supervisors assign jobs to specific in-house mechanical/electrical technicians or specialized external contractors."),
        ("Step 8: Record Completed Work", "Technicians record actual labor hours, describe repairs performed, list spare parts consumed, and attach photographic proof."),
        ("Step 9: Review Maintenance History", "Every completed inspection, work order, and reading is permanently linked to the asset's digital timeline for auditing."),
        ("Step 10: Improve Future Decisions", "Management reviews recurring failure causes and maintenance costs to refine PM frequencies and forecast capital replacements.")
    ]
    for s_title, s_desc in steps:
        p_s = doc.add_paragraph(style='List Number')
        r_s_title = p_s.add_run(f"{s_title}: ")
        r_s_title.bold = True
        p_s.add_run(s_desc)

    doc.add_heading("Current Implementation vs. Proposed Future Roadmap", level=2)
    doc.add_paragraph(
        "• Implemented Baseline: Centralized asset registry, multi-facility organization management, interactive work order management, preventive maintenance scheduling, digital daily boiler logbook, and role-based access control.\n"
        "• Planned Future Capabilities: Native offline mobile application with QR-code equipment scanning, integrated spare parts inventory tracking, external contractor self-service portal, and automated utility billing analytics."
    )

    doc.add_page_break()

    # Section 4
    h4 = doc.add_heading(level=1)
    r4 = h4.add_run("4. Why the Project Starts with Boiler Maintenance")
    r4.font.color.rgb = RGBColor(15, 41, 74)
    h4.paragraph_format.space_before = Pt(14)
    h4.paragraph_format.space_after = Pt(6)

    doc.add_paragraph(
        "While LuminaFM is designed as a comprehensive facility management platform, our initial deep specialist application focuses specifically on industrial steam boilers. This focus is grounded in academic research conducted at the Department of Building Economics, University of Moratuwa, Sri Lanka, in close collaboration with premier commercial facilities (specifically evaluating the central boiler plant at The Kingsbury Hotel, Colombo)."
    )

    doc.add_heading("The Critical Importance of Industrial Steam Boilers", level=2)
    doc.add_paragraph(
        "In commercial hospitality, healthcare, and industrial manufacturing environments, the central steam boiler is often described as the 'heart of the utility plant':\n"
        "• Vital Facility Services: Boilers generate high-pressure steam essential for central laundry operations, domestic hot water distribution, commercial kitchen food preparation, and space heating.\n"
        "• Extreme Operational and Safety Risks: Steam boilers operate under high pressures (typically 8 to 9 bar) and severe combustion temperatures. Neglected maintenance or safety cut-off malfunctions can lead to catastrophic pressure vessel explosions.\n"
        "• Massive Energy and Fuel Costs: Industrial burners consume thousands of liters of fuel oil daily. Thermodynamic research demonstrates that even a 1 mm layer of boiler scale can increase fuel consumption by 5% to 8%, wasting millions in energy expenses.\n"
        "• Reality of Developing Facilities: Operations rely heavily on manual shift logbooks, periodic visual inspections, and the hands-on intuition of senior operators rather than costly automated SCADA telemetry."
    )

    doc.add_heading("The Research Foundation: 4 Subsystems and 35 Validated Maintenance Activities", level=2)
    doc.add_paragraph(
        "Through an iterative validation process with deeply experienced industrial practitioners—including Chief Engineers and senior boiler operators with up to 52 years of hands-on experience—the research codified 35 essential maintenance activities across four core subsystems:\n"
        "1. Feed Water System (11 Activities): Feed pump overhaul, mechanical seal renewal, bearing lubrication, Megger insulation testing, economizer de-sooting, feed tank sediment cleaning, and insulation repair.\n"
        "2. Steam Generation System (5 Activities): Chemical de-scaling, fire tube hydrostatic leak testing, tube brushing & soot cleaning, bottom blowdown servicing, and pressure cut-off switch replacement.\n"
        "3. Fuel & Combustion System (12 Activities): Refractory lining patch, burner nozzle replacement, ignition electrode gap calibration, air damper modulation, photocell cleaning, and fuel pump filter service.\n"
        "4. Safety & Control System (7 Activities): Safety valve spring replacement, seat lapping, disc renewal, flange gasket replacement, Bourdon tube calibration, and gauge port cleaning."
    )

    doc.add_page_break()

    # Section 5
    h5 = doc.add_heading(level=1)
    r5 = h5.add_run("5. The Research-Based Decision Support Idea")
    r5.font.color.rgb = RGBColor(15, 41, 74)
    h5.paragraph_format.space_before = Pt(14)
    h5.paragraph_format.space_after = Pt(6)

    doc.add_paragraph(
        "One of the most valuable aspects of the LuminaFM project is its research-based approach to maintenance decision support, derived from the Analytic Network Process (ANP). In simple terms, this method reflects how an experienced Chief Engineer already thinks."
    )

    doc.add_heading("An Everyday Analogy: How Experienced Engineers Make Decisions", level=2)
    p_an = doc.add_paragraph()
    r_an = p_an.add_run(
        "\"Imagine you are a Chief Engineer arriving at your facility on Monday morning. Your maintenance supervisor presents you with several pressing issues across the boiler plant: The burner nozzle shows signs of carbon buildup and fuel consumption has crept up by 8%; the feed water pump has logged 11,500 running hours and is vibrating slightly; the flue gas temperature is reading 198°C (8°C higher than baseline); and the safety relief valve is due for its semi-annual test next week. Which task should receive attention first?\n\n"
        "To answer this, you do not look at one factor in isolation. You instinctively weigh multiple connected considerations simultaneously: Which issue poses an immediate life-safety hazard? Which one risks a catastrophic plant shutdown? Which one is actively wasting costly fuel? What does the equipment's recent repair history show?\""
    )
    r_an.italic = True

    doc.add_heading("Why Maintenance Decisions Involve Connected Factors", level=2)
    doc.add_paragraph(
        "In real facility operations, equipment symptoms are intimately connected. A high flue gas temperature does not exist in isolation; it may be caused by insulating soot on fire tubes, poor air-to-fuel calibration in the burner, or mineral scale insulating the water side of the boiler shell. The research model captures these feedback relationships rather than treating maintenance tasks as independent checklists."
    )

    doc.add_heading("Dual-Network Architecture: Daily Triage vs. Long-Term Overhauls", level=2)
    doc.add_paragraph(
        "• Network 1 (Daily Operational & Corrective Triage): Evaluates 2-hourly shift logs against empirical limits (steam pressure, feed pressure, stack temperature) to trigger immediate corrective alerts and same-shift work orders.\n"
        "• Network 2 (Lifecycle & Periodic Overhauls): Tracks cumulative running hours and calendar intervals to guide monthly, quarterly, semi-annual, and annual overhauls, spare parts budgeting, and shutdown scheduling."
    )

    doc.add_heading("Decision Support, Not Decision Automation", level=2)
    doc.add_paragraph(
        "LuminaFM does not act as an automated 'black box' and does not attempt to replace certified engineers. It organizes complex operational considerations into transparent, explainable recommendations—ensuring that the responsible Chief Engineer always retains final decision authority."
    )

    doc.add_page_break()

    # Section 6
    h6 = doc.add_heading(level=1)
    r6 = h6.add_run("6. The Bigger Vision: Growing Beyond Boilers")
    r6.font.color.rgb = RGBColor(15, 41, 74)
    h6.paragraph_format.space_before = Pt(14)
    h6.paragraph_format.space_after = Pt(6)

    doc.add_paragraph(
        "Although LuminaFM begins with boiler maintenance as its specialized research foundation, the long-term vision is to create an adaptable, modular enterprise CMMS capable of managing all critical mechanical, electrical, and plumbing (MEP) assets across diverse facilities."
    )

    doc.add_heading("The Core Engine + Specialist Equipment Modules Strategy", level=2)
    doc.add_paragraph(
        "Our architectural vision pairs a universal CMMS core with plug-in equipment intelligence modules:\n"
        "• Industrial Steam Boilers (Implemented Baseline): Steam/feed pressures, flue gas temperatures, burner run hours, blowdown routines, water level cut-offs, 35 validated maintenance activities.\n"
        "• Centrifugal & Screw Chillers (Future Roadmap): Refrigerant pressures, evaporator/condenser approach temperatures, compressor motor amps, oil level & acid analysis, condenser tube fouling.\n"
        "• Pumping & Hydronic Systems (Future Roadmap): Vibration signatures, mechanical seal leakage rates, suction/discharge pressures, bearing operating temperatures, motor Megger logs.\n"
        "• Diesel Standby Generators (Future Roadmap): Battery cranking voltage drops, fuel filtration differential pressure, coolant jacket temperatures, monthly off-load & full-load bank testing.\n"
        "• Air Handling Units (AHUs) (Future Roadmap): Filter differential pressure drops, supply/return air delta-T, belt tension and pulley alignment, fan bearing acoustics, condensate pan drainage."
    )

    doc.add_heading("Flexibility Across Diverse Facilities and Organizations", level=2)
    doc.add_paragraph(
        "The platform architecture is designed to support diverse operational settings:\n"
        "• Five-Star Hotels & Resorts: 24/7 guest comfort, hot water reliability, laundry continuity, and banquet readiness.\n"
        "• Hospitals & Healthcare Facilities: Stringent clean-air standards, sterilizer steam reliability, and emergency power readiness.\n"
        "• Commercial High-Rise Towers: Decentralized HVAC equipment, pumping systems, elevator reliability, and tenant requests.\n"
        "• Industrial Manufacturing Plants: Minimizing unplanned line downtime, optimizing energy use, and extending equipment lifespan."
    )

    doc.add_page_break()

    # Section 7
    h7 = doc.add_heading(level=1)
    r7 = h7.add_run("7. We Need Your Professional Experience")
    r7.font.color.rgb = RGBColor(15, 41, 74)
    h7.paragraph_format.space_before = Pt(14)
    h7.paragraph_format.space_after = Pt(6)

    doc.add_paragraph(
        "This document is not a commercial sales pitch. LuminaFM is currently in an active concept validation and refinement phase, and our highest priority is ensuring that the software reflects the practical, unvarnished realities of day-to-day facility maintenance.\n\n"
        "Software developers understand databases, code, and user interfaces. You understand buildings, mechanical plants, maintenance technicians, and operational crises. We need your expert perspective to challenge our assumptions, identify operational blind spots, and guide the evolution of this platform."
    )

    doc.add_heading("Ten Practical Questions for the Facility Management Expert", level=2)
    questions = [
        ("1. Real-World Relevance", "Does this concept address genuine, frustrating challenges that you and your maintenance teams face in daily facility operations?"),
        ("2. Workflow Completeness", "Reviewing the 10-step maintenance lifecycle in Section 3, what critical maintenance activities, shift handovers, or statutory compliance procedures are missing?"),
        ("3. Asset Information Depth", "When onboarding a major mechanical asset into a maintenance system, what specific technical data, warranty terms, and nameplate details are most essential for technicians?"),
        ("4. Chief Engineer Dashboard Priorities", "If you opened LuminaFM on your office desktop or tablet at 8:00 AM, what top three to five key metrics or alerts would you need to see immediately to feel in complete control of your facility?"),
        ("5. Balancing Preventive vs. Corrective Care", "In your facility, what percentage of maintenance work is planned preventive care versus reactive breakdown repair? How can a system best help your team shift toward proactive maintenance?"),
        ("6. Technician Usability on the Plant Floor", "Technicians often work in noisy, dimly lit boiler rooms and plant basements with dirty or wet hands. What practical obstacles cause technicians to resist using digital tools, and how can we design our screens to make their logging effortless?"),
        ("7. Work Prioritization Criteria", "When multiple work orders compete for your technicians' limited time on a busy day, what real-world factors carry the most weight (e.g., life safety, guest comfort impact, energy cost, statutory compliance)?"),
        ("8. Completeness of Boiler Maintenance", "Reviewing the boiler subsystems and 35 maintenance activities outlined in Section 4, are there critical failure modes, daily chemical water quality checks, or regulatory boiler inspections that you believe must be included?"),
        ("9. Practical Adoption Factors", "Many facilities purchase expensive commercial CMMS software only for it to be abandoned or used merely as a glorified electronic calendar. What specific practical capability would make LuminaFM indispensable to your department?"),
        ("10. Critical Guidance for Next-Phase Development", "What single recommendation, warning, or improvement would you give our development team before we proceed with the next phase of development?")
    ]
    for q_num, q_text in questions:
        p_q = doc.add_paragraph(style='List Number')
        r_q_num = p_q.add_run(f"{q_num}: ")
        r_q_num.bold = True
        p_q.add_run(q_text)

    doc.add_heading("Our Commitment to Practical Facility Management", level=2)
    p_commit = doc.add_paragraph()
    r_commit = p_commit.add_run(
        "\"We are not simply trying to build another maintenance recording system. Our aim is to develop a practical platform that helps FM professionals organize maintenance activities, understand equipment conditions, preserve operational knowledge, and make better-informed decisions.\n\n"
        "Your professional experience can help us ensure that LuminaFM is designed around real facility management needs.\""
    )
    r_commit.italic = True
    r_commit.font.color.rgb = RGBColor(180, 83, 9)

    doc.add_paragraph(
        "Contact & Review Submission: Please share your feedback, notes, and suggestions with the LuminaFM Research & Development Team. Every insight you provide will directly shape the design of our next software release. Thank you for your generous time and professional guidance."
    )

    doc.save(DOCX_PATH)
    print(f"[OK] DOCX successfully generated at: {DOCX_PATH}")


if __name__ == "__main__":
    create_pdf()
    create_docx()
