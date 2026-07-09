import type { ColDef, ICellRendererParams } from "@ag-grid-community/core";
import { useMemo, useState } from "react";
import { EnterpriseGrid } from "@/components/data-grid/enterprise-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast-provider";
import { useAuditEntries } from "@/lib/queries";
import type { AuditEntry } from "@/types/domain";

export function AuditPage() {
  const audit = useAuditEntries();
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const columns = useMemo<ColDef<AuditEntry>[]>(() => [
    { field: "id", headerName: "ID", pinned: "left", width: 100 },
    { field: "timestamp", headerName: "Timestamp", width: 180 },
    { field: "user", headerName: "User" },
    { field: "role", headerName: "Role" },
    { field: "module", headerName: "Module" },
    { field: "entity", headerName: "Entity" },
    { field: "entityId", headerName: "Entity ID" },
    { field: "action", headerName: "Action", cellRenderer: (p: ICellRendererParams) => {
      const action = p.value as string;
      const tone = action === "APPROVE" ? "success" : action === "CREATE" ? "info" : action === "UPDATE" ? "warning" : action === "DELETE" ? "danger" : "default";
      return <Badge tone={tone}>{action}</Badge>;
    }},
    { field: "ip", headerName: "IP" },
    { field: "device", headerName: "Device", minWidth: 200 }
  ], []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Audit Trail</CardTitle>
            <CardDescription>Immutable audit log with before/after state, user, role, IP, device, module, entity, and changes.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <EnterpriseGrid
            rows={audit.data ?? []}
            columns={columns}
            height={400}
            onSelectionChanged={(rows) => setSelectedEntry(rows[0] ?? null)}
          />

          {selectedEntry && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Change Details: {selectedEntry.id}</CardTitle>
                <CardDescription>{selectedEntry.action} on {selectedEntry.entity} ({selectedEntry.entityId}) by {selectedEntry.user}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Before State</h4>
                    {selectedEntry.before ? (
                      <pre className="rounded-md border bg-muted/40 p-3 text-xs">{JSON.stringify(selectedEntry.before, null, 2)}</pre>
                    ) : (
                      <p className="text-sm text-muted-foreground">No prior state (creation)</p>
                    )}
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">After State</h4>
                    {selectedEntry.after ? (
                      <pre className="rounded-md border bg-muted/40 p-3 text-xs">{JSON.stringify(selectedEntry.after, null, 2)}</pre>
                    ) : (
                      <p className="text-sm text-muted-foreground">No after state (deletion)</p>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <h4 className="mb-2 text-sm font-semibold">Changes</h4>
                  <ul className="space-y-1">
                    {selectedEntry.changes.map((change, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-3 text-sm">
                  <div><strong>User:</strong> {selectedEntry.user}</div>
                  <div><strong>Role:</strong> {selectedEntry.role}</div>
                  <div><strong>IP:</strong> {selectedEntry.ip}</div>
                  <div><strong>Device:</strong> {selectedEntry.device}</div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}