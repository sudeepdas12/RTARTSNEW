import type { ColDef, ICellRendererParams } from "@ag-grid-community/core";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileDown,
  PlayCircle,
  Printer,
  RotateCcw,
  XCircle
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { EnterpriseGrid } from "@/components/data-grid/enterprise-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/toast-provider";
import { exportDividendCyclesToExcel, printPage } from "@/lib/export-utils";
import { useDividendCalculations, useDividendCycles } from "@/lib/queries";
import { formatMoney, formatNumber } from "@/lib/utils";
import type { CycleSummary, DividendCalculation } from "@/types/domain";

const createCycleSchema = z.object({
  company: z.string().min(1, "Select a company"),
  fiscalYear: z.string().min(4, "Fiscal year required"),
  recordDate: z.string().min(1, "Record date required"),
  bookClose: z.string().min(1, "Book close required"),
  dividendRate: z.coerce.number().positive("Must be positive").max(100, "Max 100%"),
  holderCutoff: z.string().optional(),
  notes: z.string().optional()
});

type CreateCycleForm = z.infer<typeof createCycleSchema>;

const categoryTabs = ["Summary", "Original", "Public", "Institution", "Tax Exempt"] as const;

export function DividendPage() {
  const [activeTab, setActiveTab] = useState<string>("Summary");
  const [selectedCycle, setSelectedCycle] = useState<string>("DIV-2082-83");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | "calculate">("approve");

  const { data: cycles = [], isLoading: cyclesLoading } = useDividendCycles();
  const { data: calculations = [], isLoading: calcLoading } = useDividendCalculations(selectedCycle);

  const form = useForm<CreateCycleForm>({
    resolver: zodResolver(createCycleSchema),
    defaultValues: {
      company: "cmp-nhpl",
      fiscalYear: "2082/83",
      recordDate: "2026-07-31",
      bookClose: "2026-07-25",
      dividendRate: 12.5,
      notes: ""
    }
  });

  // Filter cycles by active tab
  const filteredCycles = useMemo(() => {
    if (activeTab === "Summary") return cycles.filter((c) => c.category === "Summary");
    return cycles.filter((c) => c.category === activeTab);
  }, [cycles, activeTab]);

  // Cycle summary for the selected cycle
  const selectedCycleData = useMemo(() => cycles.find((c) => c.id === selectedCycle), [cycles, selectedCycle]);

  // Category totals
  const categoryTotals = useMemo(() => {
    const cats = ["Original", "Public", "Institution", "Tax Exempt"];
    return cats.map((cat) => {
      const calcs = calculations.filter((c) => c.category === cat);
      return {
        category: cat,
        count: calcs.length,
        gross: calcs.reduce((s, c) => s + c.grossDividend, 0),
        tds: calcs.reduce((s, c) => s + c.tdsAmount, 0),
        net: calcs.reduce((s, c) => s + c.netDividend, 0)
      };
    });
  }, [calculations]);

  // Cycle columns
  const cycleColumns = useMemo<ColDef<CycleSummary>[]>(
    () => [
      { field: "id", headerName: "Cycle ID", pinned: "left", width: 140, checkboxSelection: true, headerCheckboxSelection: true },
      { field: "company", headerName: "Company", minWidth: 200 },
      { field: "fiscalYear", headerName: "Fiscal Year", width: 110 },
      { field: "recordDate", headerName: "Record Date", width: 120 },
      { field: "rate", headerName: "Rate %", width: 90, valueFormatter: ({ value }) => `${value}%` },
      {
        field: "status",
        headerName: "Status",
        width: 110,
        cellRenderer: (p: ICellRendererParams) => {
          const v = p.value as string;
          return <Badge tone={v === "approved" ? "success" : v === "rejected" ? "danger" : v === "pending" ? "warning" : "default"}>{v}</Badge>;
        }
      },
      { field: "progress", headerName: "Progress", width: 100, cellRenderer: (p: ICellRendererParams) => <Progress value={Number(p.value)} className="h-2" /> },
      { field: "gross", headerName: "Gross", width: 130, type: "numericColumn", valueFormatter: ({ value }) => formatMoney(Number(value)), aggFunc: "sum" },
      { field: "tax", headerName: "TDS", width: 120, type: "numericColumn", valueFormatter: ({ value }) => formatMoney(Number(value)), aggFunc: "sum" },
      { field: "net", headerName: "Net Payable", width: 130, type: "numericColumn", valueFormatter: ({ value }) => formatMoney(Number(value)), aggFunc: "sum" },
      { field: "version", headerName: "Formula", width: 180 },
      { field: "createdBy", headerName: "Created By", width: 110 },
      { field: "approvedBy", headerName: "Approved By", width: 110 }
    ],
    []
  );

  // Calculation columns
  const calcColumns = useMemo<ColDef<DividendCalculation>[]>(
    () => [
      { field: "boid", headerName: "BOID", pinned: "left", width: 160 },
      { field: "holder", headerName: "Holder Name", pinned: "left", minWidth: 200 },
      {
        field: "category",
        headerName: "Category",
        width: 120,
        cellRenderer: (p: ICellRendererParams) => {
          const cat = p.value as string;
          const colors: Record<string, string> = {
            Public: "bg-blue-50 text-blue-700 border-blue-200",
            Institution: "bg-purple-50 text-purple-700 border-purple-200",
            "Tax Exempt": "bg-green-50 text-green-700 border-green-200"
          };
          return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${colors[cat] ?? ""}`}>{cat}</span>;
        }
      },
      { field: "units", headerName: "Units", width: 100, type: "numericColumn", valueFormatter: ({ value }) => formatNumber(Number(value)), aggFunc: "sum" },
      { field: "faceValue", headerName: "Face Value", width: 110, type: "numericColumn", valueFormatter: ({ value }) => formatMoney(Number(value)) },
      { field: "dividendRate", headerName: "Rate %", width: 80, valueFormatter: ({ value }) => `${value}%` },
      { field: "grossDividend", headerName: "Gross", width: 120, type: "numericColumn", valueFormatter: ({ value }) => formatMoney(Number(value)), aggFunc: "sum" },
      { field: "tdsRate", headerName: "TDS %", width: 70, valueFormatter: ({ value }) => `${value}%` },
      { field: "tdsAmount", headerName: "TDS Amount", width: 120, type: "numericColumn", valueFormatter: ({ value }) => formatMoney(Number(value)), aggFunc: "sum" },
      { field: "netDividend", headerName: "Net", width: 120, type: "numericColumn", valueFormatter: ({ value }) => formatMoney(Number(value)), aggFunc: "sum" },
      { field: "bank", headerName: "Bank", width: 110 },
      { field: "accountNumber", headerName: "Account", width: 120 },
      {
        field: "status",
        headerName: "Calc Status",
        width: 110,
        cellRenderer: (p: ICellRendererParams) => {
          const v = p.value as string;
          return <Badge tone={v === "Validated" ? "success" : v === "Error" ? "danger" : "default"}>{v}</Badge>;
        }
      }
    ],
    []
  );

  // Footer for calc grid
  const calcFooter = useMemo(() => {
    if (!calculations.length) return undefined;
    return {
      "Total Holders": formatNumber(calculations.length),
      "Total Gross": formatMoney(calculations.reduce((s, c) => s + c.grossDividend, 0)),
      "Total TDS": formatMoney(calculations.reduce((s, c) => s + c.tdsAmount, 0)),
      "Total Net": formatMoney(calculations.reduce((s, c) => s + c.netDividend, 0))
    };
  }, [calculations]);

  function handleCreateCycle(data: CreateCycleForm) {
    toast.success(`Dividend cycle created for ${data.company}. Running calculation preview...`);
  }

  function handleApprove() {
    setConfirmAction("approve");
    setConfirmOpen(true);
  }

  function handleReject() {
    setConfirmAction("reject");
    setConfirmOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="page-header">
        <div className="page-breadcrumb">Home / Dividends / Dividend Management</div>
        <h1 className="page-title">Dividend Management</h1>
      </div>

      {/* Create Cycle & Calculation Engine */}
      <div className="grid grid-cols-[380px_1fr] gap-4">
        {/* Create Cycle Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create Dividend Cycle</CardTitle>
            <CardDescription>Company, record date, book close, rate</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={form.handleSubmit(handleCreateCycle)}>
              <label className="grid gap-1 text-sm">
                Company
                <select className="h-9 rounded-md border bg-background px-2 text-sm" {...form.register("company")}>
                  <option value="cmp-nhpl">Nepal Hydro Power Ltd.</option>
                  <option value="cmp-rbbmb">RBB Merchant Banking Ltd.</option>
                  <option value="cmp-sicl">Sagarmatha Insurance Co.</option>
                </select>
                {form.formState.errors.company && <span className="text-xs text-red-500">{form.formState.errors.company.message}</span>}
              </label>
              <label className="grid gap-1 text-sm">
                Fiscal Year
                <input className="h-9 rounded-md border bg-background px-2 text-sm" {...form.register("fiscalYear")} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-sm">
                  Record Date
                  <input type="date" className="h-9 rounded-md border bg-background px-2 text-sm" {...form.register("recordDate")} />
                </label>
                <label className="grid gap-1 text-sm">
                  Book Close
                  <input type="date" className="h-9 rounded-md border bg-background px-2 text-sm" {...form.register("bookClose")} />
                </label>
              </div>
              <label className="grid gap-1 text-sm">
                Dividend Rate (%)
                <input type="number" step="0.01" className="h-9 rounded-md border bg-background px-2 text-sm" {...form.register("dividendRate")} />
                {form.formState.errors.dividendRate && <span className="text-xs text-red-500">{form.formState.errors.dividendRate.message}</span>}
              </label>
              <label className="grid gap-1 text-sm">
                Notes (optional)
                <textarea className="h-16 rounded-md border bg-background px-2 py-1 text-sm" {...form.register("notes")} />
              </label>
              <Button className="w-full" type="submit">
                <PlayCircle className="h-4 w-4" />
                Run Calculation Preview
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Calculation Engine */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Calculation Engine</CardTitle>
                <CardDescription>{selectedCycle} · Formula v{selectedCycleData?.version ?? "3.2"}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={selectedCycleData?.status === "approved" ? "success" : selectedCycleData?.status === "rejected" ? "danger" : "warning"}>
                  {selectedCycleData?.status ?? "draft"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Summary Cards */}
            <div className="grid grid-cols-5 gap-3">
              <div className="stat">
                <span className="stat-label">Gross Dividend</span>
                <strong className="stat-value text-lg">{selectedCycleData ? formatMoney(selectedCycleData.gross) : "NPR 0"}</strong>
              </div>
              <div className="stat border-amber-200 bg-amber-50/50">
                <span className="stat-label text-amber-700">TDS</span>
                <strong className="stat-value text-lg text-amber-700">{selectedCycleData ? formatMoney(selectedCycleData.tax) : "NPR 0"}</strong>
              </div>
              <div className="stat border-green-200 bg-green-50/50">
                <span className="stat-label text-green-700">Net Payable</span>
                <strong className="stat-value text-lg text-green-700">{selectedCycleData ? formatMoney(selectedCycleData.net) : "NPR 0"}</strong>
              </div>
              <div className="stat border-orange-200 bg-orange-50/50">
                <span className="stat-label text-orange-700">Warnings</span>
                <strong className="stat-value text-lg text-orange-700">{selectedCycleData?.warnings ?? 0}</strong>
              </div>
              <div className="stat border-red-200 bg-red-50/50">
                <span className="stat-label text-red-700">Errors</span>
                <strong className="stat-value text-lg text-red-700">{selectedCycleData?.validationErrors ?? 0}</strong>
              </div>
            </div>

            {/* Progress Bar */}
            {selectedCycleData && selectedCycleData.status !== "approved" && (
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Calculation Progress</span>
                  <span>{selectedCycleData.progress}%</span>
                </div>
                <Progress value={selectedCycleData.progress} className="h-2" />
              </div>
            )}

            {/* Category Totals */}
            <div className="mt-3 grid grid-cols-4 gap-2">
              {categoryTotals.map((ct) => (
                <div key={ct.category} className="rounded-md border bg-background p-2 text-xs">
                  <strong className="block">{ct.category}</strong>
                  <span className="text-muted-foreground">{formatNumber(ct.count)} holders · Gross {formatMoney(ct.gross)} · Net {formatMoney(ct.net)}</span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" className="h-8 text-xs" disabled>
                <AlertTriangle className="h-3.5 w-3.5" />
                Validate ({selectedCycleData?.validationErrors ?? 0})
              </Button>
              <Button variant="secondary" className="h-8 text-xs" onClick={() => { exportDividendCyclesToExcel(cycles); toast.success("Exported"); }}>
                <FileDown className="h-3.5 w-3.5" />
                Export
              </Button>
              <Button variant="secondary" className="h-8 text-xs" onClick={() => printPage("Dividend Calculation")}>
                <Printer className="h-3.5 w-3.5" />
                Print
              </Button>
              {selectedCycleData?.status !== "approved" && (
                <>
                  <Button className="h-8 text-xs" onClick={handleApprove}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button variant="danger" className="h-8 text-xs" onClick={handleReject}>
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                </>
              )}
            </div>

            {/* Formula Display */}
            <div className="mt-3 rounded-md border bg-muted/40 p-3 text-xs">
              <strong className="block text-sm">Dividend Calculation Formula</strong>
              <code className="mt-1 block text-muted-foreground">
                Gross = eligible_units × dividend_rate | Tax = gross × tds_rate(category) | Net = gross - tax
              </code>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs + Cycles Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <CardTitle className="text-base">Dividend Cycles</CardTitle>
            <div className="filter-tabs">
              {categoryTabs.map((tab) => (
                <button
                  key={tab}
                  className={`filter-tab ${activeTab === tab ? "filter-tab-active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <CardDescription>
            {categoryTotals.reduce((s, ct) => s + ct.count, 0)} holders across {filteredCycles.length} cycles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <EnterpriseGrid<CycleSummary>
            rows={filteredCycles}
            columns={cycleColumns}
            height={220}
            loading={cyclesLoading}
            onRowDoubleClicked={(row) => setSelectedCycle(row.id)}
            getRowId={(params) => params.data.id}
            emptyTitle="No dividend cycles found"
            emptyDescription="Create a new dividend cycle to get started."
          />

          {/* Holder-Level Calculations */}
          {calculations.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">
                Holder-Level Calculations: {selectedCycle}
                <span className="ml-2 text-xs font-normal text-muted-foreground">{calculations.length} holders</span>
              </h3>
              <EnterpriseGrid<DividendCalculation>
                rows={calculations}
                columns={calcColumns}
                height={360}
                loading={calcLoading}
                showFooter
                footerRow={calcFooter}
                getRowId={(params) => params.data.id}
                emptyTitle="No calculations found for this cycle"
                emptyDescription="Run the calculation engine to generate holder-level results."
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={confirmOpen && confirmAction === "approve"}
        onOpenChange={(open) => setConfirmOpen(open)}
        title="Approve Dividend Cycle"
        description={`This will approve ${selectedCycle} with a net payable of ${formatMoney(selectedCycleData?.net ?? 0)}. A payment batch will be generated upon approval.`}
        variant="info"
        confirmLabel="Approve & Generate Payment Batch"
        onConfirm={() => {
          toast.success(`Dividend cycle ${selectedCycle} approved. Payment batch generated.`);
          setConfirmOpen(false);
        }}
      />
      <ConfirmDialog
        open={confirmOpen && confirmAction === "reject"}
        onOpenChange={(open) => setConfirmOpen(open)}
        title="Reject Dividend Cycle"
        description={`This will reject ${selectedCycle}. The calculation will be returned to Maker for revision.`}
        variant="warning"
        confirmLabel="Reject Cycle"
        onConfirm={() => {
          toast.warning(`Dividend cycle ${selectedCycle} rejected and returned to Maker`);
          setConfirmOpen(false);
        }}
      />
    </div>
  );
}