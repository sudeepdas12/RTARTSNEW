import type { ColDef, ICellRendererParams } from "@ag-grid-community/core";
import { useMemo, useState } from "react";
import { EnterpriseGrid } from "@/components/data-grid/enterprise-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminRoles, useAdminUsers, useFeatureFlags, useFormulaVersions, useHolidays, useTdsRules, useWorkflowConfigs } from "@/lib/queries";
import type { AdminRole, AdminUser, FeatureFlag, FormulaVersion, Holiday, TdsRule, WorkflowConfig } from "@/types/domain";

const adminTabs = ["Users", "Roles", "Workflow Config", "TDS Rules", "Formula Versions", "Holiday Calendar", "Feature Flags"] as const;

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<string>("Users");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-md border p-0.5">
        {adminTabs.map((tab) => (
          <button key={tab} className={`rounded px-3 py-1 text-xs font-medium transition-colors ${activeTab === tab ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Users" && <UsersTab />}
      {activeTab === "Roles" && <RolesTab />}
      {activeTab === "Workflow Config" && <WorkflowConfigTab />}
      {activeTab === "TDS Rules" && <TdsRulesTab />}
      {activeTab === "Formula Versions" && <FormulaVersionsTab />}
      {activeTab === "Holiday Calendar" && <HolidayCalendarTab />}
      {activeTab === "Feature Flags" && <FeatureFlagsTab />}
    </div>
  );
}

function UsersTab() {
  const users = useAdminUsers();
  const columns = useMemo<ColDef<AdminUser>[]>(() => [
    { field: "name", headerName: "Name" },
    { field: "email", headerName: "Email" },
    { field: "role", headerName: "Role" },
    { field: "status", headerName: "Status", cellRenderer: (p: ICellRendererParams) => <Badge tone={p.value === "Active" ? "success" : "danger"}>{p.value}</Badge> },
    { field: "lastLogin", headerName: "Last Login" },
    { field: "createdAt", headerName: "Created" }
  ], []);
  return (
    <Card>
      <CardHeader><CardTitle>Users</CardTitle><CardDescription>Manage system users, roles, and permissions.</CardDescription></CardHeader>
      <CardContent><EnterpriseGrid rows={users.data ?? []} columns={columns} height={500} /></CardContent>
    </Card>
  );
}

function RolesTab() {
  const roles = useAdminRoles();
  const columns = useMemo<ColDef<AdminRole>[]>(() => [
    { field: "name", headerName: "Role" },
    { field: "description", headerName: "Description", minWidth: 300 },
    { field: "permissions", headerName: "Permissions", minWidth: 400, valueFormatter: ({ value }) => (value as string[])?.join(", ") },
    { field: "userCount", headerName: "Users" }
  ], []);
  return (
    <Card>
      <CardHeader><CardTitle>Roles & Permissions</CardTitle><CardDescription>Role-based access control configuration.</CardDescription></CardHeader>
      <CardContent><EnterpriseGrid rows={roles.data ?? []} columns={columns} height={500} /></CardContent>
    </Card>
  );
}

function WorkflowConfigTab() {
  const configs = useWorkflowConfigs();
  return (
    <Card>
      <CardHeader><CardTitle>Workflow Configuration</CardTitle><CardDescription>Maker-Checker workflow steps and approval routing.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        {configs.data?.map((config) => (
          <div key={config.id} className="rounded-md border p-4">
            <div className="flex items-center gap-2">
              <strong className="text-lg">{config.module} Workflow</strong>
              <Badge tone={config.status === "Active" ? "success" : "default"}>{config.status}</Badge>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {config.steps.sort((a, b) => a.order - b.order).map((step, idx) => (
                <div key={step.id} className="flex items-center gap-2">
                  <div className="rounded-md border bg-muted px-3 py-2 text-sm">
                    <strong>{step.name}</strong>
                    <div className="text-xs text-muted-foreground">{step.assigneeRole} · {step.required ? "Required" : "Optional"}</div>
                  </div>
                  {idx < config.steps.length - 1 && <span className="text-muted-foreground">→</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TdsRulesTab() {
  const rules = useTdsRules();
  const columns = useMemo<ColDef<TdsRule>[]>(() => [
    { field: "name", headerName: "Rule" },
    { field: "category", headerName: "Category" },
    { field: "rate", headerName: "TDS Rate %", valueFormatter: ({ value }) => `${value}%` },
    { field: "module", headerName: "Module" },
    { field: "status", headerName: "Status", cellRenderer: (p: ICellRendererParams) => <Badge tone={p.value === "Active" ? "success" : "default"}>{p.value}</Badge> },
    { field: "effectiveFrom", headerName: "Effective From" }
  ], []);
  return (
    <Card>
      <CardHeader><CardTitle>TDS Rules</CardTitle><CardDescription>Category-based TDS rates for dividend and debenture interest.</CardDescription></CardHeader>
      <CardContent><EnterpriseGrid rows={rules.data ?? []} columns={columns} height={500} /></CardContent>
    </Card>
  );
}

function FormulaVersionsTab() {
  const formulas = useFormulaVersions();
  const columns = useMemo<ColDef<FormulaVersion>[]>(() => [
    { field: "name", headerName: "Formula" },
    { field: "version", headerName: "Version" },
    { field: "module", headerName: "Module" },
    { field: "description", headerName: "Description", minWidth: 300 },
    { field: "status", headerName: "Status", cellRenderer: (p: ICellRendererParams) => <Badge tone={p.value === "Active" ? "success" : "default"}>{p.value}</Badge> }
  ], []);
  return (
    <Card>
      <CardHeader><CardTitle>Formula Versions</CardTitle><CardDescription>Calculation engine versioning for dividend and interest formulas.</CardDescription></CardHeader>
      <CardContent>
        <EnterpriseGrid rows={formulas.data ?? []} columns={columns} height={300} />
        {formulas.data?.map((f) => (
          <div key={f.id} className="mt-4 rounded-md border bg-muted/40 p-3">
            <strong className="text-sm">{f.name} v{f.version}</strong>
            <pre className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{f.formula}</pre>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function HolidayCalendarTab() {
  const holidays = useHolidays();
  const columns = useMemo<ColDef<Holiday>[]>(() => [
    { field: "name", headerName: "Holiday" },
    { field: "date", headerName: "Date" },
    { field: "type", headerName: "Type", cellRenderer: (p: ICellRendererParams) => <Badge>{p.value}</Badge> },
    { field: "recurring", headerName: "Recurring", valueFormatter: ({ value }) => value ? "Yes" : "No" }
  ], []);
  return (
    <Card>
      <CardHeader><CardTitle>Holiday Calendar</CardTitle><CardDescription>Public, company, and bank holidays for business day calculation.</CardDescription></CardHeader>
      <CardContent><EnterpriseGrid rows={holidays.data ?? []} columns={columns} height={500} /></CardContent>
    </Card>
  );
}

function FeatureFlagsTab() {
  const flags = useFeatureFlags();
  const columns = useMemo<ColDef<FeatureFlag>[]>(() => [
    { field: "name", headerName: "Feature" },
    { field: "key", headerName: "Key" },
    { field: "module", headerName: "Module" },
    { field: "description", headerName: "Description", minWidth: 300 },
    { field: "enabled", headerName: "Enabled", cellRenderer: (p: ICellRendererParams) => <Badge tone={p.value ? "success" : "default"}>{p.value ? "ON" : "OFF"}</Badge> }
  ], []);
  return (
    <Card>
      <CardHeader><CardTitle>Feature Flags</CardTitle><CardDescription>Toggle features on/off across modules.</CardDescription></CardHeader>
      <CardContent><EnterpriseGrid rows={flags.data ?? []} columns={columns} height={500} /></CardContent>
    </Card>
  );
}