import type {
  AdminRole,
  AdminUser,
  ApiPage,
  AuditEntry,
  ChartPoint,
  Company,
  CorporateAction,
  CurrentUser,
  CycleSummary,
  DashboardMetric,
  DebentureCalculation,
  DividendCalculation,
  DocumentRecord,
  FeatureFlag,
  FormulaVersion,
  Holiday,
  HolderRecord,
  Notification,
  NotificationTemplate,
  PaymentBatch,
  PaymentItem,
  ReconciliationItem,
  TdsRule,
  WorkflowComment,
  WorkflowConfig,
  WorkflowTask
} from "@/types/domain";

export const demoUser: CurrentUser = {
  id: "usr-checker",
  name: "Sunita K.C.",
  email: "sunita.kc@sebon-rta.gov.np",
  role: "Checker",
  permissions: [
    "dashboard:read",
    "registry:read",
    "registry:write",
    "dividend:read",
    "dividend:write",
    "debenture:read",
    "payment:read",
    "payment:write",
    "payment:approve",
    "reconciliation:read",
    "reconciliation:write",
    "reports:read",
    "reports:export",
    "audit:read",
    "workflow:read",
    "workflow:write",
    "documents:read",
    "documents:write",
    "notifications:read",
    "notifications:write",
    "settings:read",
    "settings:write"
  ]
};

export const companies: Company[] = [
  { id: "cmp-nhpl", name: "Nepal Hydro Power Ltd.", symbol: "NHPL", sector: "Energy", isin: "NP001NHPL001" },
  { id: "cmp-rbbmb", name: "RBB Merchant Banking Ltd.", symbol: "RBBMB", sector: "Banking", isin: "NP002RBBMB002" },
  { id: "cmp-sicl", name: "Sagarmatha Insurance Co.", symbol: "SICL", sector: "Insurance", isin: "NP003SICL003" },
  { id: "cmp-nbl", name: "Nepal Bank Ltd.", symbol: "NBL", sector: "Banking", isin: "NP004NBL004" },
  { id: "cmp-chcl", name: "Chilime Hydropower Co.", symbol: "CHCL", sector: "Energy", isin: "NP005CHCL005" }
];

export const metrics: DashboardMetric[] = [
  { id: "approvals", label: "Pending Approvals", value: "18", delta: "6 high priority", tone: "warning" },
  { id: "transactions", label: "Today's Transactions", value: "1,246", delta: "+8.2%", tone: "success" },
  { id: "dividend-summary", label: "Dividend Summary", value: "NPR 39.3M", delta: "3 cycles active", tone: "default" },
  { id: "interest-summary", label: "Interest Summary", value: "NPR 12.0M", delta: "1 cycle active", tone: "default" },
  { id: "payments", label: "Outstanding Payments", value: "NPR 39.4M", delta: "4 payment lots", tone: "default" },
  { id: "recon", label: "Bank Reconciliation", value: "92%", delta: "21 exceptions", tone: "warning" },
  { id: "corp-actions", label: "Corporate Actions", value: "3", delta: "1 pending approval", tone: "warning" },
  { id: "agm", label: "Upcoming AGMs", value: "2", delta: "Next: 2026-08-15", tone: "info" },
  { id: "api", label: "API Health", value: "99.98%", delta: "healthy", tone: "success" },
  { id: "db", label: "Database Health", value: "99.95%", delta: "healthy", tone: "success" },
  { id: "queue", label: "Notification Queue", value: "384", delta: "12 retries", tone: "default" },
  { id: "top-companies", label: "Top Companies", value: "NHPL, RBBMB, SICL", delta: "5 active", tone: "default" }
];

export const chartPoints: ChartPoint[] = [
  { label: "Magh", dividend: 18, interest: 7, payments: 16, tds: 2, corporateActions: 3, holderGrowth: 1.2 },
  { label: "Falgun", dividend: 22, interest: 8, payments: 21, tds: 3, corporateActions: 4, holderGrowth: 1.5 },
  { label: "Chaitra", dividend: 28, interest: 9, payments: 25, tds: 4, corporateActions: 2, holderGrowth: 1.8 },
  { label: "Baisakh", dividend: 35, interest: 10, payments: 31, tds: 5, corporateActions: 5, holderGrowth: 2.1 },
  { label: "Jestha", dividend: 31, interest: 13, payments: 28, tds: 4, corporateActions: 3, holderGrowth: 1.9 },
  { label: "Ashadh", dividend: 43, interest: 14, payments: 39, tds: 6, corporateActions: 6, holderGrowth: 2.4 }
];

