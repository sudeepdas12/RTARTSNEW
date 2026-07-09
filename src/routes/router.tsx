import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { AdminPage } from "@/features/admin/admin-page";
import { CorporateActionsPage } from "@/features/corporate-actions/corporate-actions-page";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { DebenturePage } from "@/features/debentures/debenture-page";
import { DividendPage } from "@/features/dividends/dividend-page";
import { AuditPage } from "@/features/audit/audit-page";
import { DocumentPage } from "@/features/documents/document-page";
import { NotificationPage } from "@/features/notifications/notification-page";
import { PaymentPage } from "@/features/payments/payment-page";
import { ReconciliationPage } from "@/features/reconciliation/reconciliation-page";
import { RegistryPage } from "@/features/registry/registry-page";
import { ReportsPage } from "@/features/reports/reports-page";
import { WorkflowPage } from "@/features/workflow/workflow-page";
import { SimplePage } from "@/features/admin/simple-page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "registry", element: <RegistryPage /> },
      { path: "corporate-actions", element: <CorporateActionsPage /> },
      { path: "dividends", element: <DividendPage /> },
      { path: "debentures", element: <DebenturePage /> },
      { path: "payments", element: <PaymentPage /> },
      { path: "reconciliation", element: <ReconciliationPage /> },
      { path: "agm", element: <SimplePage title="AGM" description="Upcoming AGMs, voting records, attendance, resolutions, and statutory exports." /> },
      { path: "workflow", element: <WorkflowPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "notifications", element: <NotificationPage /> },
      { path: "admin", element: <AdminPage /> },
      { path: "settings", element: <SimplePage title="Settings" description="Company preferences, language, theme, notifications, and saved grid views." /> },
      { path: "audit", element: <AuditPage /> },
      { path: "documents", element: <DocumentPage /> },
      { path: "help", element: <SimplePage title="Help" description="Keyboard shortcuts, process guidance, and role-based operational handbook." /> },
      { path: "docs", element: <SimplePage title="Documentation" description="API contracts, component hierarchy, workflow configuration, and release notes." /> }
    ]
  }
]);