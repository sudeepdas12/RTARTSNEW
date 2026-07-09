import type { ColDef, ICellRendererParams } from "@ag-grid-community/core";
import { ArrowRight, CheckCircle2, FileCheck2, History } from "lucide-react";
import { useMemo, useState } from "react";
import { EnterpriseGrid } from "@/components/data-grid/enterprise-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast-provider";
import { useCorporateActions } from "@/lib/queries";
import type { CorporateAction } from "@/types/domain";

const actionTypes = ["IPO", "Rights", "Bonus", "Split", "Merger", "Acquisition", "Stock Dividend", "Cash Dividend"];

export function CorporateActionsPage() {
  const actions = useCorporateActions();
  const [selectedAction, setSelectedAction] = useState<CorporateAction | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const columns = useMemo<ColDef<CorporateAction>[]>(
    () => [
      { field: "id", headerName: "ID", pinned: "left" },
      { field: "type", headerName: "Type", cellRenderer: (p: ICellRendererParams) => <Badge>{p.value}</Badge> },
      { field: "company" },
      { field: "title", headerName: "Title", minWidth: 250 },
      { field: "announcementDate", headerName: "Announced" },
      { field: "recordDate", headerName: "Record Date" },
      { field: "exDate", headerName: "Ex Date" },
      { field: "status", cellRenderer: (p: ICellRendererParams) => {
        const s = p.value as string;
        return <Badge tone={s === "approved" ? "success" : s === "pending" ? "warning" : "default"}>{s}</Badge>;
      }},
      { field: "progress", headerName: "Progress %" }
    ],
    []
  );

  function handleStartWizard(type: string) {
    toast.info(`Starting ${type} wizard - multi-step form with validation, document upload, and approval workflow`);
  }

  function handleApprove(action: CorporateAction) {
    setSelectedAction(action);
    setConfirmOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {actionTypes.map((action) => (
          <Card key={action}>
            <CardHeader>
              <div>
                <CardTitle>{action}</CardTitle>
                <CardDescription>Wizard, validation, approval workflow, documents, timeline, history, and reports.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button onClick={() => handleStartWizard(action)}><ArrowRight className="h-4 w-4" />Start Wizard</Button>
              <Button variant="secondary"><FileCheck2 className="h-4 w-4" />Docs</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Corporate Actions Register</CardTitle>
            <CardDescription>All corporate actions with status, progress, documents, and timeline.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <EnterpriseGrid rows={actions.data ?? []} columns={columns} height={300} />

          {selectedAction && (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Documents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selectedAction.documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No documents uploaded</p>
                  ) : (
                    selectedAction.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                        <div>
                          <strong className="block">{doc.title}</strong>
                          <span className="text-xs text-muted-foreground">{doc.fileName} · v{doc.version} · {doc.ocrStatus}</span>
                        </div>
                        <Badge tone={doc.ocrStatus === "Completed" ? "success" : "warning"}>{doc.ocrStatus}</Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selectedAction.timeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No timeline events</p>
                  ) : (
                    selectedAction.timeline.map((event) => (
                      <div key={event.id} className="flex items-start gap-3 rounded-md border p-2 text-sm">
                        <div className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-muted">
                          <History className="h-3 w-3" />
                        </div>
                        <div>
                          <strong className="block">{event.action}</strong>
                          <span className="text-xs text-muted-foreground">{event.user} · {event.role} · {new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={() => selectedAction && handleApprove(selectedAction)} disabled={!selectedAction || selectedAction.status !== "pending"}>
              <CheckCircle2 className="h-4 w-4" />Approve Selected
            </Button>
            <Button variant="secondary" disabled><History className="h-4 w-4" />History</Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Approve Corporate Action"
        description={`This will approve "${selectedAction?.title}" for ${selectedAction?.company}. This action advances the workflow to the next stage.`}
        variant="info"
        confirmLabel="Approve"
        onConfirm={() => {
          toast.success(`Corporate action ${selectedAction?.id} approved`);
          setSelectedAction(null);
        }}
      />
    </div>
  );
}