export const holders: HolderRecord[] = [
  {
    boid: "1301010000004123",
    holder: "Aarati Shrestha",
    category: "Public",
    units: 1840,
    faceValue: 100,
    dividend: 23000,
    interest: 0,
    tax: 1150,
    netAmount: 21850,
    bank: "RBB",
    status: "Ready",
    pan: "PAN-1042",
    citizenship: "27-01-72-04122",
    kycStatus: "Verified",
    freezeStatus: "None",
    remarks: "Regular dividend payment",
    lastUpdated: "2026-07-05"
  },
  {
    boid: "1301010000008391",
    holder: "Himalayan Capital Fund",
    category: "Institution",
    units: 82340,
    faceValue: 100,
    dividend: 1029250,
    interest: 0,
    tax: 154388,
    netAmount: 874862,
    bank: "Nabil",
    status: "Ready",
    pan: "PAN-8821",
    citizenship: "-",
    kycStatus: "Verified",
    freezeStatus: "None",
    remarks: "Institutional investor",
    lastUpdated: "2026-07-04"
  },
  {
    boid: "1301010000011048",
    holder: "Nepal Retirement Trust",
    category: "Tax Exempt",
    units: 42600,
    faceValue: 100,
    dividend: 532500,
    interest: 0,
    tax: 0,
    netAmount: 532500,
    bank: "Global IME",
    status: "Pending KYC",
    pan: "PAN-4552",
    citizenship: "-",
    kycStatus: "Pending",
    freezeStatus: "None",
    remarks: "Tax exempt - no TDS applicable",
    lastUpdated: "2026-07-03"
  },
  {
    boid: "1301010000014599",
    holder: "Sanjay Manandhar",
    category: "Promoter",
    units: 128900,
    faceValue: 100,
    dividend: 1611250,
    interest: 0,
    tax: 80563,
    netAmount: 1530687,
    bank: "RBB",
    status: "Frozen",
    pan: "PAN-2900",
    citizenship: "05-02-66-29310",
    kycStatus: "Expired",
    freezeStatus: "Frozen",
    remarks: "Court order freeze - no disbursement",
    lastUpdated: "2026-07-01"
  },
  {
    boid: "1301010000022011",
    holder: "Everest Investment Co.",
    category: "Private Placement",
    units: 25000,
    faceValue: 100,
    dividend: 312500,
    interest: 0,
    tax: 15625,
    netAmount: 296875,
    bank: "NIC Asia",
    status: "Ready",
    pan: "PAN-6731",
    citizenship: "-",
    kycStatus: "Verified",
    freezeStatus: "None",
    remarks: "Private placement allotment",
    lastUpdated: "2026-07-02"
  },
  {
    boid: "1301010000031122",
    holder: "Rita Thapa",
    category: "Public",
    units: 520,
    faceValue: 100,
    dividend: 6500,
    interest: 0,
    tax: 325,
    netAmount: 6175,
    bank: "Prabhu",
    status: "Payment Failed",
    pan: "PAN-3319",
    citizenship: "42-03-88-11293",
    kycStatus: "Verified",
    freezeStatus: "None",
    remarks: "Bank account mismatch - retry initiated",
    lastUpdated: "2026-07-06"
  }
];

export const cycles: CycleSummary[] = [
  {
    id: "DIV-2082-83",
    company: "Nepal Hydro Power Ltd.",
    companyId: "cmp-nhpl",
    fiscalYear: "2082/83",
    recordDate: "2026-07-31",
    bookClose: "2026-07-25",
    rate: 12.5,
    status: "pending",
    progress: 86,
    gross: 42810750,
    tax: 3424860,
    net: 39385890,
    validationErrors: 0,
    warnings: 14,
    version: "formula-dividend-v3.2",
    createdBy: "Maker-01",
    category: "Summary"
  },
  {
    id: "INT-RBB-7-Q1",
    company: "RBB Debenture 7%",
    companyId: "cmp-rbbmb",
    fiscalYear: "2082/83",
    recordDate: "2026-06-30",
    bookClose: "2026-06-25",
    rate: 7,
    status: "approved",
    progress: 100,
    gross: 12980120,
    tax: 973509,
    net: 12006611,
    validationErrors: 0,
    warnings: 2,
    version: "formula-interest-v2.1",
    createdBy: "Maker-01",
    approvedBy: "Sunita K.C.",
    approvedAt: "2026-07-02T10:30:00Z",
    category: "Summary"
  },
  {
    id: "DIV-2082-83-PUB",
    company: "Nepal Hydro Power Ltd.",
    companyId: "cmp-nhpl",
    fiscalYear: "2082/83",
    recordDate: "2026-07-31",
    bookClose: "2026-07-25",
    rate: 12.5,
    status: "pending",
    progress: 86,
    gross: 28120000,
    tax: 1406000,
    net: 26714000,
    validationErrors: 0,
    warnings: 8,
    version: "formula-dividend-v3.2",
    createdBy: "Maker-01",
    category: "Public"
  },
  {
    id: "DIV-2082-83-INST",
    company: "Nepal Hydro Power Ltd.",
    companyId: "cmp-nhpl",
    fiscalYear: "2082/83",
    recordDate: "2026-07-31",
    bookClose: "2026-07-25",
    rate: 12.5,
    status: "pending",
    progress: 86,
    gross: 10290750,
    tax: 1543613,
    net: 8747137,
    validationErrors: 0,
    warnings: 4,
    version: "formula-dividend-v3.2",
    createdBy: "Maker-01",
    category: "Institution"
  },
  {
    id: "DIV-2082-83-TAX",
    company: "Nepal Hydro Power Ltd.",
    companyId: "cmp-nhpl",
    fiscalYear: "2082/83",
    recordDate: "2026-07-31",
    bookClose: "2026-07-25",
    rate: 12.5,
    status: "pending",
    progress: 86,
    gross: 4400000,
    tax: 0,
    net: 4400000,
    validationErrors: 0,
    warnings: 2,
    version: "formula-dividend-v3.2",
    createdBy: "Maker-01",
    category: "Tax Exempt"
  }
];

