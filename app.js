const icons = {
  layout: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
  users: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
  calculator: '<svg viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="8" y1="10" x2="8" y2="10"></line><line x1="12" y1="10" x2="12" y2="10"></line><line x1="16" y1="10" x2="16" y2="10"></line><line x1="8" y1="14" x2="8" y2="14"></line><line x1="12" y1="14" x2="12" y2="14"></line><line x1="16" y1="14" x2="16" y2="18"></line><line x1="8" y1="18" x2="12" y2="18"></line></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg>',
  bank: '<svg viewBox="0 0 24 24"><path d="m3 10 9-7 9 7"></path><path d="M5 10h14"></path><path d="M6 10v9"></path><path d="M10 10v9"></path><path d="M14 10v9"></path><path d="M18 10v9"></path><path d="M4 19h16"></path></svg>',
  chart: '<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path><path d="m9 12 2 2 4-4"></path></svg>',
  menu: '<svg viewBox="0 0 24 24"><line x1="4" y1="7" x2="20" y2="7"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="17" x2="20" y2="17"></line></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>',
  plus: '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
  play: '<svg viewBox="0 0 24 24"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>',
  scale: '<svg viewBox="0 0 24 24"><path d="m16 16 3-8 3 8c-.87.65-1.87 1-3 1s-2.13-.35-3-1Z"></path><path d="m2 16 3-8 3 8c-.87.65-1.87 1-3 1s-2.13-.35-3-1Z"></path><path d="M7 21h10"></path><path d="M12 3v18"></path><path d="M3 7h2c2 0 5-2 7-2s5 2 7 2h2"></path></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>'
};

const titles = {
  dashboard: ["Operations Dashboard", "Registrar, transfer, dividend, approval, and reconciliation workspace."],
  holders: ["Holder Registry", "Versioned holder categories, KYC, tax profile, folio and shareholding data."],
  dividends: ["Dividend Cycle", "Calculate, validate, approve, post, and prepare payable records."],
  approvals: ["Approval Workbench", "Maker-checker queue with compliance notes and immutable audit trail."],
  payments: ["Payment & Reconciliation", "Payment lots, bank files, response matching, and failed payout handling."],
  reports: ["Reports & BI", "Materialized summaries for finance, tax, compliance, and operations."],
  admin: ["Administration", "Security controls, TDS rules, tenant scope, and system policy state."]
};

const metrics = [
  ["Holders", "49,872", "+1.8% this month", "users"],
  ["Pending approvals", "18", "6 need checker action", "check"],
  ["Open payment lots", "4", "NPR 39.3M pending", "bank"],
  ["Audit events today", "1,246", "All partitions healthy", "shield"]
];

const holders = [
  ["FOL-000412", "Aarati Shrestha", "Individual", 1840, "5%", "Verified", "Low"],
  ["FOL-000839", "Himalayan Capital Fund", "Institution", 82340, "15%", "Verified", "Medium"],
  ["FOL-001104", "Nepal Retirement Trust", "Tax Exempt", 42600, "0%", "Pending", "Low"],
  ["FOL-001459", "Sanjay Manandhar", "Promoter", 128900, "5%", "Verified", "High"],
  ["FOL-002020", "Kantipur Insurance Ltd.", "Institution", 57800, "15%", "Verified", "Medium"],
  ["FOL-002771", "Nisha Karki", "Individual", 620, "5%", "Pending", "Low"]
];

const approvals = [
  ["Dividend Cycle 2082/83", "Awaiting checker approval after calculation run CALC-2041.", "Finance Maker", "High"],
  ["Payment Lot PAY-078", "Bank export generated, requires MFA approval before release.", "Treasury", "High"],
  ["TDS Rule Update", "Institutional override from 14.5% to 15% effective 2026-08-01.", "Compliance", "Medium"],
  ["Holder Category Change", "FOL-001104 moved from Institution to Tax Exempt with document evidence.", "Registry", "Medium"]
];

const activities = [
  ["CALC-2041 completed", "49,872 holders processed in 01:42 with zero ledger variance.", "2 min ago"],
  ["RLS policy check passed", "Tenant scope verified for company_id Nepal Hydro Power Ltd.", "18 min ago"],
  ["Bank response imported", "PAY-077 matched 11,934 success rows and 21 exceptions.", "41 min ago"],
  ["Audit partition rotated", "api_logs_default empty; July 2026 partition receiving writes.", "1 hr ago"]
];

