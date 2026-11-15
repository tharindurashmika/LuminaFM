"""
LuminaFM Screenshot Annotation Engine
Generates crisp, professional annotated versions of all captured screenshots.
Draws numbered circular markers, highlight boxes, and callout labels.
"""

import os
import glob
from PIL import Image, ImageDraw, ImageFont

ORIGINAL_DIR = os.path.abspath("docs/user-manual/screenshots/original")
ANNOTATED_DIR = os.path.abspath("docs/user-manual/screenshots/annotated")

os.makedirs(ANNOTATED_DIR, exist_ok=True)

# Design System Colors for Annotations
GOLD = (212, 175, 55)         # #D4AF37 Primary Gold
GOLD_DARK = (180, 138, 30)    # #B48A1E Dark Gold
INDIGO_DARK = (30, 27, 75)    # #1E1B4B Deep Indigo
INDIGO_LIGHT = (129, 140, 248)# #818CF8 Accent Indigo
WHITE = (248, 250, 252)       # Slate 50
SHADOW = (0, 0, 0, 180)

# Annotation definitions mapped by screenshot prefix
ANNOTATION_SPECS = {
    "DASH-001": [
        {"num": 1, "pos": (30, 25), "label": "Top Navigation Header & Brand Logo"},
        {"num": 2, "pos": (18, 140), "label": "Sidebar Operations Navigation (12 Modules)"},
        {"num": 3, "pos": (300, 180), "label": "Critical Safety Alert (Direct Escalation)"},
        {"num": 4, "pos": (300, 280), "label": "Executive Facility KPI Cards Grid"},
        {"num": 5, "pos": (300, 480), "label": "Chiller Extensibility Demonstration Card"},
        {"num": 6, "pos": (300, 680), "label": "Recent Work Orders & Preventive Schedules"},
    ],
    "DASH-002": [
        {"num": 1, "pos": (30, 25), "label": "Tablet Landscape Header"},
        {"num": 2, "pos": (290, 160), "label": "Safety Escalation Banner"},
        {"num": 3, "pos": (290, 260), "label": "Touch-Optimized KPI Cards"},
    ],
    "DASH-003": [
        {"num": 1, "pos": (30, 25), "label": "Tablet Portrait Header & Navigation"},
        {"num": 2, "pos": (40, 160), "label": "Stacked Safety Alert Card"},
        {"num": 3, "pos": (40, 320), "label": "Vertical Responsive KPI Stack"},
    ],
    "DASH-004": [
        {"num": 1, "pos": (20, 20), "label": "Mobile Sticky Topbar & Hamburger Trigger"},
        {"num": 2, "pos": (20, 100), "label": "Mobile Safety Alert Card"},
        {"num": 3, "pos": (20, 260), "label": "Single-Column Metric Cards"},
    ],
    "AUTH-001": [
        {"num": 1, "pos": (470, 120), "label": "LuminaFM Dynamic Gold Crest Logo"},
        {"num": 2, "pos": (470, 240), "label": "Credential Authentication Form"},
        {"num": 3, "pos": (470, 490), "label": "Quick Role Simulation Launchers (4 Roles)"},
        {"num": 4, "pos": (470, 710), "label": "White-Label Client Brand Launcher"},
    ],
    "AUTH-002": [
        {"num": 1, "pos": (30, 80), "label": "Mobile Brand Crest"},
        {"num": 2, "pos": (30, 210), "label": "Touch-Friendly Login Inputs"},
        {"num": 3, "pos": (30, 480), "label": "Mobile Quick Role Buttons"},
    ],
    "ASSET-001": [
        {"num": 1, "pos": (300, 120), "label": "Multi-Dimensional Filter Bar (Site, Category, Status)"},
        {"num": 2, "pos": (1200, 120), "label": "Data Export Actions (CSV / JSON)"},
        {"num": 3, "pos": (300, 200), "label": "Asset Summary Cards with Dynamic Attributes"},
        {"num": 4, "pos": (300, 830), "label": "Pagination Controls & Page Size Selector"},
    ],
    "ASSET-002": [
        {"num": 1, "pos": (300, 200), "label": "Background Dimmed Asset Registry"},
        {"num": 2, "pos": (920, 50), "label": "Slide-Over Asset Detail Drawer"},
        {"num": 3, "pos": (950, 170), "label": "Dynamic Technical Specifications (JSONB)"},
        {"num": 4, "pos": (950, 420), "label": "Operating Meters & Work Order History"},
    ],
    "HIER-001": [
        {"num": 1, "pos": (300, 120), "label": "Hierarchy View Switcher (Physical vs System)"},
        {"num": 2, "pos": (300, 200), "label": "Interactive Location Tree Navigator"},
        {"num": 3, "pos": (850, 200), "label": "Selected Equipment Detail Inspector"},
    ],
    "HIER-002": [
        {"num": 1, "pos": (540, 120), "label": "Active System & Process Loop Tab"},
        {"num": 2, "pos": (300, 200), "label": "Thermal & Utility Loop Tree (Steam, Condensate, CW)"},
        {"num": 3, "pos": (850, 200), "label": "Process Loop Asset Dependencies & Export"},
    ],
    "CAL-001": [
        {"num": 1, "pos": (300, 120), "label": "Month Grid vs Schedules Tab Switcher"},
        {"num": 2, "pos": (300, 190), "label": "Overdue & Due Next 7 Days Summary Badges"},
        {"num": 3, "pos": (300, 270), "label": "Interactive Month Calendar Grid with PM Pills"},
    ],
    "CAL-002": [
        {"num": 1, "pos": (540, 120), "label": "Recurring PM Schedules List Tab"},
        {"num": 2, "pos": (300, 200), "label": "Filter by Priority & Overdue Toggle"},
        {"num": 3, "pos": (1200, 260), "label": "On-Demand Work Order Generation Trigger"},
    ],
    "INSP-001": [
        {"num": 1, "pos": (300, 120), "label": "Inspections vs Fault History Tabs"},
        {"num": 2, "pos": (300, 190), "label": "Walkthrough Inspections Register Table"},
        {"num": 3, "pos": (1200, 260), "label": "View Checklist Responses Trigger"},
    ],
    "INSP-002": [
        {"num": 1, "pos": (450, 100), "label": "Inspection Detail Modal Header"},
        {"num": 2, "pos": (480, 220), "label": "Walkthrough Checkpoints & Verification States"},
        {"num": 3, "pos": (480, 480), "label": "Inspector Signature & Meter Observations"},
    ],
    "INSP-003": [
        {"num": 1, "pos": (540, 120), "label": "Fault History Tab"},
        {"num": 2, "pos": (300, 200), "label": "Equipment Failure Modes & Severity Badges"},
        {"num": 3, "pos": (1180, 270), "label": "Convert Fault to Work Order Trigger"},
    ],
    "LOG-001": [
        {"num": 1, "pos": (300, 120), "label": "Boiler Selection & Shift Time Period"},
        {"num": 2, "pos": (300, 250), "label": "Real-Time Telemetry Numerical Inputs with Range Alerts"},
        {"num": 3, "pos": (300, 560), "label": "Walkthrough Checkpoints (Sight Glass, Blowdown, Burner)"},
        {"num": 4, "pos": (300, 780), "label": "Photo Attachment Upload & Submit Shift Log"},
    ],
    "LOG-002": [
        {"num": 1, "pos": (560, 120), "label": "Historical Shift Archive Tab"},
        {"num": 2, "pos": (300, 200), "label": "Past 2-Hourly Shift Records Table"},
        {"num": 3, "pos": (1200, 270), "label": "Inspect Historical Shift Telemetry Snapshot"},
    ],
    "KIOSK-001": [
        {"num": 1, "pos": (30, 25), "label": "Kiosk Top Bar (Sync State, Clock, Fullscreen)"},
        {"num": 2, "pos": (40, 120), "label": "Industrial QR Scanner Trigger"},
        {"num": 3, "pos": (40, 240), "label": "Large Touch Target Telemetry Inputs (44px+)"},
        {"num": 4, "pos": (40, 680), "label": "Glove Rocker Switches for Physical Checkpoints"},
        {"num": 5, "pos": (40, 1080), "label": "Offline Save Draft & Instant Submission"},
    ],
    "KIOSK-002": [
        {"num": 1, "pos": (30, 25), "label": "Landscape Kiosk Navigation"},
        {"num": 2, "pos": (50, 140), "label": "Dual-Column Touch Input Layout"},
        {"num": 3, "pos": (620, 140), "label": "Touch Rocker Switch Checkpoints"},
    ],
    "KIOSK-003": [
        {"num": 1, "pos": (40, 240), "label": "Active Telemetry Field"},
        {"num": 2, "pos": (220, 520), "label": "Oversized Glove Numpad Overlay (64px Touch Targets)"},
        {"num": 3, "pos": (220, 880), "label": "Preset Quick-Tap Numerical Value Buttons"},
    ],
    "KIOSK-004": [
        {"num": 1, "pos": (180, 200), "label": "Industrial QR Scanner Viewport"},
        {"num": 2, "pos": (210, 500), "label": "Manual Asset Code Fallback Input"},
        {"num": 3, "pos": (210, 650), "label": "Camera Device Selector & Cancel Trigger"},
    ],
    "KIOSK-005": [
        {"num": 1, "pos": (450, 40), "label": "Slide-Over Offline Sync Queue Drawer"},
        {"num": 2, "pos": (480, 160), "label": "IndexedDB Pending Submissions Queue"},
        {"num": 3, "pos": (480, 400), "label": "Sync Now & Conflict Resolution Actions"},
    ],
    "WO-001": [
        {"num": 1, "pos": (300, 120), "label": "List vs Kanban Board View Switcher"},
        {"num": 2, "pos": (300, 180), "label": "Status Filters, Search, and Priority Selector"},
        {"num": 3, "pos": (1200, 180), "label": "New Work Order Action Button"},
        {"num": 4, "pos": (300, 260), "label": "Work Orders Table with State Transitions"},
    ],
    "WO-002": [
        {"num": 1, "pos": (540, 120), "label": "Interactive Kanban Board View"},
        {"num": 2, "pos": (300, 200), "label": "Kanban Status Columns (Draft -> Completed)"},
        {"num": 3, "pos": (310, 320), "label": "Work Order Kanban Cards with Priority Badges"},
    ],
    "WO-003": [
        {"num": 1, "pos": (450, 120), "label": "Create Work Order Modal Header"},
        {"num": 2, "pos": (480, 220), "label": "Work Order Title, Asset Selector & Priority"},
        {"num": 3, "pos": (480, 480), "label": "Estimated Hours & Scope of Work Description"},
        {"num": 4, "pos": (800, 650), "label": "Submit Work Order Action Trigger"},
    ],
    "WO-004": [
        {"num": 1, "pos": (380, 80), "label": "Work Order Detail Modal & Lifecycle State"},
        {"num": 2, "pos": (410, 200), "label": "Maintenance Task Checklist Items"},
        {"num": 3, "pos": (410, 420), "label": "Technician Labor Hours Tracking"},
        {"num": 4, "pos": (410, 620), "label": "Spare Parts Inventory Consumed & Total Cost"},
    ],
    "REP-001": [
        {"num": 1, "pos": (300, 120), "label": "Decision & Reporting Navigation Tabs (5 Tabs)"},
        {"num": 2, "pos": (300, 200), "label": "ANP Maintenance Decision Run Selector"},
        {"num": 3, "pos": (300, 300), "label": "Ranked Maintenance Recommendations Grid"},
        {"num": 4, "pos": (300, 600), "label": "ANP Priority Scores & Criteria Influence Weights"},
    ],
    "REP-002": [
        {"num": 1, "pos": (540, 120), "label": "Operational Abnormalities Tab"},
        {"num": 2, "pos": (300, 200), "label": "Active Parameter Threshold Excursions"},
        {"num": 3, "pos": (1200, 280), "label": "Formal Alert Acknowledgement Trigger"},
    ],
    "REP-003": [
        {"num": 1, "pos": (450, 160), "label": "Alert Acknowledgement Modal Header"},
        {"num": 2, "pos": (480, 260), "label": "Excursion Value & Operational Reading Context"},
        {"num": 3, "pos": (480, 420), "label": "Mitigation Comments & Assignee Selector"},
    ],
    "REP-004": [
        {"num": 1, "pos": (740, 120), "label": "Telemetry Historical Trends Tab"},
        {"num": 2, "pos": (300, 200), "label": "Parameter Trend Curves (Steam Pressure, Flue Gas Temp)"},
        {"num": 3, "pos": (300, 520), "label": "Water Quality TDS & Conductivity Time Series"},
    ],
    "REP-005": [
        {"num": 1, "pos": (950, 120), "label": "Alert Channels & Report Export Tab"},
        {"num": 2, "pos": (300, 200), "label": "Multi-Channel Alert Dispatch Configs (Email, SMS, Webhook)"},
        {"num": 3, "pos": (300, 500), "label": "Print Official PDF Compliance Report Trigger"},
    ],
    "REP-006": [
        {"num": 1, "pos": (450, 160), "label": "Notification Channel Configuration Modal"},
        {"num": 2, "pos": (480, 260), "label": "Channel Type Selector (Email, Webhook, SMS, PagerDuty)"},
        {"num": 3, "pos": (480, 440), "label": "Endpoint URI / Recipient & Severity Threshold"},
    ],
    "AUDIT-001": [
        {"num": 1, "pos": (300, 120), "label": "Audit Trail & Evidence Vault Tabs (4 Tabs)"},
        {"num": 2, "pos": (300, 200), "label": "Search & Filter by Entity and Action Type"},
        {"num": 3, "pos": (300, 280), "label": "Immutable Audit Log Table with IP & Actor Attribution"},
        {"num": 4, "pos": (300, 480), "label": "Expanded Before / After JSON Diff View"},
    ],
    "AUDIT-002": [
        {"num": 1, "pos": (500, 120), "label": "Secure Evidence Vault Tab"},
        {"num": 2, "pos": (300, 200), "label": "Evidence Attachment Register with SHA-256 Checksums"},
        {"num": 3, "pos": (1200, 200), "label": "Upload Evidence Action Button"},
    ],
    "AUDIT-003": [
        {"num": 1, "pos": (450, 140), "label": "Evidence Upload Modal Header"},
        {"num": 2, "pos": (480, 240), "label": "File Selector & Associated Asset Dropdown"},
        {"num": 3, "pos": (480, 440), "label": "Data Classification Level (Public to Restricted)"},
    ],
    "AUDIT-004": [
        {"num": 1, "pos": (670, 120), "label": "Compliance Records Tab"},
        {"num": 2, "pos": (300, 200), "label": "Regulatory Standards Register (ASME, NB-23, ISO 55001)"},
        {"num": 3, "pos": (1200, 280), "label": "Sign Off Compliance Status Trigger"},
    ],
    "AUDIT-005": [
        {"num": 1, "pos": (450, 160), "label": "Compliance Verification Modal Header"},
        {"num": 2, "pos": (480, 260), "label": "Regulatory Clause Verification Findings"},
        {"num": 3, "pos": (480, 440), "label": "Verification Status & Auditor Sign-Off Notes"},
    ],
    "AUDIT-006": [
        {"num": 1, "pos": (880, 120), "label": "Evidence Packages Tab"},
        {"num": 2, "pos": (300, 200), "label": "Compiled Regulatory Dossiers with SHA-256 Manifests"},
        {"num": 3, "pos": (1200, 200), "label": "Build Compliance Package Trigger"},
    ],
    "AUDIT-007": [
        {"num": 1, "pos": (450, 140), "label": "Evidence Package Builder Modal Header"},
        {"num": 2, "pos": (480, 240), "label": "Target Regulatory Standard & Scope Date Range"},
        {"num": 3, "pos": (480, 420), "label": "Included Evidence Checkboxes (Logs, Inspections, Photos)"},
    ],
    "COST-001": [
        {"num": 1, "pos": (300, 120), "label": "Maintenance Financial Cost Executive Summary"},
        {"num": 2, "pos": (300, 220), "label": "Proactive Maintenance Ratio Gauge (72.4% vs 80% Target)"},
        {"num": 3, "pos": (300, 440), "label": "Cost Breakdown: Labor vs Parts vs Contractor Invoices"},
        {"num": 4, "pos": (300, 680), "label": "Spend by Asset Category Breakdown Table"},
    ],
    "GOV-001": [
        {"num": 1, "pos": (300, 120), "label": "ANP Model Governance Tabs (Baseline, Diff, Commercial)"},
        {"num": 2, "pos": (300, 200), "label": "Kingsbury Dissertation Baseline (14 Criteria, 4 Clusters)"},
        {"num": 3, "pos": (300, 420), "label": "Literature References & 5 Anonymized Expert Profiles"},
        {"num": 4, "pos": (300, 680), "label": "Pairwise Supermatrix Consistency Ratios (CR < 0.10)"},
    ],
    "GOV-002": [
        {"num": 1, "pos": (450, 120), "label": "Criterion Governance Details Modal Header"},
        {"num": 2, "pos": (480, 220), "label": "Criterion Literature Citations (DOI / Published Papers)"},
        {"num": 3, "pos": (480, 420), "label": "5 Expert Judgments & Relevance Ratings"},
    ],
    "GOV-003": [
        {"num": 1, "pos": (540, 120), "label": "Model Version Comparison Diff Tab"},
        {"num": 2, "pos": (300, 200), "label": "Model A vs Model B Selector"},
        {"num": 3, "pos": (300, 320), "label": "Side-by-Side Supermatrix Weight Shifts & Ranking Drift"},
    ],
    "GOV-004": [
        {"num": 1, "pos": (780, 120), "label": "Commercial Configurations Tab"},
        {"num": 2, "pos": (300, 200), "label": "Commercial Models List with Academic Validation Disclaimers"},
        {"num": 3, "pos": (1200, 200), "label": "Propose New Model Version Action Trigger"},
    ],
    "GOV-005": [
        {"num": 1, "pos": (450, 140), "label": "Propose Model Version Modal Header"},
        {"num": 2, "pos": (480, 240), "label": "Model Code, Version Name & Base Template"},
        {"num": 3, "pos": (480, 420), "label": "Engineering Justification for Model Variant"},
    ],
    "SET-001": [
        {"num": 1, "pos": (300, 120), "label": "White-Label Branding Settings Tab"},
        {"num": 2, "pos": (300, 200), "label": "Client Logo File Upload with Instant Live Preview"},
        {"num": 3, "pos": (300, 440), "label": "Preset Corporate Logos & Reset to LuminaFM Crest"},
    ],
    "SET-002": [
        {"num": 1, "pos": (520, 120), "label": "Regional & Localization Settings Tab"},
        {"num": 2, "pos": (300, 200), "label": "Facility Timezone & Base Currency Selector"},
    ],
    "SET-003": [
        {"num": 1, "pos": (740, 120), "label": "Deployment Architecture Tab"},
        {"num": 2, "pos": (300, 200), "label": "SaaS vs Dedicated Infrastructure Mode Indicator"},
        {"num": 3, "pos": (300, 360), "label": "Isolated Tenant UUID & PostgreSQL Pool Metrics"},
    ],
    "NAV-001": [
        {"num": 1, "pos": (1180, 20), "label": "Active User Role Indicator in Top Navigation"},
        {"num": 2, "pos": (1140, 75), "label": "Interactive RBAC Role Selector Dropdown (4 Roles)"},
        {"num": 3, "pos": (1140, 240), "label": "Instantaneous Role Switch & Permission Recomputation"},
    ],
}