export const dividendCalculations: DividendCalculation[] = [
  {
    id: "CALC-001",
    cycleId: "DIV-2082-83",
    boid: "1301010000004123",
    holder: "Aarati Shrestha",
    category: "Public",
    units: 1840,
    faceValue: 100,
    dividendRate: 12.5,
    grossDividend: 23000,
    tdsRate: 5,
    tdsAmount: 1150,
    netDividend: 21850,
    bank: "RBB",
    accountNumber: "001-234-5678",
    status: "Calculated",
    errors: []
  },
  {
    id: "CALC-002",
    cycleId: "DIV-2082-83",
    boid: "1301010000008391",
    holder: "Himalayan Capital Fund",
    category: "Institution",
    units: 82340,
    faceValue: 100,
    dividendRate: 12.5,
    grossDividend: 1029250,
    tdsRate: 15,
    tdsAmount: 154388,
    netDividend: 874862,
    bank: "Nabil",
    accountNumber: "002-987-6543",
    status: "Calculated",
    errors: []
  },
  {
    id: "CALC-003",
    cycleId: "DIV-2082-83",
    boid: "1301010000011048",
    holder: "Nepal Retirement Trust",
    category: "Tax Exempt",
    units: 42600,
    faceValue: 100,
    dividendRate: 12.5,
    grossDividend: 532500,
    tdsRate: 0,
    tdsAmount: 0,
    netDividend: 532500,
    bank: "Global IME",
    accountNumber: "003-456-7890",
    status: "Validated",
    errors: []
  }
];

export const debentureCalculations: DebentureCalculation[] = [
  {
    id: "INT-CALC-001",
    cycleId: "INT-RBB-7-Q1",
    boid: "1301010000033001",
    holder: "Nepal Pension Fund",
    category: "Institution",
    faceValue: 1000000,
    couponRate: 7,
    dayCount: 181,
    dayCountMethod: "Actual/365",
    grossInterest: 34712,
    tdsRate: 15,
    tdsAmount: 5207,
    netInterest: 29505,
    bank: "RBB",
    accountNumber: "010-111-2222",
    status: "Calculated"
  },
  {
    id: "INT-CALC-002",
    cycleId: "INT-RBB-7-Q1",
    boid: "1301010000033002",
    holder: "Citizen Mutual Fund",
    category: "Tax Exempt",
    faceValue: 500000,
    couponRate: 7,
    dayCount: 181,
    dayCountMethod: "Actual/365",
    grossInterest: 17356,
    tdsRate: 0,
    tdsAmount: 0,
    netInterest: 17356,
    bank: "Nabil",
    accountNumber: "020-333-4444",
    status: "Validated"
  }
];

export const paymentBatches: PaymentBatch[] = [
  { id: "PAY-078", company: "NHPL", companyId: "cmp-nhpl", lot: "LOT-2026-07-A", bank: "RBB", amount: 39385890, items: 49872, status: "Draft", createdBy: "Maker-01", createdAt: "2026-07-05" },
  { id: "PAY-077", company: "RBB Debenture", companyId: "cmp-rbbmb", lot: "LOT-2026-06-D", bank: "Nabil", amount: 8940110, items: 11955, status: "Reconciling", createdBy: "Maker-01", createdAt: "2026-06-28", exportedAt: "2026-06-30" },
  { id: "PAY-076", company: "NHPL", companyId: "cmp-nhpl", lot: "LOT-2026-05-F", bank: "Global IME", amount: 1284600, items: 622, status: "Settled", createdBy: "Maker-01", createdAt: "2026-05-20", exportedAt: "2026-05-22", settledAt: "2026-05-25" },
  { id: "PAY-075", company: "SICL", companyId: "cmp-sicl", lot: "LOT-2026-04-C", bank: "Prabhu", amount: 5600000, items: 3200, status: "Failed", createdBy: "Maker-02", createdAt: "2026-04-15" },
  { id: "PAY-074", company: "NHPL", companyId: "cmp-nhpl", lot: "LOT-2026-03-B", bank: "NIC Asia", amount: 890000, items: 180, status: "Returned", createdBy: "Maker-01", createdAt: "2026-03-10", exportedAt: "2026-03-12" },
  { id: "PAY-073", company: "RBB Debenture", companyId: "cmp-rbbmb", lot: "LOT-2026-02-E", bank: "RBB", amount: 2500000, items: 450, status: "Cancelled", createdBy: "Maker-02", createdAt: "2026-02-01" },
  { id: "PAY-072", company: "NHPL", companyId: "cmp-nhpl", lot: "LOT-2026-01-A", bank: "Global IME", amount: 340000, items: 28, status: "Unclaimed", createdBy: "Maker-01", createdAt: "2026-01-05", exportedAt: "2026-01-08" }
];