const lots = [
  ["PAY-078", "Dividend Cycle 2082/83", "39,385,890", "Draft"],
  ["PAY-077", "Debenture Interest Q1", "8,940,110", "Reconciling"],
  ["PAY-076", "Fraction Auction Settlement", "1,284,600", "Closed"]
];

const reports = [
  ["Dividend Summary", "Company, fiscal year, gross, TDS, net payable, unpaid balance."],
  ["TDS Register", "Holder category, instrument, rule source, withheld amount, exemptions."],
  ["Payment Exceptions", "Failed bank rows, reason code, retry lot, manual override history."],
  ["Ledger Trial Balance", "Debit and credit projection from immutable ledger entries."],
  ["Approval History", "Workflow states, actors, timestamps, notes, and maker-checker evidence."],
  ["Holder Register", "Folio, BOID, certificate, category history, KYC and bank mask."]
];

const controls = [
  ["MFA enforcement", "Enabled for all staff and payment approvals.", "success"],
  ["Row-level security", "Active company scope injected into database session.", "success"],
  ["PII masking", "Citizenship and bank fields masked below Checker role.", "info"],
  ["Audit immutability", "Financial payable and ledger tables are append-only.", "success"]
];

const tdsRules = [
  ["Individual", "Equity Dividend", "5%", "tds_rules"],
  ["Institution", "Equity Dividend", "15%", "tds_rules"],
  ["Tax Exempt", "Equity Dividend", "0%", "exemption"],
  ["Foreign Investor", "Debenture Interest", "15%", "fallback"]
];

const recon = [
  ["Matched", 92, "success"],
  ["Pending", 6, "warning"],
  ["Exception", 2, "danger"]
];

function formatNpr(value) {
  return `NPR ${Math.round(value).toLocaleString("en-US")}`;
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function renderIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((node) => {
    node.innerHTML = icons[node.dataset.icon] || "";
  });
}

function setView(viewName) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewName));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === viewName));
  document.querySelector("#pageTitle").textContent = titles[viewName][0];
  document.querySelector("#pageSubtitle").textContent = titles[viewName][1];
  document.querySelector(".sidebar").classList.remove("open");
}

function renderMetrics() {
  document.querySelector("#metricGrid").innerHTML = metrics.map(([label, value, note, icon]) => `
    <article class="metric">
      <div class="metric-icon"><span class="icon" data-icon="${icon}"></span></div>
      <div>
        <span>${label}</span>
        <strong>${value}</strong>
        <small>${note}</small>
      </div>
    </article>
  `).join("");
}

function renderWorkflow() {
  const steps = [["Draft", 7], ["Computed", 4], ["Checker", 6], ["Compliance", 1]];
  document.querySelector("#workflowStrip").innerHTML = steps.map(([name, count]) => `
    <div class="workflow-step">
      <strong>${count}</strong>
      <span>${name}</span>
    </div>
  `).join("");
}

function renderActivities() {
  document.querySelector("#activityList").innerHTML = activities.map(([title, body, time]) => `
    <div class="activity-item">
      <div>
        <strong>${title}</strong>
        <small>${body}</small>
      </div>
      <span>${time}</span>
    </div>
  `).join("");
}

function renderHolders() {
  const category = document.querySelector("#holderCategoryFilter").value;
  const kyc = document.querySelector("#kycFilter").value;
  const search = document.querySelector("#globalSearch").value.trim().toLowerCase();
  const rows = holders.filter((holder) => {
    const matchesCategory = category === "all" || holder[2] === category;
    const matchesKyc = kyc === "all" || holder[5] === kyc;
    const matchesSearch = !search || holder.join(" ").toLowerCase().includes(search);
    return matchesCategory && matchesKyc && matchesSearch;
  });

  document.querySelector("#holderTable").innerHTML = rows.map(([folio, name, categoryName, units, tds, kycState, risk]) => `
    <tr>
      <td>${folio}</td>
      <td><strong>${name}</strong></td>
      <td>${categoryName}</td>
      <td>${units.toLocaleString("en-US")}</td>
      <td>${tds}</td>
      <td><span class="status-pill ${kycState === "Verified" ? "success" : "warning"}">${kycState}</span></td>
      <td><span class="risk-pill ${risk === "High" ? "danger" : risk === "Medium" ? "warning" : "success"}">${risk}</span></td>
    </tr>
  `).join("") || `<tr><td colspan="7">No holders match the current filters.</td></tr>`;
}

