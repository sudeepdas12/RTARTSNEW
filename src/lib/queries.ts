import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import * as mock from "@/lib/mockApi";
import type { CycleSummary, WorkflowTask } from "@/types/domain";

const useMockApi = import.meta.env.DEV || !import.meta.env.VITE_API_BASE_URL;

function mockQueryResult<T>(data: T) {
  return async () => data;
}

// User & Companies
export function useCurrentUser() {
  return useQuery({ queryKey: ["me"], queryFn: useMockApi ? mockQueryResult(mock.demoUser) : api.me });
}

export function useCompanies() {
  return useQuery({ queryKey: ["companies"], queryFn: useMockApi ? mockQueryResult(mock.companies) : api.companies });
}

// Dashboard
export function useDashboard() {
  const metrics = useQuery({ queryKey: ["dashboard", "metrics"], queryFn: useMockApi ? mockQueryResult(mock.metrics) : api.dashboardMetrics });
  const charts = useQuery({ queryKey: ["dashboard", "charts"], queryFn: useMockApi ? mockQueryResult(mock.chartPoints) : api.dashboardCharts });
  return { metrics, charts };
}

// Registry
export function useHolders(filters: URLSearchParams) {
  return useQuery({
    queryKey: ["holders", filters.toString()],
    queryFn: useMockApi ? mockQueryResult(mock.page(mock.holders)) : () => api.holders(filters)
  });
}

// Dividends
export function useDividendCycles() {
  const filtered = mock.cycles.filter((c) => c.id.startsWith("DIV"));
  return useQuery({ queryKey: ["dividends", "cycles"], queryFn: useMockApi ? mockQueryResult(filtered) : api.dividendCycles });
}

export function useDividendCalculations(cycleId: string) {
  return useQuery({
    queryKey: ["dividends", "calculations", cycleId],
    queryFn: useMockApi ? mockQueryResult(mock.dividendCalculations) : () => api.dividendCalculations(cycleId),
    enabled: !!cycleId
  });
}

export function useCreateDividendCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => (useMockApi ? Promise.resolve(mock.cycles[0]) : api.createDividendCycle(data)),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["dividends", "cycles"] }); }
  });
}

// Debentures
export function useDebentureCycles() {
  const filtered = mock.cycles.filter((c) => c.id.startsWith("INT"));
  return useQuery({ queryKey: ["debentures", "cycles"], queryFn: useMockApi ? mockQueryResult(filtered) : api.debentureCycles });
}

export function useDebentureCalculations(cycleId: string) {
  return useQuery({
    queryKey: ["debentures", "calculations", cycleId],
    queryFn: useMockApi ? mockQueryResult(mock.debentureCalculations) : () => api.debentureCalculations(cycleId),
    enabled: !!cycleId
  });
}

// Payments
export function usePaymentBatches() {
  return useQuery({ queryKey: ["payments", "batches"], queryFn: useMockApi ? mockQueryResult(mock.paymentBatches) : api.paymentBatches });
}

export function usePaymentItems(batchId: string) {
  return useQuery({
    queryKey: ["payments", "items", batchId],
    queryFn: useMockApi ? mockQueryResult(mock.paymentItems) : () => api.paymentItems(batchId),
    enabled: !!batchId
  });
}

export function useExportPaymentBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => (useMockApi ? Promise.resolve(mock.paymentBatches.find((b) => b.id === id)!) : api.exportPaymentBatch(id)),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["payments", "batches"] }); }
  });
}

// Reconciliation
export function useReconciliationItems() {
  return useQuery({ queryKey: ["reconciliation", "items"], queryFn: useMockApi ? mockQueryResult(mock.reconciliation) : api.reconciliationItems });
}

// Workflow
export function useWorkflowTasks() {
  return useQuery({ queryKey: ["workflow", "tasks"], queryFn: useMockApi ? mockQueryResult(mock.workflowTasks) : api.workflowTasks });
}