export const paymentItems: PaymentItem[] = [
  { id: "PI-001", batchId: "PAY-078", boid: "1301010000004123", holder: "Aarati Shrestha", amount: 21850, bank: "RBB", accountNumber: "001-234-5678", status: "Pending" },
  { id: "PI-002", batchId: "PAY-078", boid: "1301010000008391", holder: "Himalayan Capital Fund", amount: 874862, bank: "Nabil", accountNumber: "002-987-6543", status: "Pending" },
  { id: "PI-003", batchId: "PAY-077", boid: "1301010000033001", holder: "Nepal Pension Fund", amount: 29505, bank: "RBB", accountNumber: "010-111-2222", status: "Paid" },
  { id: "PI-004", batchId: "PAY-077", boid: "1301010000033002", holder: "Citizen Mutual Fund", amount: 17356, bank: "Nabil", accountNumber: "020-333-4444", status: "Failed" },
  { id: "PI-005", batchId: "PAY-074", boid: "1301010000011048", holder: "Nepal Retirement Trust", amount: 532500, bank: "Global IME", accountNumber: "003-456-7890", status: "Returned" },
  { id: "PI-006", batchId: "PAY-072", boid: "1301010000022011", holder: "Everest Investment Co.", amount: 296875, bank: "NIC Asia", accountNumber: "004-567-8901", status: "Unclaimed" }
];

export const reconciliation: ReconciliationItem[] = [
  { id: "REC-1", batch: "PAY-077", batchId: "PAY-077", bankReference: "RBB-RESP-221", expected: 4200, received: 4200, difference: 0, status: "Matched", matchedAt: "2026-07-01T14:30:00Z", matchedBy: "System", notes: "Auto-matched" },
  { id: "REC-2", batch: "PAY-077", batchId: "PAY-077", bankReference: "RBB-RESP-222", expected: 9200, received: 0, difference: 9200, status: "Returned", notes: "Account number mismatch" },
  { id: "REC-3", batch: "PAY-077", batchId: "PAY-077", bankReference: "RBB-RESP-223", expected: 18700, received: 18500, difference: 200, status: "Mismatch", notes: "Amount discrepancy - bank charges deducted" },
  { id: "REC-4", batch: "PAY-076", batchId: "PAY-076", bankReference: "GIME-RESP-118", expected: 1284600, received: 1284600, difference: 0, status: "Matched", matchedAt: "2026-05-26T09:15:00Z", matchedBy: "System", notes: "Full settlement" },
  { id: "REC-5", batch: "PAY-076", batchId: "PAY-076", bankReference: "GIME-RESP-119", expected: 50000, received: 0, difference: 50000, status: "Manual Review", notes: "Beneficiary name mismatch - pending verification" }
];

