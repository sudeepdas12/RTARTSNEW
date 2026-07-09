import type { ColDef, ICellRendererParams } from "@ag-grid-community/core";
import { 
  Banknote, 
  Download, 
  RefreshCw, 
  Upload, 
  XCircle 
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EnterpriseGrid } from "@/components/data-grid/enterprise-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast-provider";
import { exportPaymentBatchesToExcel } from "@/lib/export-utils";
import { usePaymentBatches, usePaymentItems } from "@/lib/queries";
import { formatMoney, formatNumber } from "@/lib/utils";
import type { PaymentBatch, PaymentItem } from "@/types/domain";

const statusTabs = ["All", "Draft", "Exported", "Reconciling", "Settled", "Failed", "Returned", "Cancelled", "Unclaimed"] as const;

export function PaymentPage() {
  const { data: batches = [], isLoading } = usePaymentBatches();
  const [activeTab, setActiveTab] = useState<string>("All");
  const [selectedBatch, setSelectedBatch] = useState<string>("PAY-078");
  const [selectedBatchData, setSelectedBatchData] = useState<PaymentBatch | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"export" | "cancel" | "retry">("export");
  const { data: items = [], isLoading: itemsLoading } = usePaymentItems(selectedBatch);

  const filteredBatches = useMemo(() => {
    if (activeTab === "All") return batches;
    return batches.filter((b) => b.status === activeTab);
  }, [batches, activeTab]);

  // Batch summary stats
  const summaryStats = useMemo(() => {
    const all = batches;
    return {
      total: all.length,
      totalAmount: all.reduce((s, b) => s + b.amount, 0),
      totalItems: all.reduce((s, b) => s + b.items, 0),
      settled: all.filter((b) => b.status === "Settled").length,
      failed: all.filter((b) => b.status === "Failed").length,
      returned: all.filter((b) => b.status === "Returned").length,
      unclaimed: all.filter((b) => b.status === "Unclaimed").length,
      draft: all.filter((b) => b.status === "Draft").length,
      exported: all.filter((b) => b.status === "Exported").length,
      reconciling: all.filter((b) => b.status === "Reconciling").length,
      cancelled: all.filter((b) => b.status === "Cancelled").length
    };
  }, [batches]);

  // Chart data
  const chartData = useMemo(() => [
    { name: "Draft", value: summaryStats.draft },
    { name: "Exported", value: summaryStats.exported },
    { name: "Reconciling", value: summaryStats.reconciling },
    { name: "Settled", value: summaryStats.settled },
    { name: "Failed", value: summaryStats.failed },
    { name: "Returned", value: summaryStats.returned },
    { name: "Cancelled", value: summaryStats.cancelled },
    { name: "Unclaimed", value: summaryStats.unclaimed }
  ], [summaryStats]);

  // Payment status icon mapping
  const statusIcon = useMemo(() => ({
    Draft: "🔵", Exported: "📤", Reconciling: "🔄", Settled: "✅",
    Failed: "❌", Returned: "↩️", Cancelled: "🚫", Unclaimed: "⚠️"
  } as Record<string, string>), []);

  const batchFooter = useMemo(() => {
    if (!filteredBatches.length) return undefined;
    return {
      "Total Batches": formatNumber(filteredBatches.length),
      "Total Amount": formatMoney(filteredBatches.reduce((s, b) => s + b.amount, 0)),
      "Total Items": formatNumber(filteredBatches.reduce((s, b) => s + b.items, 0))
    };
  }, [filteredBatches]);

  const batchColumns = useMemo<ColDef<PaymentBatch>[]>(
    () => [
      { field: "id", headerName: "Batch ID", pinned: "left", width: 120, checkboxSelection: true, headerCheckboxSelection: true },
      { field: "company", headerName: "Company", minWidth: 180 },
      { field: "lot", headerName: "Lot", width: 100 },
      { field: "bank", headerName: "Bank", width: 120 },
      { 
        field: "amount", headerName: "Amount", width: 130, type: "numericColumn",
        valueFormatter: ({ value }) => formatMoney(Number(value)), aggFunc: "sum" 
      },
      { 
        field: "items", headerName: "Items", width: 90, type: "numericColumn",
        valueFormatter: ({ value }) => formatNumber(Number(value)), aggFunc: "sum" 
      },
      { 
        field: "status", headerName: "Status", width: 120,
        cellRenderer: (p: ICellRendererParams) => {
          const s = p.value as string;
          const tone = s === "Settled" ? "success" : 
            s === "Failed" || s === "Returned" || s === "Cancelled" ? "danger" : 
            s === "Reconciling" || s === "Draft" ? "warning" : "default";
          return <Badge tone={tone}>{s} {statusIcon[s] ?? ""}</Badge>;
        }
      },
      { field: "cycleType", headerName: "Cycle Type", width: 100 },
      { field: "bankReference", headerName: "Bank Ref", width: 130 },
      { field: "createdBy", headerName: "Created By", width: 110 },
      { field: "createdAt", headerName: "Created", width: 110 },
      { field: "exportedAt", headerName: "Exported", width: 110 },
      { field: "settledAt", headerName: "Settled", width: 110 }
    ],
    [statusIcon]
  );

  const itemColumns = useMemo<ColDef<PaymentItem>[]>(
    () => [
      { field: "boid", headerName: "BOID", pinned: "left", width: 160 },
      { field: "holder", headerName: "Holder Name", minWidth: 200 },
      { 
        field: "amount", headerName: "Amount", width: 130, type: "numericColumn",
        valueFormatter: ({ value }) => formatMoney(Number(value)), aggFunc: "sum" 
      },
      { field: "bank", headerName: "Bank", width: 110 },
      { field: "accountNumber", headerName: "Account", width: 120 },
      { 
        field: "status", headerName: "Status", width: 110,
        cellRenderer: (p: ICellRendererParams) => {
          const s = p.value as string;
          const tone = s === "Paid" ? "success" : 
            s === "Failed" || s === "Returned" ? "danger" : 
            s === "Unclaimed" ? "warning" : "default";
          return <Badge tone={tone}>{s}</Badge>;
        }
      },
      { field: "failureReason", headerName: "Reason", minWidth: 200, flex: 1 }
    ],
    []
  );

  const itemFooter = useMemo(() => {
    if (!items.length) return undefined;
    return {
      "Total Items": formatNumber(items.length),
      "Total Amount": formatMoney(items.reduce((s, i) => s + i.amount, 0))
    };
  }, [items]);

  const handleExportExcel = useCallback(() => {
    if (!batches.length) { toast.error("No data to export"); return; }
    exportPaymentBatchesToExcel(batches);
    toast.success(`Exported ${batches.length} payment batches`);
  }, [batches]);

  const handleRowDoubleClicked = useCallback((row: PaymentBatch) => {
    setSelectedBatch(row.id);
    setSelectedBatchData(row);
  }, []);

  const handleBatchAction = useCallback((action: "export" | "cancel" | "retry") => {
    if (!selectedBatch) { toast.error("Select a batch first"); return; }
    setConfirmAction(action);
    setConfirmOpen(true);
  }, [selectedBatch]);

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="page-header">
        <div className="page-breadcrumb">Home / Payments / Payment Operations</div>
        <h1 className="page-title">Payment Operations</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-3">
        <div className="stat">
          <span className="stat-label">Total Batches</span>
          <strong className="stat-value">{formatNumber(summaryStats.total)}</strong>
        </div>
        <div className="stat">
          <span className="stat-label">Total Amount</span>
          <strong className="stat-value">{formatMoney(summaryStats.totalAmount)}</strong>
        </div>
        <div className="stat">
          <span className="stat-label">Total Items</span>
          <strong className="stat-value">{formatNumber(summaryStats.totalItems)}</strong>
        </div>
        <div className="stat border-green-200 bg-green-50/50">
          <span className="stat-label text-green-700">Settled</span>
          <strong className="stat-value text-green-700">{formatNumber(summaryStats.settled)}</strong>
        </div>
        <div className="stat border-red-200 bg-red-50/50">
          <span className="stat-label text-red-700">Failed/Returned</span>
          <strong className="stat-value text-red-700">{formatNumber(summaryStats.failed + summaryStats.returned)}</strong>
        </div>
      </div>

      {/* Chart + Status Breakdown */}
      <div className="grid grid-cols-[1fr_300px] gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Payment Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="value" fill="hsl(187, 78%, 27%)" radius={[2, 2, 0, 0]} name="Batches" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border bg-background p-2 text-center">
            <span className="text-xs text-muted-foreground">📤 Exported</span>
            <strong className="block text-lg">{formatNumber(summaryStats.exported)}</strong>
          </div>
          <div className="rounded-md border bg-background p-2 text-center">
            <span className="text-xs text-muted-foreground">🔄 Reconciling</span>
            <strong className="block text-lg">{formatNumber(summaryStats.reconciling)}</strong>
          </div>
          <div className="rounded-md border bg-background p-2 text-center">
            <span className="text-xs text-muted-foreground">⚠️ Unclaimed</span>
            <strong className="block text-lg">{formatNumber(summaryStats.unclaimed)}</strong>
          </div>
          <div className="rounded-md border bg-background p-2 text-center">
            <span className="text-xs text-muted-foreground">🚫 Cancelled</span>
            <strong className="block text-lg">{formatNumber(summaryStats.cancelled)}</strong>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Payment Batches</CardTitle>
              <CardDescription>{filteredBatches.length} batches · Total {formatMoney(filteredBatches.reduce((s, b) => s + b.amount, 0))}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" className="h-8 text-xs" onClick={handleExportExcel}>
                <Download className="h-3.5 w-3.5" />
                Excel
              </Button>
              <Button variant="secondary" className="h-8 text-xs" disabled>
                <Upload className="h-3.5 w-3.5" />
                Import Response
              </Button>
              <Button className="h-8 text-xs" onClick={() => handleBatchAction("export")} disabled={!selectedBatch}>
                <Banknote className="h-3.5 w-3.5" />
                Export Bank File
              </Button>
              <Button variant="danger" className="h-8 text-xs" onClick={() => handleBatchAction("cancel")} disabled={!selectedBatch}>
                <XCircle className="h-3.5 w-3.5" />
                Cancel Batch
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Filter Tabs */}
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

          {/* Batches Grid */}
          <EnterpriseGrid<PaymentBatch>
            rows={filteredBatches}
            columns={batchColumns}
            height={300}
            loading={isLoading}
            showFooter
            footerRow={batchFooter}
            onSelectionChanged={(rows: PaymentBatch[]) => { if (rows.length > 0 && rows[0]) { setSelectedBatch(rows[0].id); setSelectedBatchData(rows[0]); } }}
            onRowDoubleClicked={handleRowDoubleClicked}
            getRowId={(params) => params.data.id}
            emptyTitle="No payment batches found"
            emptyDescription="Payment batches are created automatically when dividend or interest cycles are approved."
          />

          {/* Selected Batch Detail + Items */}
          {selectedBatchData && (
            <div className="grid grid-cols-[1fr_280px] gap-4">
              <div>
                <h3 className="mb-2 text-sm font-semibold">
                  Payment Items: {selectedBatch}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{items.length} items</span>
                </h3>
                <EnterpriseGrid<PaymentItem>
                  rows={items}
                  columns={itemColumns}
                  height={260}
                  loading={itemsLoading}
                  showFooter
                  footerRow={itemFooter}
                  getRowId={(params) => params.data.id}
                  emptyTitle="No payment items"
                  emptyDescription="Items are generated when the payment batch is created from approved cycles."
                />
              </div>

              {/* Batch Detail Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs">{selectedBatchData.id}</CardTitle>
                  <CardDescription className="text-xs">{selectedBatchData.company}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="rounded-md border bg-muted/30 p-2">
                    <span className="text-muted-foreground">Lot</span>
                    <strong className="ml-2">{selectedBatchData.lot}</strong>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-2">
                    <span className="text-muted-foreground">Bank</span>
                    <strong className="ml-2">{selectedBatchData.bank}</strong>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-2">
                    <span className="text-muted-foreground">Amount</span>
                    <strong className="ml-2">{formatMoney(selectedBatchData.amount)}</strong>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-2">
                    <span className="text-muted-foreground">Items</span>
                    <strong className="ml-2">{formatNumber(selectedBatchData.items)}</strong>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-2">
                    <span className="text-muted-foreground">Status</span>
                    <Badge tone={
                      selectedBatchData.status === "Settled" ? "success" :
                      ["Failed","Returned","Cancelled"].includes(selectedBatchData.status) ? "danger" : "warning"
                    } className="ml-2">{selectedBatchData.status}</Badge>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-2">
                    <span className="text-muted-foreground">Cycle Type</span>
                    <strong className="ml-2">{selectedBatchData.cycleType ?? "—"}</strong>
                  </div>
                  {selectedBatchData.bankReference && (
                    <div className="rounded-md border bg-muted/30 p-2">
                      <span className="text-muted-foreground">Bank Ref</span>
                      <strong className="ml-2">{selectedBatchData.bankReference}</strong>
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Button variant="secondary" className="h-7 text-xs flex-1" onClick={() => handleBatchAction("retry")}>
                      <RefreshCw className="h-3 w-3" /> Retry
                    </Button>
                    <Button variant="danger" className="h-7 text-xs flex-1" onClick={() => handleBatchAction("cancel")}>
                      <XCircle className="h-3 w-3" /> Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={confirmOpen && confirmAction === "export"}
        onOpenChange={(open) => setConfirmOpen(open)}
        title="Generate Bank Export File"
        description={`This will generate the bank payment file for batch ${selectedBatch}. The file will be formatted per bank requirements.`}
        variant="info"
        confirmLabel="Generate File"
        onConfirm={() => { toast.success(`Bank file generated for ${selectedBatch}`); setConfirmOpen(false); }}
      />
      <ConfirmDialog
        open={confirmOpen && confirmAction === "cancel"}
        onOpenChange={(open) => setConfirmOpen(open)}
        title="Cancel Payment Batch"
        description={`This will cancel batch ${selectedBatch}. All items will be returned to Unclaimed status. This action requires supervisor approval.`}
        variant="danger"
        confirmLabel="Request Cancellation"
        onConfirm={() => { toast.warning(`Cancellation requested for ${selectedBatch}`); setConfirmOpen(false); }}
      />
      <ConfirmDialog
        open={confirmOpen && confirmAction === "retry"}
        onOpenChange={(open) => setConfirmOpen(open)}
        title="Retry Failed Payments"
        description={`This will retry ${items.filter(i => i.status === "Failed").length} failed payments in batch ${selectedBatch}.`}
        variant="warning"
        confirmLabel="Retry Failed Payments"
        onConfirm={() => { toast.success(`Retrying failed payments for ${selectedBatch}`); setConfirmOpen(false); }}
      />
    </div>
  );
}