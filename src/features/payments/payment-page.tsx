import type { ColDef, ICellRendererParams } from "@ag-grid-community/core";
import { Ban, Banknote, BarChart3, CheckCircle2, Download, FileX, RotateCcw, Upload, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
  const batches = usePaymentBatches();
  const [activeTab, setActiveTab] = useState<string>("All");
  const [selectedBatch, setSelectedBatch] = useState<string>("PAY-078");
  const items = usePaymentItems(selectedBatch);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"export" | "cancel">("export");

  const filteredBatches = useMemo(() => {
    const all = batches.data ?? [];
    if (activeTab === "All") return all;
    return all.filter((b) => b.status === activeTab);
  }, [batches.data, activeTab]);

  const batchColumns = useMemo<ColDef<PaymentBatch>[]>(
    () => [
      { field: "id", headerName: "Batch", pinned: "left" },
      { field: "company" },
      { field: "lot" },
      { field: "bank" },
      { field: "amount", valueFormatter: ({ value }) => formatMoney(Number(value)) },
      { field: "items", valueFormatter: ({ value }) => formatNumber(Number(value)) },
      { field: "status", cellRenderer: (p: ICellRendererParams) => {
        const s = p.value as string;
        const tone = s === "Settled" ? "success" : s === "Failed" || s === "Returned" || s === "Cancelled" ? "danger" : s === "Reconciling" ? "warning" : "default";
        return <Badge tone={tone}>{s}</Badge>;
      }},
      { field: "createdBy", headerName: "Created By" },
      { field: "createdAt", headerName: "Created" }
    ],
    []
  );

  const itemColumns = useMemo<ColDef<PaymentItem>[]>(
    () => [
      { field: "boid", headerName: "BOID" },
      { field: "holder", headerName: "Holder" },
      { field: "amount", valueFormatter: ({ value }) => formatMoney(Number(value)) },
      { field: "bank" },
      { field: "accountNumber", headerName: "Account" },
      { field: "status", cellRenderer: (p: ICellRendererParams) => {
        const s = p.value as string;
        const tone = s === "Paid" ? "success" : s === "Failed" || s === "Returned" ? "danger" : s === "Unclaimed" ? "warning" : "default";
        return <Badge tone={tone}>{s}</Badge>;
      }},
      { field: "failureReason", headerName: "Reason" }
    ],
    []
  );

  const chartData = useMemo(() => [
    { name: "Draft", value: batches.data?.filter((b) => b.status === "Draft").length ?? 0 },
    { name: "Exported", value: batches.data?.filter((b) => b.status === "Exported").length ?? 0 },
    { name: "Reconciling", value: batches.data?.filter((b) => b.status === "Reconciling").length ?? 0 },
    { name: "Settled", value: batches.data?.filter((b) => b.status === "Settled").length ?? 0 },
    { name: "Failed", value: batches.data?.filter((b) => b.status === "Failed").length ?? 0 },
    { name: "Returned", value: batches.data?.filter((b) => b.status === "Returned").length ?? 0 },
    { name: "Cancelled", value: batches.data?.filter((b) => b.status === "Cancelled").length ?? 0 },
    { name: "Unclaimed", value: batches.data?.filter((b) => b.status === "Unclaimed").length ?? 0 }
  ], [batches.data]);

  function handleExport() {
    const data = batches.data ?? [];
    if (data.length === 0) { toast.error("No data to export"); return; }
    exportPaymentBatchesToExcel(data);
    toast.success("Payment batches exported to Excel");
  }

  function handleExportBankFile() {
    setConfirmAction("export");
    setConfirmOpen(true);
  }

  function handleCancelBatch() {
    setConfirmAction("cancel");
    setConfirmOpen(true);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Payment Dashboard</CardTitle>
            <CardDescription>Payment batches, lots, files, bank export, failed, returned, cancelled, and unclaimed payments.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleExport}><Download className="h-4 w-4" />Excel</Button>
            <Button variant="secondary" disabled><Upload className="h-4 w-4" />Import</Button>
            <Button onClick={handleExportBankFile}><Banknote className="h-4 w-4" />Export Bank File</Button>
            <Button variant="danger" onClick={handleCancelBatch}><XCircle className="h-4 w-4" />Cancel Batch</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-md border bg-background p-3">
              <span className="text-xs text-muted-foreground">Total Batches</span>
              <strong className="mt-1 block text-2xl">{batches.data?.length ?? 0}</strong>
            </div>
            <div className="rounded-md border bg-background p-3">
              <span className="text-xs text-muted-foreground">Total Amount</span>
              <strong className="mt-1 block text-2xl">{formatMoney(batches.data?.reduce((s, b) => s + b.amount, 0) ?? 0)}</strong>
            </div>
            <div className="rounded-md border bg-background p-3">
              <span className="text-xs text-muted-foreground">Total Items</span>
              <strong className="mt-1 block text-2xl">{formatNumber(batches.data?.reduce((s, b) => s + b.items, 0) ?? 0)}</strong>
            </div>
            <div className="rounded-md border bg-background p-3">
              <span className="text-xs text-muted-foreground">Settled</span>
              <strong className="mt-1 block text-2xl">{batches.data?.filter((b) => b.status === "Settled").length ?? 0}</strong>
            </div>
          </div>

          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#087f83" radius={[2, 2, 0, 0]} name="Batches" />
              </BarChart>
            </ResponsiveContainer>
          </div>

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

          <EnterpriseGrid rows={filteredBatches} columns={batchColumns} height={300} />

          {items.data && items.data.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Payment Items for {selectedBatch}</h3>
              <EnterpriseGrid rows={items.data} columns={itemColumns} height={250} />
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction === "export" ? "Export Bank File" : "Cancel Payment Batch"}
        description={confirmAction === "export" ? "This will generate the bank export file for the selected batch and mark it as Exported." : "This will cancel the selected payment batch. This action cannot be undone."}
        variant={confirmAction === "export" ? "info" : "danger"}
        confirmLabel={confirmAction === "export" ? "Export" : "Cancel Batch"}
        onConfirm={() => {
          toast.success(confirmAction === "export" ? "Bank file exported successfully" : "Payment batch cancelled");
        }}
      />
    </div>
  );
}