export const workflowTasks: WorkflowTask[] = [
  {
    id: "WF-1001", module: "Dividend", title: "Approve Dividend Cycle 2082/83", description: "Review and approve the dividend calculation for NHPL fiscal year 2082/83 at 12.5% rate.",
    assignedTo: "Checker", assignedById: "usr-maker", status: "pending", priority: "High", dueAt: "2026-07-10", createdAt: "2026-07-05",
    comments: [
      { id: "C-1", taskId: "WF-1001", author: "Maker-01", authorId: "usr-maker", content: "Calculation completed. 14 warnings noted - all within tolerance.", createdAt: "2026-07-05T10:00:00Z" }
    ],
    attachments: [
      { id: "A-1", taskId: "WF-1001", fileName: "dividend-calculation-v3.2.xlsx", fileSize: 245000, uploadedBy: "Maker-01", uploadedAt: "2026-07-05T10:00:00Z" }
    ]
  },
  {
    id: "WF-1002", module: "Payments", title: "Approve Bank Export PAY-078", description: "Authorize bank file export for NHPL dividend payment batch PAY-078.",
    assignedTo: "Checker", assignedById: "usr-maker", status: "pending", priority: "High", dueAt: "2026-07-10", createdAt: "2026-07-05",
    comments: [], attachments: []
  },
  {
    id: "WF-1003", module: "Admin", title: "Review TDS Rule Change", description: "Review proposed TDS rate change for institutional dividend from 15% to 10%.",
    assignedTo: "Compliance", assignedById: "usr-admin", status: "escalated", priority: "Medium", dueAt: "2026-07-09", createdAt: "2026-07-01",
    comments: [
      { id: "C-2", taskId: "WF-1003", author: "Compliance-Officer", authorId: "usr-compliance", content: "This change requires board approval per SEBON regulation 47(3).", createdAt: "2026-07-03T11:00:00Z" }
    ],
    attachments: [
      { id: "A-2", taskId: "WF-1003", fileName: "tds-rule-change-proposal.pdf", fileSize: 120000, uploadedBy: "Admin", uploadedAt: "2026-07-01T09:00:00Z" }
    ]
  },
  {
    id: "WF-1004", module: "Corporate Actions", title: "Approve Bonus Share Issue - NHPL", description: "Approve 1:1 bonus share issuance for Nepal Hydro Power Ltd.",
    assignedTo: "Approver", assignedById: "usr-maker", status: "approved", priority: "High", dueAt: "2026-07-08", createdAt: "2026-06-25",
    comments: [
      { id: "C-3", taskId: "WF-1004", author: "Checker", authorId: "usr-checker", content: "All documents verified. SEBON approval attached.", createdAt: "2026-06-28T14:00:00Z" },
      { id: "C-4", taskId: "WF-1004", author: "Approver", authorId: "usr-approver", content: "Approved. Proceed with implementation.", createdAt: "2026-06-30T09:00:00Z" }
    ],
    attachments: [
      { id: "A-3", taskId: "WF-1004", fileName: "sebon-approval-nhpl-bonus.pdf", fileSize: 340000, uploadedBy: "Maker-01", uploadedAt: "2026-06-25T10:00:00Z" }
    ],
    completedAt: "2026-06-30T09:00:00Z"
  }
];

export const corporateActions: CorporateAction[] = [
  {
    id: "CA-001", type: "Bonus", company: "Nepal Hydro Power Ltd.", companyId: "cmp-nhpl",
    title: "1:1 Bonus Share Issuance", description: "Issuance of 1 bonus share for every 1 share held.",
    announcementDate: "2026-06-15", recordDate: "2026-07-20", exDate: "2026-07-21",
    status: "approved", progress: 100, createdBy: "Maker-01", approvedBy: "Approver",
    documents: [
      { id: "DOC-001", title: "SEBON Approval", fileName: "sebon-approval.pdf", fileType: "application/pdf", fileSize: 340000, version: 1, ocrStatus: "Completed", uploadedBy: "Maker-01", uploadedAt: "2026-06-15", status: "Active" },
      { id: "DOC-002", title: "Board Resolution", fileName: "board-resolution.pdf", fileType: "application/pdf", fileSize: 210000, version: 1, ocrStatus: "Completed", uploadedBy: "Maker-01", uploadedAt: "2026-06-15", status: "Active" }
    ],
    timeline: [
      { id: "TL-001", entityId: "CA-001", entityType: "CorporateAction", action: "Created", user: "Maker-01", userId: "usr-maker", role: "Maker", ip: "192.168.1.100", device: "Chrome/Windows", module: "Corporate Actions", timestamp: "2026-06-15T09:00:00Z" },
      { id: "TL-002", entityId: "CA-001", entityType: "CorporateAction", action: "Approved", user: "Approver", userId: "usr-approver", role: "Approver", ip: "192.168.1.101", device: "Chrome/Windows", module: "Corporate Actions", timestamp: "2026-06-30T09:00:00Z" }
    ]
  },
  {
    id: "CA-002", type: "Cash Dividend", company: "Sagarmatha Insurance Co.", companyId: "cmp-sicl",
    title: "15% Cash Dividend FY 2081/82", description: "Cash dividend of 15% per share for fiscal year 2081/82.",
    announcementDate: "2026-05-01", recordDate: "2026-06-15", exDate: "2026-06-16",
    status: "pending", progress: 65, createdBy: "Maker-02",
    documents: [
      { id: "DOC-003", title: "AGM Minutes", fileName: "agm-minutes.pdf", fileType: "application/pdf", fileSize: 180000, version: 1, ocrStatus: "Pending", uploadedBy: "Maker-02", uploadedAt: "2026-05-01", status: "Active" }
    ],
    timeline: [
      { id: "TL-003", entityId: "CA-002", entityType: "CorporateAction", action: "Created", user: "Maker-02", userId: "usr-maker2", role: "Maker", ip: "192.168.1.102", device: "Firefox/Windows", module: "Corporate Actions", timestamp: "2026-05-01T10:00:00Z" }
    ]
  },
  {
    id: "CA-003", type: "Rights", company: "RBB Merchant Banking Ltd.", companyId: "cmp-rbbmb",
    title: "1:2 Rights Share Issue", description: "Rights share issuance at 1:2 ratio at NPR 150 per share.",
    announcementDate: "2026-07-01", recordDate: "2026-08-15", exDate: "2026-08-16",
    status: "draft", progress: 25, createdBy: "Maker-01",
    documents: [],
    timeline: [
      { id: "TL-004", entityId: "CA-003", entityType: "CorporateAction", action: "Created", user: "Maker-01", userId: "usr-maker", role: "Maker", ip: "192.168.1.100", device: "Chrome/Windows", module: "Corporate Actions", timestamp: "2026-07-01T11:00:00Z" }
    ]
  }
];

