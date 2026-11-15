"""
LuminaFM Enterprise CMMS & Decision Support Platform
HTML User Manual Publisher (build_html_manual.py)
Compiles all Phase 1-8 documentation into an interactive, standalone HTML documentation portal.
"""

import os
import re
import html

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RELEASE_DIR = os.path.join(BASE_DIR, "release")
SCREENSHOTS_DIR = os.path.join(BASE_DIR, "screenshots", "annotated")

# Verified Document Sequence across Phases 1-8
DOCUMENT_SECTIONS = [
    {
        "id": "cover",
        "title": "Cover & Document Control",
        "file": None,
        "is_cover": True,
    },
    {
        "id": "intro",
        "title": "1. System Overview & Architecture",
        "files": [
            ("Root Documentation Architecture", os.path.join(BASE_DIR, "README.md")),
        ],
    },
    {
        "id": "account-nav",
        "title": "2. Getting Started & Navigation",
        "files": [
            ("Authentication & Simulation", os.path.join(BASE_DIR, "02-account-and-navigation", "login.md")),
            ("Navigation & Shell Architecture", os.path.join(BASE_DIR, "02-account-and-navigation", "navigation.md")),
        ],
    },
    {
        "id": "module-guides",
        "title": "3. Complete Module Guides",
        "files": [
            ("01. Command Center Dashboard", os.path.join(BASE_DIR, "03-module-guides", "01-command-center.md")),
            ("02. Asset Master & Hierarchy", os.path.join(BASE_DIR, "03-module-guides", "02-asset-management.md")),
            ("03. Maintenance Planning & PM Calendar", os.path.join(BASE_DIR, "03-module-guides", "03-maintenance-planning.md")),
            ("04. Work Orders & Work Management", os.path.join(BASE_DIR, "03-module-guides", "04-work-orders.md")),
            ("05. Inspections & Equipment Faults", os.path.join(BASE_DIR, "03-module-guides", "05-inspections-and-faults.md")),
            ("06. Daily Boiler Monitoring Logbook", os.path.join(BASE_DIR, "03-module-guides", "06-boiler-management.md")),
            ("07. Factory-Floor Operator Tablet Kiosk", os.path.join(BASE_DIR, "03-module-guides", "07-floor-operator-kiosk.md")),
            ("08. Decision Support & Reporting Suite", os.path.join(BASE_DIR, "03-module-guides", "08-decision-support-and-reporting.md")),
            ("09. Audit Trail & Evidence Vault", os.path.join(BASE_DIR, "03-module-guides", "09-audit-and-evidence-vault.md")),
            ("10. Maintenance Financial Cost Analysis", os.path.join(BASE_DIR, "03-module-guides", "10-maintenance-cost-analysis.md")),
            ("11. ANP Decision Governance", os.path.join(BASE_DIR, "03-module-guides", "11-decision-governance.md")),
            ("12. White-Label Branding & Settings", os.path.join(BASE_DIR, "03-module-guides", "12-white-label-and-settings.md")),
        ],
    },
    {
        "id": "modal-reference",
        "title": "4. Modals, Drawers & Form Reference",
        "files": [
            ("Modals Master Overview", os.path.join(BASE_DIR, "03-module-guides", "modal-reference", "README.md")),
            ("Work Orders Modals", os.path.join(BASE_DIR, "03-module-guides", "modal-reference", "01-work-orders-modals.md")),
            ("Inspections & Asset Drawers", os.path.join(BASE_DIR, "03-module-guides", "modal-reference", "02-inspections-and-assets-drawers.md")),
            ("Floor Kiosk Modals & Overlays", os.path.join(BASE_DIR, "03-module-guides", "modal-reference", "03-floor-kiosk-modals.md")),
            ("Decision & Reporting Modals", os.path.join(BASE_DIR, "03-module-guides", "modal-reference", "04-decision-reporting-modals.md")),
            ("Audit Trail & Evidence Modals", os.path.join(BASE_DIR, "03-module-guides", "modal-reference", "05-audit-and-evidence-modals.md")),
            ("Decision Governance Modals", os.path.join(BASE_DIR, "03-module-guides", "modal-reference", "06-governance-modals.md")),
            ("Navigation Popovers", os.path.join(BASE_DIR, "03-module-guides", "modal-reference", "07-navigation-popovers.md")),
        ],
    },
    {
        "id": "workflows",
        "title": "5. End-to-End Operational Workflows",
        "files": [
            ("Workflows Architecture Overview", os.path.join(BASE_DIR, "05-workflows", "README.md")),
            ("00. Full Lifecycle Maintenance", os.path.join(BASE_DIR, "05-workflows", "00-full-lifecycle-maintenance.md")),
            ("01. User Authentication & Role Switching", os.path.join(BASE_DIR, "05-workflows", "01-user-auth-and-rbac.md")),
            ("02. Tenant Branding & White-Label", os.path.join(BASE_DIR, "05-workflows", "02-white-label-branding.md")),
            ("03. Asset Catalog & Dynamic Attributes", os.path.join(BASE_DIR, "05-workflows", "03-asset-catalog-and-attributes.md")),
            ("04. Dual Equipment Hierarchy Navigation", os.path.join(BASE_DIR, "05-workflows", "04-equipment-hierarchies.md")),
            ("05. PM Scheduling & Dispatch", os.path.join(BASE_DIR, "05-workflows", "05-preventive-maintenance-scheduling.md")),
            ("06. Work Order Lifecycle State Machine", os.path.join(BASE_DIR, "05-workflows", "06-work-order-lifecycle.md")),
            ("07. Work Order Resource Tracking", os.path.join(BASE_DIR, "05-workflows", "07-work-order-resource-tracking.md")),
            ("08. Inspection Walkthrough & Faults", os.path.join(BASE_DIR, "05-workflows", "08-inspections-and-fault-escalation.md")),
            ("09. Desktop Daily Boiler Logbook", os.path.join(BASE_DIR, "05-workflows", "09-daily-boiler-logbook.md")),
            ("10. Floor Tablet Kiosk Operations", os.path.join(BASE_DIR, "05-workflows", "10-floor-kiosk-operations.md")),
            ("11. Offline Sync & Conflict Resolution", os.path.join(BASE_DIR, "05-workflows", "11-offline-sync-and-conflict-resolution.md")),
            ("12. Operational ANP Decision Review", os.path.join(BASE_DIR, "05-workflows", "12-operational-anp-decision-review.md")),
            ("13. Operational Alerts & Channels", os.path.join(BASE_DIR, "05-workflows", "13-operational-alerts-and-channels.md")),
            ("14. ANP Academic Baseline Validation", os.path.join(BASE_DIR, "05-workflows", "14-model-governance-baseline.md")),
            ("15. Commercial Model Versioning", os.path.join(BASE_DIR, "05-workflows", "15-commercial-model-versioning.md")),
            ("16. Compliance Audit & Evidence Package", os.path.join(BASE_DIR, "05-workflows", "16-compliance-audit-and-evidence-package.md")),
            ("17. Chiller Extensibility & Isolation", os.path.join(BASE_DIR, "05-workflows", "17-chiller-extensibility-and-isolation.md")),
        ],
    },
    {
        "id": "role-guides",
        "title": "6. Role-Based User Manuals",
        "files": [
            ("Role Architecture & Authorization Manual", os.path.join(BASE_DIR, "04-role-based-guides", "README.md")),
            ("Organization Admin Guide", os.path.join(BASE_DIR, "04-role-based-guides", "01-organization-admin-guide.md")),
            ("Plant Reliability Engineer Guide", os.path.join(BASE_DIR, "04-role-based-guides", "02-plant-reliability-engineer-guide.md")),
            ("Boiler Plant Operator Guide", os.path.join(BASE_DIR, "04-role-based-guides", "03-boiler-plant-operator-guide.md")),
            ("Maintenance Technician Guide", os.path.join(BASE_DIR, "04-role-based-guides", "04-maintenance-technician-guide.md")),
        ],
    },
    {
        "id": "device-guides",
        "title": "7. Responsive & Device-Specific Guides",
        "files": [
            ("Responsive Architecture Overview", os.path.join(BASE_DIR, "08-device-guides", "README.md")),
            ("Desktop Workstation Guide (1440 × 900)", os.path.join(BASE_DIR, "08-device-guides", "01-desktop-guide.md")),
            ("Tablet Landscape Guide (1180 × 820)", os.path.join(BASE_DIR, "08-device-guides", "02-tablet-landscape-guide.md")),
            ("Tablet Portrait Guide (820 × 1180)", os.path.join(BASE_DIR, "08-device-guides", "03-tablet-portrait-guide.md")),
            ("Mobile Phone Guide (390 × 844)", os.path.join(BASE_DIR, "08-device-guides", "04-mobile-phone-guide.md")),
            ("Industrial Kiosk Ergonomics & Offline Engine", os.path.join(BASE_DIR, "08-device-guides", "05-industrial-kiosk-ergonomics.md")),
            ("Responsive Compatibility Report", os.path.join(BASE_DIR, "08-device-guides", "06-responsive-compatibility-report.md")),
        ],
    },
    {
        "id": "troubleshooting",
        "title": "8. Troubleshooting & Diagnostics",
        "files": [
            ("Diagnostic Decision Tree & Taxonomy", os.path.join(BASE_DIR, "06-troubleshooting", "README.md")),
            ("01. Authentication & Session Issues", os.path.join(BASE_DIR, "06-troubleshooting", "01-authentication-and-session.md")),
            ("02. Form Validation & Input Errors", os.path.join(BASE_DIR, "06-troubleshooting", "02-form-validation-and-inputs.md")),
            ("03. Offline Sync & Network Interruption", os.path.join(BASE_DIR, "06-troubleshooting", "03-offline-sync-and-network.md")),
            ("04. Work Orders & State Machine Errors", os.path.join(BASE_DIR, "06-troubleshooting", "04-work-orders-and-state-machine.md")),
            ("05. Decision Support & Model Governance", os.path.join(BASE_DIR, "06-troubleshooting", "05-decision-support-and-governance.md")),
            ("06. Evidence Vault & Upload Issues", os.path.join(BASE_DIR, "06-troubleshooting", "06-evidence-vault-and-attachments.md")),
            ("Frequently Asked Questions (FAQ)", os.path.join(BASE_DIR, "07-reference", "faq.md")),
        ],
    },
    {
        "id": "reference",
        "title": "9. Reference Catalogs & Glossaries",
        "files": [
            ("Role & Permission Matrix", os.path.join(BASE_DIR, "07-reference", "permissions-matrix.md")),
            ("Master Field Reference", os.path.join(BASE_DIR, "07-reference", "field-reference.md")),
            ("Status & Priority Definitions", os.path.join(BASE_DIR, "07-reference", "status-and-priority-definitions.md")),
            ("Notifications Reference", os.path.join(BASE_DIR, "07-reference", "notifications-reference.md")),
            ("Quick Navigation Reference", os.path.join(BASE_DIR, "07-reference", "quick-navigation-reference.md")),
            ("UI Component Catalog", os.path.join(BASE_DIR, "07-reference", "ui-component-catalog.md")),
            ("Engineering Glossary", os.path.join(BASE_DIR, "07-reference", "glossary.md")),
        ],
    },
    {
        "id": "appendices",
        "title": "10. Appendices & Master Inventories",
        "files": [
            ("Routes Inventory", os.path.join(BASE_DIR, "inventory", "routes-inventory.md")),
            ("Pages Inventory", os.path.join(BASE_DIR, "inventory", "pages-inventory.md")),
            ("Components Inventory", os.path.join(BASE_DIR, "inventory", "components-inventory.md")),
            ("Modals Inventory", os.path.join(BASE_DIR, "inventory", "modals-inventory.md")),
            ("Screenshot Index (49 Figures)", os.path.join(BASE_DIR, "inventory", "screenshot-index.md")),
        ],
    },
]

