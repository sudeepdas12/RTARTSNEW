import type { ColDef, ICellRendererParams } from "@ag-grid-community/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Calculator, CheckCircle2, Download, FileDown, PlayCircle, Printer, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { EnterpriseGrid } from "@/components/data-grid/enterprise-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast-provider";
import { exportDividendCyclesToExcel, printPage } from "@/lib/export-utils";
import { useDividendCalculations, useDividendCycles } from "@/lib/queries";
import { formatMoney } from "@/lib/utils";
import type { CycleSummary, DividendCalculation } from "@/types/domain";

const schema = z.object({
  fiscalYear: z.string().min(4),
  recordDate: z.string().min(1),
  bookClose: z.string().min(1),
  dividendRate: z.coerce.number().positive().max(100)
});

type DividendForm = z.infer<typeof schema>;

const categoryTabs = ["Summary", "Original", "Public", "Institution", "Tax Exempt"] as const;

export function DividendPage() {
  const cycles = useDividendCycles();
  const [selectedCycle, setSelectedCycle] = useState<string>("DIV-2082-83");
  const calculations = useDividendCalculations(selectedCycle);
  const [activeTab, setActiveTab] = useState<string>("Summary");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const form = useForm<DividendForm>({
    resolver: zodResolver(schema),
    defaultValues: { fiscalYear: "2082/83", recordDate: "2026-07-31", bookClose: "2026-07-25", dividendRate: 12.5 }
  });

  const filteredCycles = useMemo(() => {
    const all = cycles.data ?? [];
    if (activeTab === "Summary") return all.filter((c) => c.category === "Summary");
    return all.filter((c) => c.category === activeTab);
  }, [cycles.data, activeTab]);

  const cycleColumns = useMemo<ColDef<CycleSummary>[]>(
    () => [
      { field: "id", headerName: "Cycle", pinned: "left" },
      { field: "company" },
      { field: "fiscalYear" },
      { field: "recordDate" },
      { field: "rate", headerName: "Dividend Rate %" },
      { field: "status", cellRenderer: (p: ICellRendererParams) => <Badge tone={p.value === "approved" ? "success" : p.value === "pending" ? "warning" : "default"}>{p.value}</Badge> },
      { field: "progress", headerName: "Progress %" },
      { field: "gross", valueFormatter: ({ value }) => formatMoney(Number(value)) },
      { field: "tax", valueFormatter: ({ value }) => formatMoney(Number(value)) },
      { field: "net", valueFormatter: ({ value }) => formatMoney(Number(value)) },
      { field: "version", headerName: "Calculation Version" }
    ],
    []
  );

  const calcColumns = useMemo<ColDef<DividendCalculation>[]>(
    () => [
      { field: "boid", headerName: "BOID", pinned: "left" },
      { field: "holder", headerName: "Holder" },
      { field: "category" },
      { field: "units", valueFormatter: ({ value }) => Number(value).toLocaleString() },
      { field: "faceValue", headerName: "Face Value" },
      { field: "dividendRate", headerName: "Rate %" },
      { field: "grossDividend", headerName: "Gross", valueFormatter: ({ value }) => formatMoney(Number(value)) },
      { field: "tdsRate", headerName: "TDS %" },
      { field: "tdsAmount", headerName: "TDS", valueFormatter: ({ value }) => formatMoney(Number(value)) },
      { field: "netDividend", headerName: "Net", valueFormatter: ({ value }) => formatMoney(Number(value)) },
      { field: "status", cellRenderer: (p: ICellRendererParams) => <Badge tone={p.value === "Validated" ? "success" : p.value === "Error" ? "danger" : "default"}>{p.value}</Badge> }
    ],
    []
  );

  function handleCreateCycle() {
    toast.success("Dividend cycle created. Calculation preview running...");
  }

  function handleApprove() {
    setConfirmOpen(true);
  }

  function handleExport() {
    const data = cycles.data ?? [];
    if (data.length === 0) { toast.error("No data to export"); return; }
    exportDividendCyclesToExcel(data);
    toast.success("Dividend cycles exported to Excel");
  }

  const summary = cycles.data?.find((c) => c.id === "DIV-2082-83");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[360px_1fr] gap-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Create Dividend Cycle</CardTitle>
              <CardDescription>Record date, book close, dividend rate, validation, and maker-checker route.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={form.handleSubmit(handleCreateCycle)}>
              <label className="grid gap-1 text-sm">Fiscal Year<input className="h-9 rounded-md border bg-background px-2" {...form.register("fiscalYear")} /></label>
              <label className="grid gap-1 text-sm">Record Date<input type="date" className="h-9 rounded-md border bg-background px-2" {...form.register("recordDate")} /></label>
              <label className="grid gap-1 text-sm">Book Close<input type="date" className="h-9 rounded-md border bg-background px-2" {...form.register("bookClose")} /></label>
              <label className="grid gap-1 text-sm">Dividend Rate %<input type="number" step="0.01" className="h-9 rounded-md border bg-background px-2" {...form.register("dividendRate")} /></label>
              <Button className="w-full" type="submit"><PlayCircle className="h-4 w-4" />Run Calculation Preview</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Calculation Engine</CardTitle>
              <CardDescription>Snapshot details, calculation logs, warnings, approval history, payment batch, bank export, and reconciliation summary.</CardDescription>
            </div>
            <Badge tone="warning">Pending Checker</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-3">
              <Summary label="Gross Dividend" value={summary ? formatMoney(summary.gross) : "NPR 0"} />
              <Summary label="TDS" value={summary ? formatMoney(summary.tax) : "NPR 0"} />
              <Summary label="Net Payable" value={summary ? formatMoney(summary.net) : "NPR 0"} />
              <Summary label="Warnings" value={String(summary?.warnings ?? 0)} />
              <Summary label="Validation Errors" value={String(summary?.validationErrors ?? 0)} />
            </div>
            <div className="mt-4 rounded-md border bg-muted/40 p-3 text-sm">
              <div className="mb-2 flex items-center gap-2 font-semibold"><Calculator className="h-4 w-4" />Formula v{summary?.version ?? "3.2"}</div>
              Gross = eligible units × rate; Tax = category TDS rule; Net = gross - tax; ledger postings must balance to zero variance.
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary"><AlertTriangle className="h-4 w-4" />Validation Errors</Button>
              <Button variant="secondary" onClick={handleExport}><FileDown className="h-4 w-4" />Export</Button>
              <Button variant="secondary" onClick={() => printPage("Dividend Calculation")}><Printer className="h-4 w-4" />Print</Button>
              <Button onClick={handleApprove}><CheckCircle2 className="h-4 w-4" />Approve Cycle</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <CardTitle>Dividend Cycles</CardTitle>
            <div className="flex gap-1 rounded-md border p-0.5">
              {categoryTabs.map((tab) => (
                <button
                  key={tab}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${activeTab === tab ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <CardDescription>Original, Public, Institution, Tax Exempt, and Summary sheets replaced with one governed workflow.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <EnterpriseGrid rows={filteredCycles} columns={cycleColumns} height={280} />
          {calculations.data && calculations.data.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Holder-Level Calculations for {selectedCycle}</h3>
              <EnterpriseGrid rows={calculations.data} columns={calcColumns} height={300} />
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Approve Dividend Cycle"
        description="This will approve the dividend calculation and move it to the payment batch stage. This action cannot be undone."
        variant="info"
        confirmLabel="Approve Cycle"
        onConfirm={() => {
          toast.success("Dividend cycle DIV-2082-83 approved");
        }}
      />
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <strong className="mt-1 block text-xl">{value}</strong>
    </div>
  );
}