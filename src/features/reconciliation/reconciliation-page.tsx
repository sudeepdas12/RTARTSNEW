import type { ColDef, ICellRendererParams } from "@ag-grid-community/core";
import { 
  CheckCircle2, 
  Download, 
  FileSpreadsheet, 
  GitCompare, 
  History, 
  RotateCcw, 
  Search, 
  Upload, 
  X,
  XCircle 
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { EnterpriseGrid } from "@/components/data-grid/enterprise-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast-provider";
import { exportReconciliationToExcel } from "@/lib/export-utils";
import { useReconciliationItems } from "@/lib/queries";
import { formatMoney, formatNumber } from "@/lib/utils";
import type { ReconciliationItem } from "@/types/domain";

const statusTabs = ["All", "Matched", "Mismatch", "Manual Review", "Returned"] as const;

export function ReconciliationPage() {
  const { data: items = [], isLoading } = useReconciliationItems();
  const [activeTab, setActiveTab] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<ReconciliationItem | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"auto-match" | "manual-match" | "reconcile" | "settle">("auto-match");

  // Filter by tab + search
  const filteredItems = useMemo(() => {
    let all = items;
    if (activeTab !== "All") all = all.filter((i) => i.status === activeTab);
    if (search) {
      const q = search.toLowerCase();
      all = all.filter((i) => 
        i.batch.toLowerCase().includes(q) || 
        i.bankReference.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q)
      );
    }
    return all;
  }, [items, activeTab, search]);

  // Summary stats
  const summary = useMemo(() => {
    const all = items;
    return {
      total: all.length,
      matched: all.filter((i) => i.status === "Matched").length,
      mismatch: all.filter((i) => i.status === "Mismatch").length,
      manualReview: all.filter((i) => i.status === "Manual Review").length,
      returned: all.filter((i) => i.status === "Returned").length,
      totalExpected: all.reduce((s, i) => s + i.expected, 0),
      totalReceived: all.reduce((s, i) => s + i.received, 0),
      totalDifference: all.reduce((s, i) => s + i.difference, 0),
      matchRate: all.length > 0 ? Math.round((all.filter((i) => i.status === "Matched").length / all.length) * 100) : 0
    };
  }, [items]);

  // Footer totals
  const footerRow = useMemo(() => {
    if (!filteredItems.length) return undefined;
    return {
      "Total Items": formatNumber(filteredItems.length),
      "Expected": formatMoney(filteredItems.reduce((s, i) => s + i.expected, 0)),
      "Received": formatMoney(filteredItems.reduce((s, i) => s + i.received, 0)),
      "Difference": formatMoney(filteredItems.reduce((s, i) => s + i.difference, 0))
    };
  }, [filteredItems]);

  const columns = useMemo<ColDef<ReconciliationItem>[]>(
    () => [
      { field: "id", headerName: "Item ID", pinned: "left", width: 100, checkboxSelection: true, headerCheckboxSelection: true },
      { field: "batch", headerName: "Batch", width: 120 },
      { field: "bankReference", headerName: "Bank Ref", width: 140 },
      { 
        field: "expected", headerName: "Expected", width: 130, type: "numericColumn",
        valueFormatter: ({ value }) => formatMoney(Number(value)), aggFunc: "sum",
        cellStyle: { fontFamily: "monospace", fontWeight: "normal" }
      },
      { 
        field: "received", headerName: "Received", width: 130, type: "numericColumn",
        valueFormatter: ({ value }) => formatMoney(Number(value)), aggFunc: "sum",
        cellStyle: { fontFamily: "monospace", fontWeight: "normal" }
      },
      { 
        field: "difference", headerName: "Difference", width: 130, type: "numericColumn",
        valueFormatter: ({ value }) => formatMoney(Number(value)), aggFunc: "sum",
        cellStyle: { fontFamily: "monospace", fontWeight: "bold" }
      },
      { 
        field: "status", headerName: "Status", width: 130,
        cellRenderer: (p: ICellRendererParams) => {
          const s = p.value as string;
          const tone = s === "Matched" ? "success" : 
            s === "Returned" ? "danger" : 
            s === "Mismatch" ? "warning" : "info";
          return <Badge tone={tone}>{s}</Badge>;
        }
      },
      { field: "matchedBy", headerName: "Matched By", width: 110 },
      { field: "matchedAt", headerName: "Matched At", width: 110 },
      { field: "notes", headerName: "Notes", minWidth: 200, flex: 1 }
    ],
    []
  );

  const handleExport = useCallback(() => {
    if (!items.length) { toast.error("No data to export"); return; }
    exportReconciliationToExcel(items);
    toast.success(`Exported ${items.length} reconciliation items`);
  }, [items]);

  const handleRowDoubleClicked = useCallback((row: ReconciliationItem) => {
    setSelectedItem(row);
  }, []);

  const handleAction = useCallback((action: "auto-match" | "manual-match" | "reconcile" | "settle") => {
    setConfirmAction(action);
    setConfirmOpen(true);
  }, []);

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="page-header">
        <div className="page-breadcrumb">Home / Reconciliation / Bank Reconciliation</div>
        <h1 className="page-title">Bank Reconciliation</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-6 gap-3">
        <div className="stat">
          <span className="stat-label">Total Items</span>
          <strong className="stat-value">{formatNumber(summary.total)}</strong>
        </div>
        <div className="stat border-green-200 bg-green-50/50">
          <span className="stat-label text-green-700">Matched</span>
          <strong className="stat-value text-green-700">{formatNumber(summary.matched)}</strong>
          <span className="text-xs text-green-600">{summary.matchRate}% rate</span>
        </div>
        <div className="stat border-amber-200 bg-amber-50/50">
          <span className="stat-label text-amber-700">Mismatch</span>
          <strong className="stat-value text-amber-700">{formatNumber(summary.mismatch)}</strong>
        </div>
        <div className="stat border-blue-200 bg-blue-50/50">
          <span className="stat-label text-blue-700">Manual Review</span>
          <strong className="stat-value text-blue-700">{formatNumber(summary.manualReview)}</strong>
        </div>
        <div className="stat border-red-200 bg-red-50/50">
          <span className="stat-label text-red-700">Returned</span>
          <strong className="stat-value text-red-700">{formatNumber(summary.returned)}</strong>
        </div>
        <div className="stat">
          <span className="stat-label">Total Difference</span>
          <strong className={`stat-value ${summary.totalDifference > 0 ? "text-red-600" : "text-green-600"}`}>
            {formatMoney(summary.totalDifference)}
          </strong>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: selectedItem ? "1fr 360px" : "1fr" }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Reconciliation Items</CardTitle>
                <CardDescription>
                  Expected: {formatMoney(summary.totalExpected)} · Received: {formatMoney(summary.totalReceived)} · 
                  Difference: <span className={summary.totalDifference > 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                    {formatMoney(summary.totalDifference)}
                  </span>
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" className="h-8 text-xs" disabled>
                  <Upload className="h-3.5 w-3.5" />
                  Import Response
                </Button>
                <Button variant="secondary" className="h-8 text-xs" onClick={() => handleAction("auto-match")}>
                  <GitCompare className="h-3.5 w-3.5" />
                  Auto Match
                </Button>
                <Button variant="secondary" className="h-8 text-xs" onClick={() => handleAction("manual-match")}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Manual Match
                </Button>
                <Button variant="secondary" className="h-8 text-xs" onClick={handleExport}>
                  <Download className="h-3.5 w-3.5" />
                  Excel
                </Button>
                <Button variant="secondary" className="h-8 text-xs" disabled>
                  <History className="h-3.5 w-3.5" />
                  History
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="filter-tabs">
                {statusTabs.map((tab) => (
                  <button
                    key={tab}
                    className={`filter-tab ${activeTab === tab ? "filter-tab-active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input 
                  className="h-8 w-full rounded-md border bg-background pl-8 pr-2 text-xs" 
                  placeholder="Search batch, bank ref..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}>
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>
              <Button variant="ghost" className="h-8 text-xs" onClick={() => { setSearch(""); setActiveTab("All"); }}>
                <RotateCcw className="h-3 w-3" /> Reset
              </Button>
            </div>

            {/* Grid */}
            <EnterpriseGrid<ReconciliationItem>
              rows={filteredItems}
              columns={columns}
              height={420}
              loading={isLoading}
              showFooter
              footerRow={footerRow}
              onSelectionChanged={(rows: ReconciliationItem[]) => { if (rows.length > 0 && rows[0]) setSelectedItem(rows[0]); }}
              onRowDoubleClicked={handleRowDoubleClicked}
              getRowId={(params) => params.data.id}
              emptyTitle="No reconciliation items"
              emptyDescription="Import a bank response file or generate payment batches to start reconciliation."
            />
          </CardContent>
        </Card>

        {/* Detail Drawer */}
        {selectedItem && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{selectedItem.id}</CardTitle>
                <Button variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelectedItem(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>Batch: {selectedItem.batch}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border bg-muted/30 p-2">
                  <span className="text-xs text-muted-foreground">Bank Reference</span>
                  <strong className="block">{selectedItem.bankReference}</strong>
                </div>
                <div className="rounded-md border bg-muted/30 p-2">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <Badge tone={
                    selectedItem.status === "Matched" ? "success" :
                    selectedItem.status === "Returned" ? "danger" :
                    selectedItem.status === "Mismatch" ? "warning" : "info"
                  } className="mt-1">{selectedItem.status}</Badge>
                </div>
              </div>

              <div className="rounded-md border p-3">
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground">Amount Comparison</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected</span>
                    <strong className="font-mono">{formatMoney(selectedItem.expected)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Received</span>
                    <strong className="font-mono">{formatMoney(selectedItem.received)}</strong>
                  </div>
                  <div className="border-t pt-1 flex justify-between">
                    <span className="text-muted-foreground">Difference</span>
                    <strong className={`font-mono ${selectedItem.difference > 0 ? "text-red-600" : selectedItem.difference < 0 ? "text-green-600" : ""}`}>
                      {formatMoney(selectedItem.difference)}
                    </strong>
                  </div>
                </div>
              </div>

              {selectedItem.matchedBy && (
                <div className="rounded-md border bg-muted/30 p-2">
                  <span className="text-xs text-muted-foreground">Matched By</span>
                  <strong className="block">{selectedItem.matchedBy}</strong>
                  <span className="text-xs text-muted-foreground">{selectedItem.matchedAt}</span>
                </div>
              )}

              {selectedItem.notes && (
                <div className="rounded-md border bg-muted/30 p-2">
                  <span className="text-xs text-muted-foreground">Notes</span>
                  <p className="mt-1 text-sm">{selectedItem.notes}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="secondary" className="h-8 text-xs flex-1" onClick={() => handleAction("manual-match")}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Match
                </Button>
                <Button variant="danger" className="h-8 text-xs flex-1" onClick={() => handleAction("reconcile")}>
                  <XCircle className="h-3.5 w-3.5" /> Exception
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={confirmOpen && confirmAction === "auto-match"}
        onOpenChange={(open) => setConfirmOpen(open)}
        title="Auto Match Reconciliation"
        description={`This will attempt to automatically match ${summary.mismatch + summary.manualReview} pending items against bank response data. Items with matching amounts will be marked as Matched.`}
        variant="info"
        confirmLabel="Run Auto Match"
        onConfirm={() => { toast.success(`Auto-match completed: ${summary.mismatch} matched, ${summary.manualReview} exceptions`); setConfirmOpen(false); }}
      />
      <ConfirmDialog
        open={confirmOpen && confirmAction === "manual-match"}
        onOpenChange={(open) => setConfirmOpen(open)}
        title="Manual Match"
        description="Manually match the selected reconciliation item. Verify the expected and received amounts match before confirming."
        variant="info"
        confirmLabel="Confirm Match"
        onConfirm={() => { toast.success("Item manually matched"); setSelectedItem(null); setConfirmOpen(false); }}
      />
      <ConfirmDialog
        open={confirmOpen && confirmAction === "reconcile"}
        onOpenChange={(open) => setConfirmOpen(open)}
        title="Mark as Exception"
        description="This will flag the item as an exception for further investigation. A reconciliation report will be generated."
        variant="warning"
        confirmLabel="Flag as Exception"
        onConfirm={() => { toast.warning("Item flagged as exception"); setConfirmOpen(false); }}
      />
    </div>
  );
}