export const notifications: Notification[] = [
  { id: "NOT-001", title: "Dividend Cycle Pending Approval", message: "Dividend cycle DIV-2082-83 for NHPL is pending your approval.", channel: "System", status: "Pending", recipient: "usr-checker", retryCount: 0 },
  { id: "NOT-002", title: "Payment Batch Exported", message: "Payment batch PAY-077 has been exported to Nabil Bank.", channel: "Email", status: "Sent", recipient: "usr-maker", sentAt: "2026-06-30T10:00:00Z", readAt: "2026-06-30T10:05:00Z", retryCount: 0 },
  { id: "NOT-003", title: "Reconciliation Exception", message: "Batch PAY-077 has 2 reconciliation exceptions requiring manual review.", channel: "System", status: "Sent", recipient: "usr-checker", sentAt: "2026-07-01T14:30:00Z", retryCount: 0 },
  { id: "NOT-004", title: "SMS: Payment Confirmation", message: "Your dividend payment of NPR 21,850 has been processed.", channel: "SMS", status: "Failed", recipient: "9841234567", retryCount: 3 },
  { id: "NOT-005", title: "TDS Rule Change Request", message: "TDS rule change for institutional dividend requires compliance review.", channel: "System", status: "Retrying", recipient: "usr-compliance", retryCount: 2 }
];

export const notificationTemplates: NotificationTemplate[] = [
  { id: "TMP-001", name: "Payment Confirmation", channel: "SMS", subject: "Payment Confirmation", body: "Your {{type}} payment of NPR {{amount}} has been processed. Ref: {{reference}}", variables: ["type", "amount", "reference"] },
  { id: "TMP-002", name: "Approval Required", channel: "Email", subject: "Action Required: {{title}}", body: "Dear {{user}}, the following item requires your approval: {{title}}. Due date: {{dueDate}}.", variables: ["user", "title", "dueDate"] },
  { id: "TMP-003", name: "System Alert", channel: "System", subject: "System Alert: {{module}}", body: "Alert in {{module}}: {{message}}", variables: ["module", "message"] }
];

export const adminUsers: AdminUser[] = [
  { id: "usr-maker", name: "Ram Prasad", email: "ram.prasad@sebon-rta.gov.np", role: "Maker", permissions: ["dashboard:read", "registry:read", "registry:write", "dividend:read", "dividend:write", "payment:read"], status: "Active", lastLogin: "2026-07-06T08:30:00Z", createdAt: "2025-01-15" },
  { id: "usr-checker", name: "Sunita K.C.", email: "sunita.kc@sebon-rta.gov.np", role: "Checker", permissions: ["dashboard:read", "registry:read", "dividend:read", "dividend:write", "payment:read", "payment:approve", "reconciliation:write", "reports:export", "audit:read"], status: "Active", lastLogin: "2026-07-06T09:00:00Z", createdAt: "2025-01-15" },
  { id: "usr-approver", name: "Hari Sharma", email: "hari.sharma@sebon-rta.gov.np", role: "Approver", permissions: ["dashboard:read", "dividend:read", "payment:read", "payment:approve", "reports:read", "reports:export", "audit:read"], status: "Active", lastLogin: "2026-07-05T16:00:00Z", createdAt: "2025-03-01" },
  { id: "usr-admin", name: "Gita Adhikari", email: "gita.adhikari@sebon-rta.gov.np", role: "Admin", permissions: ["dashboard:read", "admin:manage", "audit:read", "settings:read", "settings:write"], status: "Active", lastLogin: "2026-07-06T07:00:00Z", createdAt: "2025-01-01" },
  { id: "usr-compliance", name: "Prakash Thapa", email: "prakash.thapa@sebon-rta.gov.np", role: "Compliance", permissions: ["dashboard:read", "audit:read", "reports:read", "reports:export"], status: "Active", lastLogin: "2026-07-04T11:00:00Z", createdAt: "2025-06-01" },
  { id: "usr-viewer", name: "Sita Rai", email: "sita.rai@sebon-rta.gov.np", role: "Viewer", permissions: ["dashboard:read", "registry:read"], status: "Inactive", lastLogin: "2026-05-20T10:00:00Z", createdAt: "2025-09-01" }
];