def slugify(text):
    text = re.sub(r'[^a-zA-Z0-9\s-]', '', text).strip().lower()
    return re.sub(r'[\s]+', '-', text)

def normalize_image_path(raw_path):
    # Extracts the filename from any format (file:///..., absolute, or relative)
    filename = os.path.basename(raw_path.replace("\\", "/").split("?")[0].split("#")[0])
    # Relative path from release/ to screenshots/annotated/
    return f"../screenshots/annotated/{filename}"

def markdown_to_html(md_content, section_id):
    lines = md_content.split("\n")
    html_lines = []
    in_table = False
    table_header = []
    table_rows = []
    in_code_block = False
    code_lang = ""
    code_lines = []
    in_alert = False
    alert_type = ""
    alert_lines = []
    in_list = False
    list_type = "ul"

    def close_table():
        nonlocal in_table, table_header, table_rows
        if not in_table:
            return ""
        out = ['<div class="table-container"><table><thead><tr>']
        for th in table_header:
            out.append(f'<th>{inline_format(th)}</th>')
        out.append('</tr></thead><tbody>')
        for row in table_rows:
            out.append('<tr>')
            for td in row:
                out.append(f'<td>{inline_format(td)}</td>')
            out.append('</tr>')
        out.append('</tbody></table></div>')
        in_table = False
        table_header = []
        table_rows = []
        return "".join(out)

    def close_alert():
        nonlocal in_alert, alert_type, alert_lines
        if not in_alert:
            return ""
        cls = alert_type.lower()
        title = alert_type.upper()
        content = "<br/>".join([inline_format(l) for l in alert_lines])
        out = f'<div class="callout callout-{cls}"><div class="callout-header"><span class="callout-badge">{title}</span></div><div class="callout-body">{content}</div></div>'
        in_alert = False
        alert_type = ""
        alert_lines = []
        return out

    def close_list():
        nonlocal in_list, list_type
        if not in_list:
            return ""
        tag = list_type
        in_list = False
        return f"</{tag}>"

    def inline_format(text):
        # Escape raw HTML
        # Convert links
        # Convert images: ![caption](url)
        # Convert bold, italics, code, math

        # Images
        def img_replace(match):
            cap = match.group(1)
            url = match.group(2)
            rel_url = normalize_image_path(url)
            return f'''<figure class="screenshot-figure" onclick="openLightbox('{rel_url}', '{html.escape(cap)}')">
                <img src="{rel_url}" alt="{html.escape(cap)}" loading="lazy"/>
                <figcaption><span class="zoom-hint">🔍 Click to enlarge</span><span class="fig-title">{html.escape(cap)}</span></figcaption>
            </figure>'''

        text = re.sub(r'!\[(.*?)\]\((.*?)\)', img_replace, text)

        # Links: [text](url)
        def link_replace(match):
            ltxt = match.group(1)
            lurl = match.group(2)
            # if internal anchor or file link
            if "file:///" in lurl:
                # convert to image lightbox or clean anchor
                if lurl.endswith(".png"):
                    rel = normalize_image_path(lurl)
                    return f'<a href="javascript:void(0)" onclick="openLightbox(\'{rel}\', \'{html.escape(ltxt)}\')" class="doc-link image-link">{ltxt}</a>'
                else:
                    target_file = os.path.basename(lurl)
                    target_slug = slugify(target_file.replace(".md", ""))
                    return f'<a href="#{target_slug}" class="doc-link">{ltxt}</a>'
            return f'<a href="{lurl}" class="doc-link">{ltxt}</a>'

        text = re.sub(r'\[(.*?)\]\((.*?)\)', link_replace, text)

        # Bold: **text**
        text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
        # Italics: *text*
        text = re.sub(r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)', r'<em>\1</em>', text)
        # Inline code: `text`
        text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
        # Math: $text$
        text = re.sub(r'\$([^\$]+)\$', r'<span class="katex-math">\1</span>', text)
        return text

    for line in lines:
        stripped = line.strip()

        # Handle Code Blocks
        if stripped.startswith("```"):
            if in_code_block:
                in_code_block = False
                code_content = html.escape("\n".join(code_lines))
                html_lines.append(f'<div class="code-container"><div class="code-header font-mono">{code_lang or "text"}</div><pre><code class="language-{code_lang}">{code_content}</code></pre></div>')
                code_lines = []
                code_lang = ""
            else:
                html_lines.append(close_table())
                html_lines.append(close_alert())
                html_lines.append(close_list())
                in_code_block = True
                code_lang = stripped[3:].strip()
                code_lines = []
            continue

        if in_code_block:
            code_lines.append(line)
            continue

        # Handle Alert Callouts: > [!NOTE]
        alert_match = re.match(r'^>\s+\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)', stripped)
        if alert_match:
            html_lines.append(close_table())
            html_lines.append(close_alert())
            html_lines.append(close_list())
            in_alert = True
            alert_type = alert_match.group(1)
            extra = alert_match.group(2).strip()
            if extra:
                alert_lines.append(extra)
            continue

        if in_alert:
            if stripped.startswith(">"):
                alert_lines.append(stripped[1:].strip())
                continue
            elif not stripped:
                continue
            else:
                html_lines.append(close_alert())

        # Handle Markdown Tables
        if "|" in stripped and (stripped.startswith("|") or stripped.endswith("|")):
            cells = [c.strip() for c in stripped.split("|")[1:-1]]
            if not in_table:
                html_lines.append(close_list())
                in_table = True
                table_header = cells
                table_rows = []
                continue
            else:
                # Check if delimiter row
                if all(re.match(r'^:?-+:?$', c) for c in cells):
                    continue
                table_rows.append(cells)
                continue
        else:
            if in_table:
                html_lines.append(close_table())

        # Empty line
        if not stripped:
            html_lines.append(close_list())
            continue

        # Horizontal Rule
        if re.match(r'^-{3,}$', stripped) or re.match(r'^\*{3,}$', stripped):
            html_lines.append(close_list())
            html_lines.append('<hr class="doc-hr"/>')
            continue

        # Headers
        h_match = re.match(r'^(#{1,6})\s+(.+)$', stripped)
        if h_match:
            html_lines.append(close_list())
            level = len(h_match.group(1))
            htext = h_match.group(2).strip()
            anchor_id = slugify(htext)
            formatted_htext = inline_format(htext)
            html_lines.append(f'<h{level} id="{anchor_id}" class="doc-heading doc-h{level}"><a href="#{anchor_id}" class="heading-anchor">#</a>{formatted_htext}</h{level}>')
            continue

        # Standalone Images: ![caption](url)
        img_match = re.match(r'^!\[(.*?)\]\((.*?)\)$', stripped)
        if img_match:
            html_lines.append(close_list())
            cap = img_match.group(1)
            url = img_match.group(2)
            rel_url = normalize_image_path(url)
            html_lines.append(f'''<figure class="screenshot-figure" onclick="openLightbox('{rel_url}', '{html.escape(cap)}')">
                <img src="{rel_url}" alt="{html.escape(cap)}" loading="lazy"/>
                <figcaption><span class="zoom-hint">🔍 Click to enlarge</span><span class="fig-title">{html.escape(cap)}</span></figcaption>
            </figure>''')
            continue

        # Lists (unordered)
        if stripped.startswith("- ") or stripped.startswith("* "):
            if not in_list or list_type != "ul":
                html_lines.append(close_list())
                in_list = True
                list_type = "ul"
                html_lines.append("<ul>")
            item_text = inline_format(stripped[2:].strip())
            html_lines.append(f"<li>{item_text}</li>")
            continue

        # Lists (ordered)
        num_match = re.match(r'^(\d+)\.\s+(.+)$', stripped)
        if num_match:
            if not in_list or list_type != "ol":
                html_lines.append(close_list())
                in_list = True
                list_type = "ol"
                html_lines.append("<ol>")
            item_text = inline_format(num_match.group(2).strip())
            html_lines.append(f"<li>{item_text}</li>")
            continue

        # Standard Paragraph
        html_lines.append(close_list())
        html_lines.append(f"<p>{inline_format(stripped)}</p>")

    # Clean up any lingering open tags
    html_lines.append(close_table())
    html_lines.append(close_alert())
    html_lines.append(close_list())

    return "\n".join([line for line in html_lines if line])