def draw_badge(draw, x, y, num, radius=16):
    """Draws a premium gold circular numbered badge with dark gold border."""
    # Outer circle with shadow
    draw.ellipse([x - radius - 2, y - radius - 2, x + radius + 2, y + radius + 2], fill=INDIGO_DARK, outline=GOLD, width=2)
    draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=GOLD, outline=GOLD_DARK, width=2)
    # Number text
    text = str(num)
    bbox = draw.textbbox((0, 0), text)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    draw.text((x - w / 2, y - h / 2 - 2), text, fill=INDIGO_DARK, font=None)

def draw_callout(draw, x, y, num, label):
    """Draws a numbered callout box with text label."""
    draw_badge(draw, x, y, num)
    
    # Text box to the right of the badge
    tx = x + 24
    ty = y - 12
    bbox = draw.textbbox((tx, ty), f" {label} ")
    padding = 4
    rect = [bbox[0] - padding, bbox[1] - padding, bbox[2] + padding, bbox[3] + padding]
    
    draw.rectangle(rect, fill=INDIGO_DARK, outline=GOLD, width=1)
    draw.text((tx, ty), f" {label} ", fill=WHITE, font=None)

def annotate_image(image_path):
    base_name = os.path.basename(image_path)
    prefix = base_name.split("-")[0] + "-" + base_name.split("-")[1]
    
    out_name = base_name.replace(".png", "-annotated.png")
    out_path = os.path.join(ANNOTATED_DIR, out_name)
    
    img = Image.open(image_path).convert("RGB")
    draw = ImageDraw.Draw(img)
    
    specs = ANNOTATION_SPECS.get(prefix, [])
    if not specs:
        # Default fallback generic markers if prefix not explicitly mapped
        specs = [
            {"num": 1, "pos": (40, 30), "label": "Navigation & Header"},
            {"num": 2, "pos": (300, 160), "label": "Main Content View"},
            {"num": 3, "pos": (300, 340), "label": "Interactive Panel"},
        ]
        
    for item in specs:
        draw_callout(draw, item["pos"][0], item["pos"][1], item["num"], item["label"])
        
    img.save(out_path, "PNG")
    print(f"[ANNOTATED] {out_name} (with {len(specs)} callout markers)")

def main():
    print("--- STARTING SCREENSHOT ANNOTATION PROCESS ---")
    files = sorted(glob.glob(os.path.join(ORIGINAL_DIR, "*.png")))
    if not files:
        print("No original screenshots found in", ORIGINAL_DIR)
        return
        
    print(f"Found {len(files)} original screenshots to annotate.")
    for f in files:
        annotate_image(f)
        
    annotated_files = glob.glob(os.path.join(ANNOTATED_DIR, "*.png"))
    print(f"\nSuccessfully generated {len(annotated_files)} annotated screenshots!")

if __name__ == "__main__":
    main()