function renderApprovals() {
  document.querySelector("#approvalList").innerHTML = approvals.map(([title, body, owner, priority], index) => `
    <div class="approval-item" data-approval="${index}">
      <div>
        <strong>${title}</strong>
        <small>${body}</small>
        <small>Owner: ${owner} · Priority: ${priority}</small>
      </div>
      <div class="approval-actions">
        <button class="ghost-button" data-action="reject">Reject</button>
        <button class="primary-button" data-action="approve">Approve</button>
      </div>
    </div>
  `).join("");
}

function renderLots() {
  document.querySelector("#lotList").innerHTML = lots.map(([id, name, amount, status]) => `
    <div class="lot-item">
      <div>
        <strong>${id}</strong>
        <small>${name}</small>
      </div>
      <div>
        <strong>NPR ${amount}</strong>
        <small>${status}</small>
      </div>
    </div>
  `).join("");
}

function renderRecon() {
  document.querySelector("#reconBars").innerHTML = recon.map(([label, percent, tone]) => `
    <div class="bar-row">
      <span><strong>${label}</strong><strong>${percent}%</strong></span>
      <div class="bar-track"><div class="bar-fill ${tone}" style="width:${percent}%"></div></div>
    </div>
  `).join("");
}

function renderReports() {
  document.querySelector("#reportGrid").innerHTML = reports.map(([title, body]) => `
    <button class="report-item">
      <strong>${title}</strong>
      <small>${body}</small>
    </button>
  `).join("");
}

function renderControls() {
  document.querySelector("#controlList").innerHTML = controls.map(([title, body, tone]) => `
    <div class="control-item">
      <div>
        <strong>${title}</strong>
        <small>${body}</small>
      </div>
      <span class="status-pill ${tone}">Active</span>
    </div>
  `).join("");
}

function renderTdsRules() {
  document.querySelector("#tdsTable").innerHTML = tdsRules.map(([category, instrument, rate, source]) => `
    <tr>
      <td>${category}</td>
      <td>${instrument}</td>
      <td><strong>${rate}</strong></td>
      <td>${source}</td>
    </tr>
  `).join("");
}

function simulateDividend(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const rate = Number(form.get("cashRate"));
  const units = 3424860;
  const gross = units * (rate / 100) * 100;
  const tds = gross * 0.08;
  const net = gross - tds;
  document.querySelector("#calcStatus").textContent = "Computed";
  document.querySelector("#calcStatus").className = "status-pill success";
  document.querySelector("#calcResult").innerHTML = `
    <div><span>Eligible units</span><strong>${units.toLocaleString("en-US")}</strong></div>
    <div><span>Gross amount</span><strong>${formatNpr(gross)}</strong></div>
    <div><span>TDS</span><strong>${formatNpr(tds)}</strong></div>
    <div><span>Net payable</span><strong>${formatNpr(net)}</strong></div>
  `;
  showToast("Calculation run completed and moved to checker queue.");
}

function attachEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  document.querySelectorAll("[data-view-link]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.viewLink));
  });

  document.querySelector("#menuToggle").addEventListener("click", () => {
    document.querySelector(".sidebar").classList.toggle("open");
  });

  document.querySelector("#holderCategoryFilter").addEventListener("change", renderHolders);
  document.querySelector("#kycFilter").addEventListener("change", renderHolders);
  document.querySelector("#globalSearch").addEventListener("input", renderHolders);
  document.querySelector("#dividendForm").addEventListener("submit", simulateDividend);

  document.querySelector("#approvalList").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const item = button.closest(".approval-item");
    const title = item.querySelector("strong").textContent;
    item.remove();
    showToast(`${title} ${button.dataset.action === "approve" ? "approved" : "rejected"} with audit note.`);
  });

  document.querySelector("#reportGrid").addEventListener("click", (event) => {
    const item = event.target.closest(".report-item");
    if (item) showToast(`${item.querySelector("strong").textContent} queued for export.`);
  });

  document.querySelectorAll(".primary-button, .ghost-button").forEach((button) => {
    if (!button.closest("form") && !button.dataset.action && !button.dataset.viewLink) {
      button.addEventListener("click", () => showToast("Action captured in the prototype audit trail."));
    }
  });
}

function boot() {
  renderMetrics();
  renderWorkflow();
  renderActivities();
  renderHolders();
  renderApprovals();
  renderLots();
  renderRecon();
  renderReports();
  renderControls();
  renderTdsRules();
  renderIcons();
  attachEvents();
}

boot();
