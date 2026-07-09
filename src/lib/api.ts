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
  TimelineEvent,
  WorkflowConfig,
  WorkflowTask
} from "@/types/domain";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code = "API_ERROR"
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Idempotency-Key": crypto.randomUUID(),
        ...init?.headers
      }
    });

    if (!response.ok) {
      throw new ApiError(response.statusText, response.status);
    }

    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

export const api = {
  me: () => request<CurrentUser>("/me"),
  companies: () => request<Company[]>("/companies"),

  // Dashboard
  dashboardMetrics: () => request<DashboardMetric[]>("/dashboard/metrics"),
  dashboardCharts: () => request<ChartPoint[]>("/dashboard/charts"),
  recentActivity: () => request<TimelineEvent[]>("/dashboard/activity"),

  // Registry
  holders: (query: URLSearchParams) => request<ApiPage<HolderRecord>>(`/holders?${query.toString()}`),

  // Dividends
  dividendCycles: () => request<CycleSummary[]>("/dividends/cycles"),
  dividendCalculations: (cycleId: string) => request<DividendCalculation[]>(`/dividends/cycles/${cycleId}/calculations`),
  createDividendCycle: (data: unknown) => request<CycleSummary>("/dividends/cycles", { method: "POST", body: JSON.stringify(data) }),
  approveDividendCycle: (id: string) => request<CycleSummary>(`/dividends/cycles/${id}/approve`, { method: "POST" }),

  // Debentures
  debentureCycles: () => request<CycleSummary[]>("/debentures/cycles"),
  debentureCalculations: (cycleId: string) => request<DebentureCalculation[]>(`/debentures/cycles/${cycleId}/calculations`),

  // Payments
  paymentBatches: () => request<PaymentBatch[]>("/payments/batches"),
  paymentItems: (batchId: string) => request<PaymentItem[]>(`/payments/batches/${batchId}/items`),
  exportPaymentBatch: (id: string) => request<PaymentBatch>(`/payments/batches/${id}/export`, { method: "POST" }),

  // Reconciliation
  reconciliationItems: () => request<ReconciliationItem[]>("/reconciliation/items"),
  autoMatch: (batchId: string) => request<ReconciliationItem[]>(`/reconciliation/batches/${batchId}/auto-match`, { method: "POST" }),
  manualMatch: (itemId: string) => request<ReconciliationItem>(`/reconciliation/items/${itemId}/match`, { method: "POST" }),

  // Workflow
  workflowTasks: () => request<WorkflowTask[]>("/workflow/tasks"),
  approveTask: (id: string) => request<WorkflowTask>(`/workflow/tasks/${id}/approve`, { method: "POST" }),
  rejectTask: (id: string) => request<WorkflowTask>(`/workflow/tasks/${id}/reject`, { method: "POST" }),
  addComment: (taskId: string, content: string) => request<WorkflowTask>(`/workflow/tasks/${taskId}/comments`, { method: "POST", body: JSON.stringify({ content }) }),

  // Corporate Actions
  corporateActions: () => request<CorporateAction[]>("/corporate-actions"),
  createCorporateAction: (data: unknown) => request<CorporateAction>("/corporate-actions", { method: "POST", body: JSON.stringify(data) }),

  // Notifications
  notifications: () => request<Notification[]>("/notifications"),
  notificationTemplates: () => request<NotificationTemplate[]>("/notifications/templates"),
  sendNotification: (data: unknown) => request<Notification>("/notifications/send", { method: "POST", body: JSON.stringify(data) }),

  // Administration
  adminUsers: () => request<AdminUser[]>("/admin/users"),
  adminRoles: () => request<AdminRole[]>("/admin/roles"),
  workflowConfigs: () => request<WorkflowConfig[]>("/admin/workflow-configs"),
  tdsRules: () => request<TdsRule[]>("/admin/tds-rules"),
  formulaVersions: () => request<FormulaVersion[]>("/admin/formula-versions"),
  holidays: () => request<Holiday[]>("/admin/holidays"),
  featureFlags: () => request<FeatureFlag[]>("/admin/feature-flags"),

  // Audit
  auditEntries: (query?: URLSearchParams) => request<AuditEntry[]>(`/audit${query ? `?${query.toString()}` : ""}`),

  // Documents
  documents: () => request<DocumentRecord[]>("/documents"),
  uploadDocument: (data: FormData) => request<DocumentRecord>("/documents/upload", { method: "POST", body: data }),

  // Admin rules (legacy)
  adminRules: () => request<unknown[]>("/admin/rules")
};