def build_full_html():
    os.makedirs(RELEASE_DIR, exist_ok=True)
    out_file = os.path.join(RELEASE_DIR, "LuminaFM_User_Manual.html")

    print("[HTML Builder] Compiling LuminaFM Comprehensive User Manual HTML Portal...")

    # Build TOC structure and content sections
    toc_items = []
    content_sections = []

    for sec in DOCUMENT_SECTIONS:
        sec_id = sec["id"]
        sec_title = sec["title"]

        if sec.get("is_cover"):
            # Cover page HTML
            cover_html = f'''
            <section id="cover" class="manual-section cover-section">
                <div class="cover-card">
                    <div class="brand-badge font-mono">LUMINA FM™ • ENTERPRISE CMMS &amp; DECISION SUPPORT</div>
                    <h1 class="cover-title">Complete Visual User Guide &amp; Technical User Manual</h1>
                    <p class="cover-subtitle">Standard Operating Procedures, ASME Compliance, Plant Asset Management,Kingsbury ANP Decision-Support Governance, and Industrial Tablet Kiosk Architecture</p>
                    
                    <div class="metadata-grid">
                        <div class="meta-item">
                            <span class="meta-label">System Version</span>
                            <span class="meta-val font-mono">v1.4.0 Production Enterprise</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Publication Date</span>
                            <span class="meta-val font-mono">November 15, 2026</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Document ID</span>
                            <span class="meta-val font-mono">LFM-MAN-2026-v1.4</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Classification</span>
                            <span class="meta-val font-mono">Official / Facility Operations</span>
                        </div>
                    </div>

                    <div class="target-roles">
                        <span class="roles-label">Certified System Roles Covered:</span>
                        <div class="role-tags">
                            <span class="rtag rtag-admin">Organization Admin</span>
                            <span class="rtag rtag-eng">Plant Reliability Engineer</span>
                            <span class="rtag rtag-op">Boiler Plant Operator</span>
                            <span class="rtag rtag-tech">Maintenance Technician</span>
                        </div>
                    </div>
                </div>
            </section>
            '''
            content_sections.append(cover_html)
            toc_items.append((sec_id, sec_title, []))
            continue

        # File-based sections
        sub_items = []
        sec_body = []
        sec_body.append(f'<section id="{sec_id}" class="manual-section">')
        sec_body.append(f'<h1 class="chapter-title font-mono">{sec_title}</h1>')

        for item_title, file_path in sec.get("files", []):
            if os.path.exists(file_path):
                with open(file_path, "r", encoding="utf-8") as f:
                    raw_md = f.read()
                sub_id = slugify(item_title)
                sub_items.append((sub_id, item_title))
                converted_html = markdown_to_html(raw_md, sub_id)
                sec_body.append(f'<div id="{sub_id}" class="sub-article">')
                sec_body.append(f'<div class="sub-article-header"><h2 class="sub-title">{item_title}</h2><span class="sub-file-path font-mono">{os.path.basename(file_path)}</span></div>')
                sec_body.append(converted_html)
                sec_body.append('</div>')
            else:
                print(f"[Warning] File not found: {file_path}")

        sec_body.append('</section>')
        content_sections.append("\n".join(sec_body))
        toc_items.append((sec_id, sec_title, sub_items))

    # Build Navigation Sidebar HTML
    sidebar_html = ['<nav id="doc-nav" class="sidebar-nav">']
    sidebar_html.append('<div class="nav-header">')
    sidebar_html.append('<div class="brand-logo"><span class="logo-gold">LUMINA</span><span class="logo-indigo">FM</span></div>')
    sidebar_html.append('<div class="doc-badge font-mono">USER MANUAL v1.4</div>')
    sidebar_html.append('</div>')
    sidebar_html.append('<div class="search-box"><input type="text" id="manual-search" placeholder="Search manual..." onkeyup="filterTOC()"/></div>')
    sidebar_html.append('<ul class="toc-list" id="toc-tree">')

    for s_id, s_title, subs in toc_items:
        sidebar_html.append(f'<li class="toc-chapter"><a href="#{s_id}" class="toc-link font-semibold">{s_title}</a>')
        if subs:
            sidebar_html.append('<ul class="toc-sublist">')
            for sub_id, sub_title in subs:
                sidebar_html.append(f'<li class="toc-item"><a href="#{sub_id}" class="toc-sublink">{sub_title}</a></li>')
            sidebar_html.append('</ul>')
        sidebar_html.append('</li>')

    sidebar_html.append('</ul>')
    sidebar_html.append('</nav>')

    # Complete HTML Document
    full_html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LuminaFM™ Complete Visual User Guide &amp; Technical Manual</title>
    <style>
        :root {{
            --bg-midnight: #020617;
            --bg-card: #0f172a;
            --bg-card-alt: #1e293b;
            --border-slate: #1e293b;
            --border-highlight: #334155;
            --gold-500: #f59e0b;
            --gold-400: #fbbf24;
            --indigo-500: #6366f1;
            --indigo-400: #818cf8;
            --emerald-500: #10b981;
            --rose-500: #ef4444;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            background: var(--bg-midnight);
            color: var(--text-main);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 15px;
            line-height: 1.65;
            display: flex;
            min-height: 100vh;
        }}
        .font-mono {{ font-family: var(--font-mono); }}
        
        /* Layout */
        #doc-sidebar {{
            width: 320px;
            background: #090d16;
            border-right: 1px solid var(--border-slate);
            height: 100vh;
            position: sticky;
            top: 0;
            overflow-y: auto;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
        }}
        #doc-main {{
            flex: 1;
            padding: 40px 48px 120px;
            max-width: 1300px;
            overflow-x: hidden;
        }}

        /* Sidebar Styling */
        .nav-header {{ padding: 24px 20px; border-bottom: 1px solid var(--border-slate); }}
        .brand-logo {{ font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }}
        .logo-gold {{ color: var(--gold-400); }}
        .logo-indigo {{ color: var(--indigo-400); }}
        .doc-badge {{ font-size: 11px; color: var(--text-muted); margin-top: 4px; }}
        .search-box {{ padding: 12px 16px; border-bottom: 1px solid var(--border-slate); }}
        .search-box input {{
            width: 100%;
            background: var(--bg-card);
            border: 1px solid var(--border-highlight);
            color: #fff;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 13px;
            outline: none;
        }}
        .search-box input:focus {{ border-color: var(--gold-500); }}
        .toc-list {{ list-style: none; padding: 16px 12px; }}
        .toc-chapter {{ margin-bottom: 14px; }}
        .toc-link {{
            color: #cbd5e1;
            text-decoration: none;
            font-size: 13px;
            display: block;
            padding: 6px 10px;
            border-radius: 6px;
            transition: 0.15s;
        }}
        .toc-link:hover {{ background: #131c2e; color: #fff; }}
        .toc-sublist {{ list-style: none; padding-left: 14px; margin-top: 4px; border-left: 1px solid var(--border-slate); }}
        .toc-sublink {{
            color: #94a3b8;
            text-decoration: none;
            font-size: 12px;
            display: block;
            padding: 4px 8px;
            border-radius: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            transition: 0.15s;
        }}
        .toc-sublink:hover {{ color: var(--gold-400); background: #0f172a; }}

        /* Main Content Typography */
        h1.chapter-title {{
            font-size: 28px;
            color: var(--gold-400);
            border-bottom: 2px solid var(--border-highlight);
            padding-bottom: 12px;
            margin: 48px 0 24px;
            letter-spacing: -0.5px;
        }}
        .sub-article {{
            background: var(--bg-card);
            border: 1px solid var(--border-slate);
            border-radius: 16px;
            padding: 32px 36px;
            margin-bottom: 40px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }}
        .sub-article-header {{
            border-bottom: 1px solid var(--border-slate);
            padding-bottom: 16px;
            margin-bottom: 24px;
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 16px;
        }}
        .sub-title {{ font-size: 22px; color: #fff; font-weight: 700; }}
        .sub-file-path {{ font-size: 12px; color: var(--indigo-400); background: #1e1b4b; padding: 3px 8px; border-radius: 6px; }}
        
        .doc-heading {{ margin-top: 28px; margin-bottom: 12px; font-weight: 700; position: relative; }}
        .doc-h1 {{ font-size: 24px; color: #fff; }}
        .doc-h2 {{ font-size: 18px; color: var(--indigo-400); border-bottom: 1px solid var(--border-slate); padding-bottom: 6px; }}
        .doc-h3 {{ font-size: 15px; color: #38bdf8; }}
        .doc-h4 {{ font-size: 14px; color: #e2e8f0; }}
        .heading-anchor {{
            color: var(--border-highlight);
            text-decoration: none;
            margin-right: 8px;
            font-weight: normal;
        }}
        .heading-anchor:hover {{ color: var(--gold-400); }}

        p {{ margin-bottom: 16px; color: #cbd5e1; }}
        ul, ol {{ margin-bottom: 16px; padding-left: 24px; color: #cbd5e1; }}
        li {{ margin-bottom: 6px; }}
        strong {{ color: #fff; font-weight: 600; }}
        code {{
            font-family: var(--font-mono);
            background: #1e293b;
            color: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 13px;
        }}
        .doc-hr {{ border: none; border-top: 1px solid var(--border-slate); margin: 32px 0; }}
        .doc-link {{ color: var(--gold-400); text-decoration: none; border-bottom: 1px dotted var(--gold-500); }}
        .doc-link:hover {{ color: #fff; border-bottom-style: solid; }}

        /* Cover Section */
        .cover-card {{
            background: linear-gradient(135deg, #090d16 0%, #111827 100%);
            border: 2px solid var(--gold-500);
            border-radius: 20px;
            padding: 48px;
            margin-bottom: 48px;
            box-shadow: 0 10px 40px rgba(245, 158, 11, 0.15);
        }}
        .brand-badge {{
            color: var(--gold-400);
            font-size: 12px;
            letter-spacing: 2px;
            font-weight: 700;
            margin-bottom: 12px;
        }}
        .cover-title {{
            font-size: 34px;
            font-weight: 800;
            color: #fff;
            line-height: 1.25;
            margin-bottom: 16px;
        }}
        .cover-subtitle {{
            font-size: 17px;
            color: #94a3b8;
            max-width: 900px;
            line-height: 1.6;
            margin-bottom: 32px;
        }}
        .metadata-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            border-top: 1px solid var(--border-slate);
            padding-top: 24px;
            margin-bottom: 24px;
        }}
        .meta-label {{ display: block; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; }}
        .meta-val {{ display: block; font-size: 14px; font-weight: 600; color: #e2e8f0; margin-top: 4px; }}
        .target-roles {{ display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }}
        .roles-label {{ font-size: 12px; color: #64748b; text-transform: uppercase; font-family: var(--font-mono); }}
        .role-tags {{ display: flex; gap: 8px; flex-wrap: wrap; }}
        .rtag {{ font-size: 11px; font-family: var(--font-mono); font-weight: 700; padding: 4px 10px; border-radius: 6px; border: 1px solid; }}
        .rtag-admin {{ background: rgba(245, 158, 11, 0.15); color: #fbbf24; border-color: rgba(245, 158, 11, 0.4); }}
        .rtag-eng {{ background: rgba(99, 102, 241, 0.15); color: #a5b4fc; border-color: rgba(99, 102, 241, 0.4); }}
        .rtag-op {{ background: rgba(16, 185, 129, 0.15); color: #6ee7b7; border-color: rgba(16, 185, 129, 0.4); }}
        .rtag-tech {{ background: rgba(245, 158, 11, 0.1); color: #fcd34d; border-color: rgba(245, 158, 11, 0.3); }}

        /* Tables */
        .table-container {{
            width: 100%;
            overflow-x: auto;
            margin: 20px 0 28px;
            border: 1px solid var(--border-slate);
            border-radius: 10px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 13.5px;
            text-align: left;
        }}
        th {{
            background: #111c30;
            color: #f1f5f9;
            font-weight: 600;
            padding: 10px 14px;
            border-bottom: 1px solid var(--border-highlight);
            white-space: nowrap;
        }}
        td {{
            padding: 9px 14px;
            border-bottom: 1px solid var(--border-slate);
            color: #cbd5e1;
            vertical-align: top;
        }}
        tr:hover td {{ background: rgba(255,255,255,0.02); }}

        /* Screenshots & Lightbox */
        .screenshot-figure {{
            margin: 24px 0;
            background: #080c14;
            border: 1px solid var(--border-slate);
            border-radius: 12px;
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }}
        .screenshot-figure:hover {{
            border-color: var(--gold-500);
            box-shadow: 0 8px 30px rgba(0,0,0,0.5);
            transform: translateY(-2px);
        }}
        .screenshot-figure img {{
            width: 100%;
            height: auto;
            display: block;
            border-bottom: 1px solid var(--border-slate);
        }}
        figcaption {{
            padding: 12px 18px;
            font-size: 13px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #0c121e;
        }}
        .fig-title {{ font-weight: 600; color: #e2e8f0; }}
        .zoom-hint {{ font-size: 11px; font-family: var(--font-mono); color: var(--gold-400); }}

        /* Code Blocks */
        .code-container {{
            background: #080c14;
            border: 1px solid var(--border-slate);
            border-radius: 10px;
            margin: 20px 0;
            overflow: hidden;
        }}
        .code-header {{
            background: #111a2c;
            padding: 6px 14px;
            font-size: 11px;
            color: #94a3b8;
            border-bottom: 1px solid var(--border-slate);
            text-transform: uppercase;
        }}
        pre {{
            padding: 14px 18px;
            overflow-x: auto;
            font-family: var(--font-mono);
            font-size: 12.5px;
            color: #e2e8f0;
            line-height: 1.5;
        }}

        /* Callouts / Alerts */
        .callout {{
            border-left: 4px solid;
            border-radius: 8px;
            padding: 14px 18px;
            margin: 20px 0;
            background: #0d1527;
        }}
        .callout-header {{ margin-bottom: 6px; }}
        .callout-badge {{ font-size: 11px; font-family: var(--font-mono); font-weight: 700; padding: 2px 6px; border-radius: 4px; }}
        .callout-note {{ border-color: #3b82f6; }}
        .callout-note .callout-badge {{ background: #1e3a8a; color: #93c5fd; }}
        .callout-tip {{ border-color: #10b981; }}
        .callout-tip .callout-badge {{ background: #064e3b; color: #6ee7b7; }}
        .callout-important {{ border-color: #8b5cf6; }}
        .callout-important .callout-badge {{ background: #4c1d95; color: #c4b5fd; }}
        .callout-warning {{ border-color: #f59e0b; }}
        .callout-warning .callout-badge {{ background: #78350f; color: #fde68a; }}
        .callout-caution {{ border-color: #ef4444; }}
        .callout-caution .callout-badge {{ background: #7f1d1d; color: #fca5a5; }}

        /* Interactive Lightbox */
        #lightbox-modal {{
            display: none;
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: rgba(2, 6, 23, 0.94);
            backdrop-filter: blur(12px);
            align-items: center;
            justify-content: center;
            padding: 24px;
        }}
        #lightbox-modal.active {{ display: flex; }}
        .lightbox-content {{
            max-width: 95vw;
            max-height: 90vh;
            background: #0f172a;
            border: 1px solid var(--border-highlight);
            border-radius: 16px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.75);
        }}
        .lightbox-header {{
            padding: 12px 20px;
            background: #0b1120;
            border-bottom: 1px solid var(--border-slate);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }}
        .lightbox-title {{ font-size: 14px; font-weight: 600; color: #fff; }}
        .lightbox-close {{
            background: none;
            border: none;
            color: #94a3b8;
            font-size: 24px;
            cursor: pointer;
            padding: 0 8px;
            line-height: 1;
        }}
        .lightbox-close:hover {{ color: #fff; }}
        .lightbox-body {{
            overflow: auto;
            padding: 16px;
            text-align: center;
            background: #020617;
        }}
        .lightbox-body img {{
            max-width: 100%;
            max-height: 75vh;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }}

        /* Responsive */
        @media (max-width: 1024px) {{
            body {{ flex-direction: column; }}
            #doc-sidebar {{ width: 100%; height: auto; position: static; }}
            #doc-main {{ padding: 24px 20px 80px; }}
        }}
    </style>
</head>
<body>

    <!-- Sticky Navigation Sidebar -->
    <aside id="doc-sidebar">
        {"".join(sidebar_html)}
    </aside>

    <!-- Main Content Stream -->
    <main id="doc-main">
        {"".join(content_sections)}
    </main>

    <!-- Interactive Lightbox Modal -->
    <div id="lightbox-modal" onclick="closeLightbox(event)">
        <div class="lightbox-content" onclick="event.stopPropagation()">
            <div class="lightbox-header">
                <span id="lightbox-caption" class="lightbox-title">Screenshot Preview</span>
                <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
            </div>
            <div class="lightbox-body">
                <img id="lightbox-img" src="" alt="Screenshot"/>
            </div>
        </div>
    </div>

    <script>
        function openLightbox(src, caption) {{
            const modal = document.getElementById('lightbox-modal');
            const img = document.getElementById('lightbox-img');
            const cap = document.getElementById('lightbox-caption');
            img.src = src;
            cap.innerText = caption;
            modal.classList.add('active');
        }}

        function closeLightbox() {{
            document.getElementById('lightbox-modal').classList.remove('active');
        }}

        document.addEventListener('keydown', function(e) {{
            if (e.key === 'Escape') closeLightbox();
        }});

        function filterTOC() {{
            const input = document.getElementById('manual-search').value.toLowerCase();
            const items = document.querySelectorAll('.toc-item');
            const chapters = document.querySelectorAll('.toc-chapter');

            items.forEach(item => {{
                const txt = item.innerText.toLowerCase();
                if (txt.includes(input)) {{
                    item.style.display = '';
                }} else {{
                    item.style.display = 'none';
                }}
            }});

            chapters.forEach(ch => {{
                const chTxt = ch.innerText.toLowerCase();
                if (chTxt.includes(input)) {{
                    ch.style.display = '';
                }} else {{
                    ch.style.display = 'none';
                }}
            }});
        }}
    </script>
</body>
</html>'''

    with open(out_file, "w", encoding="utf-8") as f:
        f.write(full_html)

    size = os.path.getsize(out_file)
    print(f"[HTML Builder] Successfully generated: {out_file} ({size:,} bytes)")
    return out_file, size

if __name__ == "__main__":
    build_full_html()