export function useApproveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => (useMockApi ? Promise.resolve(mock.workflowTasks.find((t) => t.id === id)!) : api.approveTask(id)),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["workflow", "tasks"] });
      const previous = qc.getQueryData<WorkflowTask[]>(["workflow", "tasks"]);
      qc.setQueryData<WorkflowTask[]>(["workflow", "tasks"], (current) => current?.map((t) => (t.id === id ? { ...t, status: "approved" as const } : t)));
      return { previous };
    },
    onError: (_e, _id, ctx) => { qc.setQueryData(["workflow", "tasks"], ctx?.previous); },
    onSettled: () => { void qc.invalidateQueries({ queryKey: ["workflow", "tasks"] }); }
  });
}

export function useRejectTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => (useMockApi ? Promise.resolve(mock.workflowTasks.find((t) => t.id === id)!) : api.rejectTask(id)),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["workflow", "tasks"] });
      const previous = qc.getQueryData<WorkflowTask[]>(["workflow", "tasks"]);
      qc.setQueryData<WorkflowTask[]>(["workflow", "tasks"], (current) => current?.map((t) => (t.id === id ? { ...t, status: "rejected" as const } : t)));
      return { previous };
    },
    onError: (_e, _id, ctx) => { qc.setQueryData(["workflow", "tasks"], ctx?.previous); },
    onSettled: () => { void qc.invalidateQueries({ queryKey: ["workflow", "tasks"] }); }
  });
}

// Corporate Actions
export function useCorporateActions() {
  return useQuery({ queryKey: ["corporate-actions"], queryFn: useMockApi ? mockQueryResult(mock.corporateActions) : api.corporateActions });
}

// Notifications
export function useNotifications() {
  return useQuery({ queryKey: ["notifications"], queryFn: useMockApi ? mockQueryResult(mock.notifications) : api.notifications });
}

export function useNotificationTemplates() {
  return useQuery({ queryKey: ["notifications", "templates"], queryFn: useMockApi ? mockQueryResult(mock.notificationTemplates) : api.notificationTemplates });
}

// Administration
export function useAdminUsers() {
  return useQuery({ queryKey: ["admin", "users"], queryFn: useMockApi ? mockQueryResult(mock.adminUsers) : api.adminUsers });
}

export function useAdminRoles() {
  return useQuery({ queryKey: ["admin", "roles"], queryFn: useMockApi ? mockQueryResult(mock.adminRoles) : api.adminRoles });
}

export function useWorkflowConfigs() {
  return useQuery({ queryKey: ["admin", "workflow-configs"], queryFn: useMockApi ? mockQueryResult(mock.workflowConfigs) : api.workflowConfigs });
}

export function useTdsRules() {
  return useQuery({ queryKey: ["admin", "tds-rules"], queryFn: useMockApi ? mockQueryResult(mock.tdsRules) : api.tdsRules });
}

export function useFormulaVersions() {
  return useQuery({ queryKey: ["admin", "formula-versions"], queryFn: useMockApi ? mockQueryResult(mock.formulaVersions) : api.formulaVersions });
}

export function useHolidays() {
  return useQuery({ queryKey: ["admin", "holidays"], queryFn: useMockApi ? mockQueryResult(mock.holidays) : api.holidays });
}

export function useFeatureFlags() {
  return useQuery({ queryKey: ["admin", "feature-flags"], queryFn: useMockApi ? mockQueryResult(mock.featureFlags) : api.featureFlags });
}

// Audit
export function useAuditEntries() {
  return useQuery({ queryKey: ["audit"], queryFn: useMockApi ? mockQueryResult(mock.auditEntries) : () => api.auditEntries() });
}

// Documents
export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: useMockApi ? mockQueryResult(mock.corporateActions[0]?.documents ?? []) : api.documents
  });
}

// Admin rules (legacy)
export function useAdminRules() {
  return useQuery({ queryKey: ["admin", "rules"], queryFn: useMockApi ? mockQueryResult(mock.adminRules) : api.adminRules });
}