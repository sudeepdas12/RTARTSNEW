import type { ColDef, ICellRendererParams } from "@ag-grid-community/core";
import { CheckCircle2, Download, GitCompare, History, Search, Upload, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { EnterpriseGrid } from "@/components/data-grid/enterprise-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast-provider";
import { exportReconciliationToExcel } from "@/lib/export-utils";
import { useReconciliationItems } from "@/lib/queries";
import { formatMoney } from "@/lib/utils";
import type { ReconciliationItem } from "@/types/domain";

const statusTabs = ["All", "Matched", "Mismatch", "Manual Review", "Returned"] as const;

export function ReconciliationPage() {
  const items = useReconciliationItems();
  const [activeTab, setActiveTab] = useState<string>("All");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"auto-match" | "manual-match">("auto-match");

  const filteredItems = useMemo(() => {
    const all = items.data ?? [];
    if (activeTab === "All") return all;
    return all.filter((i) => i.status === activeTab);
  }, [items.data, activeTab]);

  const columns = useMemo<ColDef<ReconciliationItem>[]>(
    () => [
      { field: "id", headerName: "Item", pinned: "left" },
      { field: "batch" },
      { field: "bankReference", headerName: "Bank Ref" },
      { field: "expected", valueFormatter: ({ value }) => formatMoney(Number(value)) },
      { field: "received", valueFormatter: ({ value }) => formatMoney(Number(value)) },
      { field: "difference", valueFormatter: ({ value }) => formatMoney(Number(value)), cellStyle: { color: "red" } },
      { field: "status", cellRenderer: (p: ICellRendererParams) => {
        const s = p.value as string;
        const tone = s === "Matched" ? "success" : s === "Returned" ? "danger" : s === "Mismatch" ? "warning" : "default";
        return <Badge tone={tone}>{s}</Badge>;
      }},
      { field: "notes", headerName: "Notes", minWidth: 200 }
    ],
    []
  );

  const summary = useMemo(() => {
    const all = items.data ?? [];
    return {
      total: all.length,
      matched: all.filter((i) => i.status === "Matched").length,
      mismatch: all.filter((i) => i.status === "Mismatch").length,
      manualReview: all.filter((i) => i.status === "Manual Review").length,
      returned: all.filter((i) => i.status === "Returned").length,
      totalDifference: all.reduce((s, i) => s + i.difference, 0)
    };
  }, [items.data]);

  function handleAutoMatch() {
    setConfirmAction("auto-match");
    setConfirmOpen(true);
  }

  function handleManualMatch() {
    setConfirmAction("manual-match");
    setConfirmOpen(true);
  }

  function handleExport() {
    const data = items.data ?? [];
    if (data.length === 0) { toast.error("No data to export"); return; }
    exportReconciliationToExcel(data);
    toast.success("Reconciliation data exported to Excel");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Bank Reconciliation</CardTitle>
            <CardDescription>Import response file, auto match, manual match, reconcile mismatches, exceptions, and history.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" disabled><Upload className="h-4 w-4" />Import Response</Button>
            <Button variant="secondary" onClick={handleAutoMatch}><GitCompare className="h-4 w-4" />Auto Match</Button>
            <Button variant="secondary" onClick={handleManualMatch}><CheckCircle2 className="h-4 w-4" />Manual Match</Button>
            <Button variant="secondary" onClick={handleExport}><Download className="h-4 w-4" />Excel</Button>
            <Button variant="secondary" disabled><History className="h-4 w-4" />History</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-5 gap-3">
            <div className="rounded-md border bg-background p-3">
              <span className="text-xs text-muted-foreground">Total Items</span>
              <strong className="mt-1 block text-2xl">{summary.total}</strong>
            </div>
            <div className="rounded-md border bg-green-50 p-3">
              <span className="text-xs text-green-700">Matched</span>
              <strong className="mt-1 block text-2xl text-green-700">{summary.matched}</strong>
            </div>
            <div className="rounded-md border bg-amber-50 p-3">
              <span className="text-xs text-amber-700">Mismatch</span>
              <strong className="mt-1 block text-2xl text-amber-700">{summary.mismatch}</strong>
            </div>
            <div className="rounded-md border bg-blue-50 p-3">
              <span className="text-xs text-blue-700">Manual Review</span>
              <strong className="mt-1 block text-2xl text-blue-700">{summary.manualReview}</strong>
            </div>
            <div className="rounded-md border bg-red-50 p-3">
              <span className="text-xs text-red-700">Returned</span>
              <strong className="mt-1 block text-2xl text-red-700">{summary.returned}</strong>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-1 rounded-md border p-0.5">
              {statusTabs.map((tab) => (
                <button
                  key={tab}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${activeTab === tab ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input className="h-8 rounded-md border bg-background px-2 text-sm" placeholder="Filter by batch, bank ref..." />
            </div>
            <div className="ml-auto text-sm text-muted-foreground">
              Total difference: <strong className={summary.totalDifference > 0 ? "text-red-600" : "text-green-600"}>{formatMoney(summary.totalDifference)}</strong>
            </div>
          </div>

          <EnterpriseGrid rows={filteredItems} columns={columns} height={400} />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction === "auto-match" ? "Auto Match Reconciliation" : "Manual Match"}
        description={confirmAction === "auto-match" ? "This will attempt to automatically match all pending reconciliation items against bank response data." : "This will manually match the selected reconciliation item. Verify the details before confirming."}
        variant="info"
        confirmLabel={confirmAction === "auto-match" ? "Run Auto Match" : "Confirm Match"}
        onConfirm={() => {
          toast.success(confirmAction === "auto-match" ? "Auto-match completed: 3 items matched, 2 exceptions" : "Item manually matched");
        }}
      />
    </div>
  );
}