export const adminRoles: AdminRole[] = [
  { id: "role-maker", name: "Maker", description: "Can create cycles, batches, and initiate workflows", permissions: ["dashboard:read", "registry:read", "registry:write", "dividend:read", "dividend:write", "debenture:read", "payment:read", "payment:write", "workflow:read", "documents:read", "documents:write"], userCount: 8 },
  { id: "role-checker", name: "Checker", description: "Can review and approve/reject items created by Maker", permissions: ["dashboard:read", "registry:read", "dividend:read", "dividend:write", "debenture:read", "payment:read", "payment:approve", "reconciliation:read", "reconciliation:write", "reports:read", "reports:export", "audit:read", "workflow:read", "workflow:write"], userCount: 4 },
  { id: "role-approver", name: "Approver", description: "Final approval authority for all workflows", permissions: ["dashboard:read", "dividend:read", "payment:read", "payment:approve", "reports:read", "reports:export", "audit:read", "workflow:read", "workflow:write"], userCount: 2 },
  { id: "role-admin", name: "Admin", description: "System administration and configuration", permissions: ["dashboard:read", "admin:manage", "audit:read", "settings:read", "settings:write", "reports:read", "reports:export"], userCount: 2 },
  { id: "role-compliance", name: "Compliance", description: "Regulatory compliance and audit", permissions: ["dashboard:read", "audit:read", "reports:read", "reports:export", "documents:read"], userCount: 3 },
  { id: "role-viewer", name: "Viewer", description: "Read-only access to dashboards and reports", permissions: ["dashboard:read", "registry:read", "reports:read"], userCount: 12 }
];

export const workflowConfigs: WorkflowConfig[] = [
  {
    id: "wf-div-mc", module: "Dividend",
    steps: [
      { id: "step-1", name: "Maker Creates Cycle", assigneeRole: "Maker", order: 1, required: true },
      { id: "step-2", name: "Checker Reviews Calculation", assigneeRole: "Checker", order: 2, required: true },
      { id: "step-3", name: "Approver Final Approval", assigneeRole: "Approver", order: 3, required: true }
    ],
    status: "Active"
  },
  {
    id: "wf-pay-export", module: "Payments",
    steps: [
      { id: "step-4", name: "Maker Creates Batch", assigneeRole: "Maker", order: 1, required: true },
      { id: "step-5", name: "Checker Approves Export", assigneeRole: "Checker", order: 2, required: true }
    ],
    status: "Active"
  }
];

export const tdsRules: TdsRule[] = [
  { id: "tds-pub-div", name: "Public Dividend TDS", category: "Public", rate: 5, module: "Dividend", status: "Active", effectiveFrom: "2025-01-01" },
  { id: "tds-inst-div", name: "Institution Dividend TDS", category: "Institution", rate: 15, module: "Dividend", status: "Active", effectiveFrom: "2025-01-01" },
  { id: "tds-taxex-div", name: "Tax Exempt Dividend TDS", category: "Tax Exempt", rate: 0, module: "Dividend", status: "Active", effectiveFrom: "2025-01-01" },
  { id: "tds-promoter-div", name: "Promoter Dividend TDS", category: "Promoter", rate: 5, module: "Dividend", status: "Active", effectiveFrom: "2025-01-01" },
  { id: "tds-pp-div", name: "Private Placement Dividend TDS", category: "Private Placement", rate: 10, module: "Dividend", status: "Active", effectiveFrom: "2025-01-01" },
  { id: "tds-pub-int", name: "Public Interest TDS", category: "Public", rate: 5, module: "Debenture", status: "Active", effectiveFrom: "2025-01-01" },
  { id: "tds-inst-int", name: "Institution Interest TDS", category: "Institution", rate: 15, module: "Debenture", status: "Active", effectiveFrom: "2025-01-01" }
];

export const formulaVersions: FormulaVersion[] = [
  { id: "form-div-v3.2", name: "Dividend Formula v3.2", module: "Dividend", version: "3.2", formula: "Gross = Units × FaceValue × Rate / 100; Tax = Gross × TDSRate / 100; Net = Gross - Tax", description: "Standard dividend calculation with category-based TDS", status: "Active", effectiveFrom: "2026-01-01" },
  { id: "form-int-v2.1", name: "Interest Formula v2.1", module: "Debenture", version: "2.1", formula: "Gross = FaceValue × CouponRate × Days / 36500; Tax = Gross × TDSRate / 100; Net = Gross - Tax", description: "Actual/365 day count convention for debentures", status: "Active", effectiveFrom: "2026-01-01" }
];

