export type Permission =
  | "dashboard:read"
  | "registry:read"
  | "registry:write"
  | "dividend:read"
  | "dividend:write"
  | "debenture:read"
  | "payment:read"
  | "payment:write"
  | "payment:approve"
  | "reconciliation:read"
  | "reconciliation:write"
  | "reports:read"
  | "reports:export"
  | "admin:manage"
  | "audit:read"
  | "workflow:read"
  | "workflow:write"
  | "documents:read"
  | "documents:write"
  | "notifications:read"
  | "notifications:write"
  | "settings:read"
  | "settings:write";

export type WorkflowStatus = "draft" | "pending" | "approved" | "rejected" | "escalated";
export type HealthStatus = "healthy" | "degraded" | "down";
export type PaymentStatus = "Draft" | "Exported" | "Reconciling" | "Settled" | "Failed" | "Returned" | "Cancelled" | "Unclaimed";
export type HolderCategory = "Public" | "Institution" | "Tax Exempt" | "Private Placement" | "Promoter";
export type HolderStatus = "Ready" | "Pending KYC" | "Frozen" | "Payment Failed";
export type ReconciliationStatus = "Matched" | "Mismatch" | "Manual Review" | "Returned";
export type Priority = "Low" | "Medium" | "High";
export type CorporateActionType = "IPO" | "Rights" | "Bonus" | "Split" | "Merger" | "Acquisition" | "Stock Dividend" | "Cash Dividend";
export type NotificationChannel = "SMS" | "Email" | "System";
export type NotificationStatus = "Pending" | "Sent" | "Failed" | "Retrying";

export interface ApiPage<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "Maker" | "Checker" | "Approver" | "Admin" | "Compliance" | "Viewer";
  permissions: Permission[];
  avatar?: string;
}

export interface Company {
  id: string;
  name: string;
  symbol: string;
  sector?: string;
  isin?: string;
}

export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  delta: string;
  tone: "default" | "success" | "warning" | "danger" | "info";
}

export interface ChartPoint {
  label: string;
  dividend: number;
  interest: number;
  payments: number;
  tds: number;
  corporateActions: number;
  holderGrowth: number;
}

export interface HolderRecord {
  boid: string;
  holder: string;
  category: HolderCategory;
  units: number;
  faceValue: number;
  dividend: number;
  interest: number;
  tax: number;
  netAmount: number;
  bank: string;
  status: HolderStatus;
  pan: string;
  citizenship: string;
  kycStatus: "Verified" | "Pending" | "Expired";
  freezeStatus: "None" | "Frozen" | "Locked";
  remarks: string;
  lastUpdated: string;
}

export interface CycleSummary {
  id: string;
  company: string;
  companyId: string;
  fiscalYear: string;
  recordDate: string;
  bookClose: string;
  rate: number;
  status: WorkflowStatus;
  progress: number;
  gross: number;
  tax: number;
  net: number;
  validationErrors: number;
  warnings: number;
  version: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  category: "Original" | "Public" | "Institution" | "Tax Exempt" | "Summary";
}

export interface DividendCalculation {
  id: string;
  cycleId: string;
  boid: string;
  holder: string;
  category: HolderCategory;
  units: number;
  faceValue: number;
  dividendRate: number;
  grossDividend: number;
  tdsRate: number;
  tdsAmount: number;
  netDividend: number;
  bank: string;
  accountNumber: string;
  status: "Calculated" | "Validated" | "Error";
  errors: string[];
}

export interface DebentureCalculation {
  id: string;
  cycleId: string;
  boid: string;
  holder: string;
  category: HolderCategory;
  faceValue: number;
  couponRate: number;
  dayCount: number;
  dayCountMethod: "Actual/365" | "Actual/360" | "30/360";
  grossInterest: number;
  tdsRate: number;
  tdsAmount: number;
  netInterest: number;
  bank: string;
  accountNumber: string;
  status: "Calculated" | "Validated" | "Error";
}

export interface PaymentBatch {
  id: string;
  company: string;
  companyId: string;
  lot: string;
  bank: string;
  amount: number;
  items: number;
  status: PaymentStatus;
  createdBy: string;
  createdAt: string;
  exportedAt?: string;
  settledAt?: string;
  bankReference?: string;
  cycleId?: string;
  cycleType?: "Dividend" | "Debenture";
}

export interface PaymentItem {
  id: string;
  batchId: string;
  boid: string;
  holder: string;
  amount: number;
  bank: string;
  accountNumber: string;
  status: "Pending" | "Paid" | "Failed" | "Returned" | "Unclaimed";
  failureReason?: string;
  paidAt?: string;
  returnedAt?: string;
}

export interface ReconciliationItem {
  id: string;
  batch: string;
  batchId: string;
  bankReference: string;
  expected: number;
  received: number;
  difference: number;
  status: ReconciliationStatus;
  matchedAt?: string;
  matchedBy?: string;
  notes: string;
}

export interface WorkflowTask {
  id: string;
  module: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedById: string;
  status: WorkflowStatus;
  priority: Priority;
  dueAt: string;
  createdAt: string;
  completedAt?: string;
  comments: WorkflowComment[];
  attachments: WorkflowAttachment[];
}

export interface WorkflowComment {
  id: string;
  taskId: string;
  author: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface WorkflowAttachment {
  id: string;
  taskId: string;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface CorporateAction {
  id: string;
  type: CorporateActionType;
  company: string;
  companyId: string;
  title: string;
  description: string;
  announcementDate: string;
  recordDate: string;
  exDate: string;
  status: WorkflowStatus;
  progress: number;
  createdBy: string;
  approvedBy?: string;
  documents: DocumentRecord[];
  timeline: TimelineEvent[];
}

export interface DocumentRecord {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  version: number;
  ocrStatus: "Pending" | "Completed" | "Failed";
  uploadedBy: string;
  uploadedAt: string;
  status: "Active" | "Archived";
}

export interface TimelineEvent {
  id: string;
  entityId: string;
  entityType: string;
  action: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  user: string;
  userId: string;
  role: string;
  ip: string;
  device: string;
  module: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  recipient: string;
  sentAt?: string;
  readAt?: string;
  retryCount: number;
  templateId?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  variables: string[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: Permission[];
  status: "Active" | "Inactive" | "Locked";
  lastLogin?: string;
  createdAt: string;
}

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  userCount: number;
}

export interface WorkflowConfig {
  id: string;
  module: string;
  steps: WorkflowStep[];
  status: "Active" | "Draft" | "Retired";
}

export interface WorkflowStep {
  id: string;
  name: string;
  assigneeRole: string;
  order: number;
  required: boolean;
}

export interface TdsRule {
  id: string;
  name: string;
  category: HolderCategory;
  rate: number;
  module: "Dividend" | "Debenture" | "Both";
  status: "Active" | "Draft" | "Retired";
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface FormulaVersion {
  id: string;
  name: string;
  module: "Dividend" | "Debenture";
  version: string;
  formula: string;
  description: string;
  status: "Active" | "Draft" | "Retired";
  effectiveFrom: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: "Public" | "Company" | "Bank";
  recurring: boolean;
}

export interface BusinessCalendar {
  id: string;
  date: string;
  isBusinessDay: boolean;
  dayOfWeek: number;
  description?: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  enabled: boolean;
  description: string;
  module: string;
}

export interface SavedView {
  id: string;
  name: string;
  module: string;
  config: Record<string, unknown>;
  createdBy: string;
  isDefault: boolean;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  userId: string;
  role: string;
  ip: string;
  device: string;
  module: string;
  entity: string;
  entityId: string;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changes: string[];
}