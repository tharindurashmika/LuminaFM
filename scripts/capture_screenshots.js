/**
 * LuminaFM UI Screenshot Capture Automation Engine
 * Connects directly to Google Chrome via Chrome DevTools Protocol (CDP)
 * Drives the live LuminaFM React SPA across all routes, viewports, and modal states.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 4600;
const CDP_PORT = 9226;
const DIST_DIR = path.resolve('frontend/dist');
const OUT_DIR = path.resolve('docs/user-manual/screenshots/original');

// Ensure output directory exists
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// 1. Static SPA Server with Mock API Fallbacks
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];

  // Return empty 200 for mock API requests if needed
  if (reqPath.startsWith('/api/')) {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
    });
    res.end(JSON.stringify({ success: true, data: [] }));
    return;
  }

  let filePath = path.join(DIST_DIR, reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  } catch (err) {
    res.writeHead(500);
    res.end('Server error');
  }
});

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`LuminaFM SPA Server listening at http://127.0.0.1:${PORT}`);
  try {
    await runCapturePipeline();
  } catch (err) {
    console.error('Fatal capture error:', err);
  } finally {
    server.close(() => {
      console.log('Server stopped.');
      process.exit(0);
    });
  }
});

async function runCapturePipeline() {
  console.log('Launching Headless Chrome for CDP Automation...');
  const tmpUserData = path.resolve('tmp-chrome-profile');
  if (!fs.existsSync(tmpUserData)) {
    fs.mkdirSync(tmpUserData, { recursive: true });
  }

  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${tmpUserData}`,
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-sync',
    '--no-first-run',
    'about:blank'
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  chromeProc.on('error', err => console.error('Chrome spawn error:', err));

  // Get WebSocket debugger URL from stderr
  const wsUrl = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for DevTools listening')), 10000);
    chromeProc.stderr.on('data', d => {
      const text = d.toString();
      const m = text.match(/DevTools listening on (ws:\/\/[^\s\r\n]+)/);
      if (m) {
        clearTimeout(timeout);
        resolve(m[1]);
      }
    });
  });

  console.log('Connected to Chrome DevTools at:', wsUrl);

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let msgId = 1;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  // Create primary browser target page
  const target = await send('Target.createTarget', { url: 'about:blank' });
  const targetId = target.result.targetId;
  const attach = await send('Target.attachToTarget', { targetId, flatten: true });
  const sessionId = attach.result.sessionId;

  function callSession(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, (msg) => resolve(msg.result));
      ws.send(JSON.stringify({ id, sessionId, method, params }));
    });
  }

  await callSession('Page.enable');
  await callSession('Runtime.enable');
  await callSession('DOM.enable');

  async function evaluate(expression) {
    const res = await callSession('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res?.result?.value;
  }

  async function setViewport(width, height) {
    await callSession('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600
    });
  }

  async function navigate(routePath) {
    await callSession('Page.navigate', { url: `http://127.0.0.1:${PORT}${routePath}` });
    // Allow DOM to settle
    await new Promise(r => setTimeout(r, 1200));
  }

  async function capture(filename) {
    const outPath = path.join(OUT_DIR, filename);
    const screenshot = await callSession('Page.captureScreenshot', { format: 'png' });
    if (screenshot && screenshot.data) {
      fs.writeFileSync(outPath, Buffer.from(screenshot.data, 'base64'));
      const stats = fs.statSync(outPath);
      console.log(`[CAPTURED] ${filename} (${stats.size} bytes)`);
    } else {
      console.error(`[ERROR] Failed to capture ${filename}`);
    }
  }

  // MASTER CAPTURE PLAN (50 Screenshots)
  console.log('\n--- STARTING SYSTEMATIC SCREENSHOT CAPTURE MATRIX ---\n');

  // 1. DASHBOARD & OVERVIEW
  await setViewport(1440, 900);
  await navigate('/');
  await capture('DASH-001-dashboard-overview.png');

  await setViewport(1180, 820);
  await capture('DASH-002-dashboard-tablet-landscape.png');

  await setViewport(820, 1180);
  await capture('DASH-003-dashboard-tablet-portrait.png');

  await setViewport(390, 844);
  await capture('DASH-004-dashboard-mobile.png');

  // 2. AUTHENTICATION & LOGIN
  await setViewport(1440, 900);
  await navigate('/login');
  await capture('AUTH-001-login-desktop.png');

  await setViewport(390, 844);
  await capture('AUTH-002-login-mobile.png');

  // 3. ASSET MASTER REGISTRY
  await setViewport(1440, 900);
  await navigate('/assets');
  await capture('ASSET-001-asset-registry-list.png');

  // Open Asset Detail Drawer
  await evaluate(`
    const cards = document.querySelectorAll('button');
    for (const b of cards) {
      if (b.innerText && b.innerText.includes('Inspect Specifications')) {
        b.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('ASSET-002-asset-detail-drawer.png');

  // 4. EQUIPMENT HIERARCHY
  await navigate('/hierarchies');
  await capture('HIER-001-hierarchy-physical-dag.png');

  // Switch to System Process Hierarchy tab
  await evaluate(`
    const tabs = document.querySelectorAll('button');
    for (const t of tabs) {
      if (t.innerText && t.innerText.includes('System & Process Loop')) {
        t.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('HIER-002-hierarchy-process-dag.png');

  // 5. MAINTENANCE CALENDAR & PM
  await navigate('/maintenance-calendar');
  await capture('CAL-001-maintenance-calendar-grid.png');

  // Switch to Schedules List View
  await evaluate(`
    const tabs = document.querySelectorAll('button');
    for (const t of tabs) {
      if (t.innerText && t.innerText.includes('Recurring PM Schedules')) {
        t.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('CAL-002-maintenance-schedules-list.png');

  // 6. INSPECTIONS & FAULTS
  await navigate('/inspections');
  await capture('INSP-001-inspections-list.png');

  // Open Inspection Detail Modal
  await evaluate(`
    const viewButtons = document.querySelectorAll('button');
    for (const vb of viewButtons) {
      if (vb.innerText && vb.innerText.includes('View Checklist')) {
        vb.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('INSP-002-inspection-detail-modal.png');

  // Close modal and switch to Fault History tab
  await evaluate(`
    const closeBtn = document.querySelector('button[aria-label="Close modal"]') || document.querySelectorAll('button')[0];
    if (closeBtn) closeBtn.click();
  `);
  await new Promise(r => setTimeout(r, 400));
  await evaluate(`
    const tabs = document.querySelectorAll('button');
    for (const t of tabs) {
      if (t.innerText && t.innerText.includes('Fault History')) {
        t.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('INSP-003-fault-history-tab.png');

  // 7. DAILY BOILER MONITORING LOGBOOK
  await navigate('/daily-monitoring');
  await capture('LOG-001-daily-boiler-logbook-entry.png');

  // Switch to Historical Shift Archive Tab
  await evaluate(`
    const tabs = document.querySelectorAll('button');
    for (const t of tabs) {
      if (t.innerText && t.innerText.includes('Historical Shift Archive')) {
        t.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('LOG-002-boiler-monitoring-history.png');

  // 8. FACTORY-FLOOR OPERATOR TABLET KIOSK
  await setViewport(820, 1180);
  await navigate('/operator');
  await capture('KIOSK-001-floor-operator-portrait.png');

  await setViewport(1180, 820);
  await capture('KIOSK-002-floor-operator-landscape.png');

  // Open Glove Numpad on first numerical input
  await evaluate(`
    const numBtn = document.querySelectorAll('button');
    for (const nb of numBtn) {
      if (nb.innerText && nb.innerText.includes('Numpad')) {
        nb.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 500));
  await capture('KIOSK-003-floor-glove-numpad.png');

  // Open QR Scanner Modal
  await evaluate(`
    const qrBtn = document.querySelectorAll('button');
    for (const q of qrBtn) {
      if (q.innerText && q.innerText.includes('Scan Asset QR')) {
        q.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('KIOSK-004-floor-qr-scanner-modal.png');

  // Close QR modal & Open Sync Queue Drawer
  await evaluate(`
    const cancelBtn = document.querySelectorAll('button');
    for (const c of cancelBtn) {
      if (c.innerText && c.innerText.includes('Cancel')) {
        c.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 400));
  await evaluate(`
    const syncPill = document.querySelector('button[title*="sync"]') || document.querySelector('button[aria-label*="sync"]');
    if (syncPill) syncPill.click();
  `);
  await new Promise(r => setTimeout(r, 500));
  await capture('KIOSK-005-floor-sync-queue-drawer.png');

  // 9. WORK ORDERS MANAGEMENT
  await setViewport(1440, 900);
  await navigate('/work-orders');
  await capture('WO-001-work-orders-list.png');

  // Switch to Kanban Board view
  await evaluate(`
    const viewButtons = document.querySelectorAll('button');
    for (const b of viewButtons) {
      if (b.innerText && b.innerText.includes('Kanban')) {
        b.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('WO-002-work-orders-kanban.png');

  // Open Create Work Order Modal
  await evaluate(`
    const newWoBtn = document.querySelectorAll('button');
    for (const b of newWoBtn) {
      if (b.innerText && b.innerText.includes('New Work Order')) {
        b.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('WO-003-create-work-order-modal.png');

  // Close create modal and open Work Order Detail Modal
  await evaluate(`
    const cancelBtn = document.querySelectorAll('button');
    for (const c of cancelBtn) {
      if (c.innerText && c.innerText.includes('Cancel')) {
        c.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 400));
  await evaluate(`
    const detailButtons = document.querySelectorAll('button');
    for (const db of detailButtons) {
      if (db.innerText && (db.innerText.includes('Manage') || db.innerText.includes('Details') || db.innerText.includes('View'))) {
        db.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('WO-004-work-order-detail-modal.png');

  // 10. DECISION SUPPORT & REPORTING
  await navigate('/reports');
  await capture('REP-001-decision-anp-priorities.png');

  // Switch to Operational Abnormalities tab
  await evaluate(`
    const tabs = document.querySelectorAll('button');
    for (const t of tabs) {
      if (t.innerText && t.innerText.includes('Operational Abnormalities')) {
        t.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('REP-002-operational-abnormalities-tab.png');

  // Open Alert Acknowledgement Modal
  await evaluate(`
    const ackButtons = document.querySelectorAll('button');
    for (const ab of ackButtons) {
      if (ab.innerText && ab.innerText.includes('Acknowledge')) {
        ab.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('REP-003-alert-acknowledgement-modal.png');

  // Close modal and switch to Historical Trends tab
  await evaluate(`
    const cancelBtn = document.querySelectorAll('button');
    for (const c of cancelBtn) {
      if (c.innerText && c.innerText.includes('Cancel')) {
        c.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 400));
  await evaluate(`
    const tabs = document.querySelectorAll('button');
    for (const t of tabs) {
      if (t.innerText && t.innerText.includes('Telemetry Trends')) {
        t.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('REP-004-telemetry-trends-tab.png');

  // Switch to Channels & Export tab
  await evaluate(`
    const tabs = document.querySelectorAll('button');
    for (const t of tabs) {
      if (t.innerText && t.innerText.includes('Alert Channels & Export')) {
        t.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('REP-005-notification-channels-tab.png');

  // Open Notification Channel Config Modal
  await evaluate(`
    const addChan = document.querySelectorAll('button');
    for (const ac of addChan) {
      if (ac.innerText && ac.innerText.includes('Add Channel')) {
        ac.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('REP-006-notification-config-modal.png');

  // 11. AUDIT & EVIDENCE VAULT
  await navigate('/audit-evidence');
  await capture('AUDIT-001-audit-trail-table.png');

  // Switch to Evidence Vault Tab
  await evaluate(`
    const tabs = document.querySelectorAll('button');
    for (const t of tabs) {
      if (t.innerText && t.innerText.includes('Evidence Vault')) {
        t.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('AUDIT-002-evidence-vault-tab.png');

  // Open Upload Evidence Modal
  await evaluate(`
    const upBtn = document.querySelectorAll('button');
    for (const ub of upBtn) {
      if (ub.innerText && ub.innerText.includes('Upload Evidence')) {
        ub.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('AUDIT-003-evidence-upload-modal.png');

  // Close upload modal & switch to Compliance Records
  await evaluate(`
    const cancelBtn = document.querySelectorAll('button');
    for (const c of cancelBtn) {
      if (c.innerText && c.innerText.includes('Cancel')) {
        c.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 400));
  await evaluate(`
    const tabs = document.querySelectorAll('button');
    for (const t of tabs) {
      if (t.innerText && t.innerText.includes('Compliance Records')) {
        t.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('AUDIT-004-compliance-records-tab.png');

  // Open Compliance Verification Modal
  await evaluate(`
    const verBtn = document.querySelectorAll('button');
    for (const vb of verBtn) {
      if (vb.innerText && vb.innerText.includes('Verify Compliance')) {
        vb.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('AUDIT-005-compliance-verification-modal.png');

  // Close verification modal & switch to Evidence Packages
  await evaluate(`
    const cancelBtn = document.querySelectorAll('button');
    for (const c of cancelBtn) {
      if (c.innerText && c.innerText.includes('Cancel')) {
        c.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 400));
  await evaluate(`
    const tabs = document.querySelectorAll('button');
    for (const t of tabs) {
      if (t.innerText && t.innerText.includes('Evidence Packages')) {
        t.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('AUDIT-006-evidence-packages-tab.png');

  // Open Evidence Package Modal
  await evaluate(`
    const pkgBtn = document.querySelectorAll('button');
    for (const pb of pkgBtn) {
      if (pb.innerText && pb.innerText.includes('Build Package')) {
        pb.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('AUDIT-007-evidence-package-builder-modal.png');

  // 12. MAINTENANCE FINANCIAL COST ANALYSIS
  await navigate('/cost-analysis');
  await capture('COST-001-maintenance-cost-analysis.png');

  // 13. DECISION GOVERNANCE
  await navigate('/governance');
  await capture('GOV-001-governance-academic-baseline.png');

  // Open Criterion Governance Modal
  await evaluate(`
    const critCards = document.querySelectorAll('button');
    for (const cb of critCards) {
      if (cb.innerText && cb.innerText.includes('Inspect Validation Details')) {
        cb.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('GOV-002-criterion-governance-modal.png');

  // Close criterion modal & switch to Version Comparison Tab
  await evaluate(`
    const closeBtn = document.querySelector('button[aria-label="Close modal"]') || document.querySelectorAll('button')[0];
    if (closeBtn) closeBtn.click();
  `);
  await new Promise(r => setTimeout(r, 400));
  await evaluate(`
    const tabs = document.querySelectorAll('button');
    for (const t of tabs) {
      if (t.innerText && t.innerText.includes('Model Version Comparison')) {
        t.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('GOV-003-governance-version-comparison.png');

  // Switch to Commercial Proposals Tab
  await evaluate(`
    const tabs = document.querySelectorAll('button');
    for (const t of tabs) {
      if (t.innerText && t.innerText.includes('Commercial Configurations')) {
        t.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('GOV-004-governance-commercial-proposals.png');

  // Open Propose Model Version Modal
  await evaluate(`
    const propBtn = document.querySelectorAll('button');
    for (const pb of propBtn) {
      if (pb.innerText && pb.innerText.includes('Propose New Model Version')) {
        pb.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('GOV-005-propose-model-modal.png');

  // 14. WHITE-LABEL & SETTINGS
  await navigate('/settings');
  await capture('SET-001-organization-branding-settings.png');

  // Switch to Localization & Regional Settings
  await evaluate(`
    const tabs = document.querySelectorAll('button');
    for (const t of tabs) {
      if (t.innerText && t.innerText.includes('Regional & Localization')) {
        t.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('SET-002-organization-localization-settings.png');

  // Switch to Deployment Architecture Tab
  await evaluate(`
    const tabs = document.querySelectorAll('button');
    for (const t of tabs) {
      if (t.innerText && t.innerText.includes('Deployment Architecture')) {
        t.click();
        break;
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('SET-003-organization-deployment-settings.png');

  // 15. TOPNAV ROLE SWITCHER POPOVER
  await navigate('/');
  await evaluate(`
    const roleBtn = document.querySelector('button[aria-label="Change active user role"]');
    if (roleBtn) roleBtn.click();
  `);
  await new Promise(r => setTimeout(r, 500));
  await capture('NAV-001-topbar-role-selector-popover.png');

  // Close Chrome
  ws.close();
  chromeProc.kill();
  if (fs.existsSync(tmpUserData)) {
    fs.rmSync(tmpUserData, { recursive: true, force: true });
  }
  console.log('\n--- SYSTEMATIC SCREENSHOT CAPTURE COMPLETE ---');
}