export const holidays: Holiday[] = [
  { id: "hol-001", name: "New Year 2083", date: "2026-04-14", type: "Public", recurring: true },
  { id: "hol-002", name: "Labor Day", date: "2026-05-01", type: "Public", recurring: true },
  { id: "hol-003", name: "Democracy Day", date: "2026-05-29", type: "Public", recurring: true },
  { id: "hol-004", name: "Dashain", date: "2026-10-20", type: "Public", recurring: true },
  { id: "hol-005", name: "Tihar", date: "2026-11-05", type: "Public", recurring: true },
  { id: "hol-006", name: "Company Foundation Day", date: "2026-08-15", type: "Company", recurring: true }
];

export const featureFlags: FeatureFlag[] = [
  { id: "ff-001", name: "Dividend Auto-Calculation", key: "dividend-auto-calc", enabled: true, description: "Enable automatic dividend calculation on cycle creation", module: "Dividend" },
  { id: "ff-002", name: "Bank Reconciliation Auto-Match", key: "recon-auto-match", enabled: true, description: "Enable automatic matching of bank response files", module: "Reconciliation" },
  { id: "ff-003", name: "SMS Notifications", key: "sms-notifications", enabled: false, description: "Enable SMS notification channel", module: "Notifications" },
  { id: "ff-004", name: "PDF Report Generation", key: "pdf-reports", enabled: true, description: "Enable PDF report generation and download", module: "Reports" },
  { id: "ff-005", name: "Audit Trail Immutable Logging", key: "audit-immutable", enabled: true, description: "Enable immutable audit trail logging", module: "Audit" }
];

export const auditEntries: AuditEntry[] = [
  { id: "AUD-001", timestamp: "2026-07-05T10:00:00Z", user: "Ram Prasad", userId: "usr-maker", role: "Maker", ip: "192.168.1.100", device: "Chrome 120 / Windows 11", module: "Dividend", entity: "CycleSummary", entityId: "DIV-2082-83", action: "CREATE", before: null, after: { id: "DIV-2082-83", status: "draft", rate: 12.5 }, changes: ["Created dividend cycle DIV-2082-83"] },
  { id: "AUD-002", timestamp: "2026-07-05T10:30:00Z", user: "Ram Prasad", userId: "usr-maker", role: "Maker", ip: "192.168.1.100", device: "Chrome 120 / Windows 11", module: "Dividend", entity: "CycleSummary", entityId: "DIV-2082-83", action: "UPDATE", before: { status: "draft" }, after: { status: "pending" }, changes: ["Status changed from draft to pending"] },
  { id: "AUD-003", timestamp: "2026-07-02T10:30:00Z", user: "Sunita K.C.", userId: "usr-checker", role: "Checker", ip: "192.168.1.101", device: "Chrome 120 / Windows 11", module: "Debenture", entity: "CycleSummary", entityId: "INT-RBB-7-Q1", action: "APPROVE", before: { status: "pending" }, after: { status: "approved" }, changes: ["Approved interest cycle INT-RBB-7-Q1"] },
  { id: "AUD-004", timestamp: "2026-06-30T09:00:00Z", user: "Hari Sharma", userId: "usr-approver", role: "Approver", ip: "192.168.1.102", device: "Firefox 120 / Windows 11", module: "Corporate Actions", entity: "CorporateAction", entityId: "CA-001", action: "APPROVE", before: { status: "pending" }, after: { status: "approved" }, changes: ["Approved bonus share issuance CA-001"] },
  { id: "AUD-005", timestamp: "2026-07-01T09:00:00Z", user: "Gita Adhikari", userId: "usr-admin", role: "Admin", ip: "192.168.1.103", device: "Edge 120 / Windows 11", module: "Admin", entity: "TdsRule", entityId: "tds-inst-div", action: "UPDATE", before: { rate: 15 }, after: { rate: 10 }, changes: ["TDS rate changed from 15% to 10% (pending approval)"] }
];

export const adminRules = [
  { id: "TDS-PUB-DIV", name: "Public Dividend TDS 5%", module: "TDS Rules", status: "Active", lastUpdated: "2026-07-01" },
  { id: "WF-DIV-MC", name: "Dividend Maker-Checker", module: "Workflow", status: "Active", lastUpdated: "2026-06-28" },
  { id: "FORM-INT-365", name: "Actual/365 Interest Formula", module: "Formula Versions", status: "Active", lastUpdated: "2026-06-30" }
];

export function page<T>(data: T[], pageNumber = 1, pageSize = 50): ApiPage<T> {
  return { data, page: pageNumber, pageSize, total: data.length };
}