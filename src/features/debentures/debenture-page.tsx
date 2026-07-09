import type { ColDef, ICellRendererParams } from "@ag-grid-community/core";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  FileDown,
  PlayCircle,
  Printer,
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
import { useDebentureCalculations, useDebentureCycles } from "@/lib/queries";
import { formatMoney, formatNumber } from "@/lib/utils";
import type { CycleSummary, DebentureCalculation } from "@/types/domain";

const createCycleSchema = z.object({
  debenture: z.string().min(1, "Select a debenture"),
  couponRate: z.coerce.number().positive("Must be positive").max(30, "Max 30%"),
  dayCountMethod: z.enum(["Actual/365", "Actual/360", "30/360"]),
  interestPeriodStart: z.string().min(1, "Start date required"),
  interestPeriodEnd: z.string().min(1, "End date required"),
  recordDate: z.string().min(1, "Record date required"),
  notes: z.string().optional()
});

type CreateCycleForm = z.infer<typeof createCycleSchema>;

const categoryTabs = ["Summary", "Public", "Private Placement", "Tax Exempt"] as const;

export function DebenturePage() {
  const [activeTab, setActiveTab] = useState<string>("Summary");
  const [selectedCycle, setSelectedCycle] = useState<string>("INT-7RBB-2088");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject">("approve");

  const { data: cycles = [], isLoading: cyclesLoading } = useDebentureCycles();
  const { data: calculations = [], isLoading: calcLoading } = useDebentureCalculations(selectedCycle);

  const form = useForm<CreateCycleForm>({
    resolver: zodResolver(createCycleSchema),
    defaultValues: {
      debenture: "deb-rbb-7pct",
      couponRate: 7,
      dayCountMethod: "Actual/365",
      interestPeriodStart: "2026-01-01",
      interestPeriodEnd: "2026-06-30",
      recordDate: "2026-06-15",
      notes: ""
    }
  });

  // Filter cycles by active tab
  const filteredCycles = useMemo(() => {
    if (activeTab === "Summary") return cycles.filter((c) => c.category === "Summary");
    return cycles.filter((c) => c.category === activeTab);
  }, [cycles, activeTab]);

  // Selected cycle data
  const selectedCycleData = useMemo(() => cycles.find((c) => c.id === selectedCycle), [cycles, selectedCycle]);

  // Category totals for calculations
  const categoryTotals = useMemo(() => {
    const cats = ["Public", "Private Placement", "Tax Exempt"];
    return cats.map((cat) => {
      const calcs = calculations.filter((c) => c.category === cat);
      return {
        category: cat,
        count: calcs.length,
        faceValue: calcs.reduce((s, c) => s + c.faceValue, 0),
        gross: calcs.reduce((s, c) => s + c.grossInterest, 0),
        tds: calcs.reduce((s, c) => s + c.tdsAmount, 0),
        net: calcs.reduce((s, c) => s + c.netInterest, 0)
      };
    });
  }, [calculations]);

  // Cycle columns
  const cycleColumns = useMemo<ColDef<CycleSummary>[]>(
    () => [
      { field: "id", headerName: "Cycle ID", pinned: "left", width: 150, checkboxSelection: true, headerCheckboxSelection: true },
      { field: "company", headerName: "Debenture", minWidth: 220 },
      { field: "rate", headerName: "Coupon %", width: 100, valueFormatter: ({ value }) => `${value}%` },
      { field: "recordDate", headerName: "Record Date", width: 120 },
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
      { field: "gross", headerName: "Gross Interest", width: 130, type: "numericColumn", valueFormatter: ({ value }) => formatMoney(Number(value)), aggFunc: "sum" },
      { field: "tax", headerName: "TDS", width: 120, type: "numericColumn", valueFormatter: ({ value }) => formatMoney(Number(value)), aggFunc: "sum" },
      { field: "net", headerName: "Net Interest", width: 130, type: "numericColumn", valueFormatter: ({ value }) => formatMoney(Number(value)), aggFunc: "sum" },
      { field: "version", headerName: "Formula", width: 180 }
    ],
    []
  );

  // Calculation columns
  const calcColumns = useMemo<ColDef<DebentureCalculation>[]>(
    () => [
      { field: "boid", headerName: "BOID", pinned: "left", width: 160 },
      { field: "holder", headerName: "Holder Name", pinned: "left", minWidth: 200 },
      {
        field: "category",
        headerName: "Category",
        width: 140,
        cellRenderer: (p: ICellRendererParams) => {
          const cat = p.value as string;
          const colors: Record<string, string> = {
            Public: "bg-blue-50 text-blue-700 border-blue-200",
            "Private Placement": "bg-purple-50 text-purple-700 border-purple-200",
            "Tax Exempt": "bg-green-50 text-green-700 border-green-200"
          };
          return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${colors[cat] ?? ""}`}>{cat}</span>;
        }
      },
      { field: "faceValue", headerName: "Face Value", width: 120, type: "numericColumn", valueFormatter: ({ value }) => formatMoney(Number(value)), aggFunc: "sum" },
      { field: "couponRate", headerName: "Coupon %", width: 90, valueFormatter: ({ value }) => `${value}%` },
      { field: "dayCount", headerName: "Days", width: 70, type: "numericColumn", aggFunc: "sum" },
      {
        field: "dayCountMethod",
        headerName: "Method",
        width: 110,
        cellRenderer: (p: ICellRendererParams) => <Badge>{p.value as string}</Badge>
      },
      { field: "grossInterest", headerName: "Gross Interest", width: 130, type: "numericColumn", valueFormatter: ({ value }) => formatMoney(Number(value)), aggFunc: "sum" },
      { field: "tdsRate", headerName: "TDS %", width: 70, valueFormatter: ({ value }) => `${value}%` },
      { field: "tdsAmount", headerName: "TDS Amt", width: 120, type: "numericColumn", valueFormatter: ({ value }) => formatMoney(Number(value)), aggFunc: "sum" },
      { field: "netInterest", headerName: "Net Interest", width: 130, type: "numericColumn", valueFormatter: ({ value }) => formatMoney(Number(value)), aggFunc: "sum" },
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
    const totalFaceValue = calculations.reduce((s, c) => s + c.faceValue, 0);
    return {
      "Total Holders": formatNumber(calculations.length),
      "Total Face Value": formatMoney(totalFaceValue),
      "Total Gross": formatMoney(calculations.reduce((s, c) => s + c.grossInterest, 0)),
      "Total TDS": formatMoney(calculations.reduce((s, c) => s + c.tdsAmount, 0)),
      "Total Net": formatMoney(calculations.reduce((s, c) => s + c.netInterest, 0))
    };
  }, [calculations]);

  function handleCreateCycle(data: CreateCycleForm) {
    const days = Math.round((new Date(data.interestPeriodEnd).getTime() - new Date(data.interestPeriodStart).getTime()) / (1000 * 60 * 60 * 24));
    toast.success(`Interest cycle created. ${days} days interest period. Running calculation preview...`);
  }

  function handleApprove() {
    setConfirmAction("approve");
    setConfirmOpen(true);
  }

  function handleReject() {
    setConfirmAction("reject");
    setConfirmOpen(true);
  }

  // Calculate summary metrics from selected cycle data
  const dayCount = 181; // Default for mock (from existing data)

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="page-header">
        <div className="page-breadcrumb">Home / Debentures / Debenture Interest Management</div>
        <h1 className="page-title">Debenture Interest Management</h1>
      </div>

      {/* Create Cycle & Calculation Engine */}
      <div className="grid grid-cols-[380px_1fr] gap-4">
        {/* Create Cycle Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create Interest Cycle</CardTitle>
            <CardDescription>7% RBB Debenture 2088 - Coupon, period, record date</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={form.handleSubmit(handleCreateCycle)}>
              <label className="grid gap-1 text-sm">
                Debenture
                <select className="h-9 rounded-md border bg-background px-2 text-sm" {...form.register("debenture")}>
                  <option value="deb-rbb-7pct">7% RBB Debenture 2088</option>
                  <option value="deb-nbl-8pct">8% NBL Debenture 2089</option>
                  <option value="deb-sicl-6pct">6% SICL Debenture 2087</option>
                </select>
                {form.formState.errors.debenture && <span className="text-xs text-red-500">{form.formState.errors.debenture.message}</span>}
              </label>

              <label className="grid gap-1 text-sm">
                Coupon Rate (%)
                <input type="number" step="0.01" className="h-9 rounded-md border bg-background px-2 text-sm" {...form.register("couponRate")} />
                {form.formState.errors.couponRate && <span className="text-xs text-red-500">{form.formState.errors.couponRate.message}</span>}
              </label>

              <label className="grid gap-1 text-sm">
                Day Count Convention
                <select className="h-9 rounded-md border bg-background px-2 text-sm" {...form.register("dayCountMethod")}>
                  <option value="Actual/365">Actual/365</option>
                  <option value="Actual/360">Actual/360</option>
                  <option value="30/360">30/360</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-sm">
                  Period Start
                  <input type="date" className="h-9 rounded-md border bg-background px-2 text-sm" {...form.register("interestPeriodStart")} />
                </label>
                <label className="grid gap-1 text-sm">
                  Period End
                  <input type="date" className="h-9 rounded-md border bg-background px-2 text-sm" {...form.register("interestPeriodEnd")} />
                </label>
              </div>

              <label className="grid gap-1 text-sm">
                Record Date
                <input type="date" className="h-9 rounded-md border bg-background px-2 text-sm" {...form.register("recordDate")} />
              </label>

              <label className="grid gap-1 text-sm">
                Notes (optional)
                <textarea className="h-16 rounded-md border bg-background px-2 py-1 text-sm" {...form.register("notes")} />
              </label>

              <Button className="w-full" type="submit">
                <Calculator className="h-4 w-4" />
                Calculate Interest
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Calculation Engine */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Interest Calculation Engine</CardTitle>
                <CardDescription>{selectedCycle} · {dayCount} days · Method: Actual/365</CardDescription>
              </div>
              <Badge tone={selectedCycleData?.status === "approved" ? "success" : selectedCycleData?.status === "rejected" ? "danger" : "warning"}>
                {selectedCycleData?.status ?? "draft"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Summary Cards */}
            <div className="grid grid-cols-5 gap-3">
              <div className="stat">
                <span className="stat-label">Face Value</span>
                <strong className="stat-value text-lg">{selectedCycleData ? formatMoney(selectedCycleData.gross * 10) : "NPR 428.1M"}</strong>
              </div>
              <div className="stat">
                <span className="stat-label">Coupon Rate</span>
                <strong className="stat-value text-lg">{selectedCycleData ? `${selectedCycleData.rate}%` : "7%"}</strong>
              </div>
              <div className="stat">
                <span className="stat-label">Interest Days</span>
                <strong className="stat-value text-lg">{dayCount}</strong>
              </div>
              <div className="stat border-amber-200 bg-amber-50/50">
                <span className="stat-label text-amber-700">TDS</span>
                <strong className="stat-value text-lg text-amber-700">{selectedCycleData ? formatMoney(selectedCycleData.tax) : "NPR 0"}</strong>
              </div>
              <div className="stat border-green-200 bg-green-50/50">
                <span className="stat-label text-green-700">Net Interest</span>
                <strong className="stat-value text-lg text-green-700">{selectedCycleData ? formatMoney(selectedCycleData.net) : "NPR 0"}</strong>
              </div>
            </div>

            {/* Formula Display */}
            <div className="mt-3 rounded-md border bg-muted/40 p-3 text-xs">
              <strong className="block text-sm">Interest Calculation Formula</strong>
              <code className="mt-1 block text-muted-foreground">
                Interest = face_value × coupon_rate × day_count / day_count_method
              </code>
              <code className="mt-1 block text-muted-foreground">
                Gross = face_value × 0.07 × {dayCount} / 365 | TDS = gross × tds_rate(category) | Net = gross - tds
              </code>
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
            <div className="mt-3 grid grid-cols-3 gap-2">
              {categoryTotals.map((ct) => (
                <div key={ct.category} className="rounded-md border bg-background p-2 text-xs">
                  <strong className="block">{ct.category}</strong>
                  <span className="text-muted-foreground">
                    {formatNumber(ct.count)} holders · Face Value {formatMoney(ct.faceValue)} · Net {formatMoney(ct.net)}
                  </span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" className="h-8 text-xs" disabled>
                <AlertTriangle className="h-3.5 w-3.5" />
                Validate
              </Button>
              <Button variant="secondary" className="h-8 text-xs" onClick={() => { exportDividendCyclesToExcel(cycles); toast.success("Exported"); }}>
                <FileDown className="h-3.5 w-3.5" />
                Export
              </Button>
              <Button variant="secondary" className="h-8 text-xs" onClick={() => printPage("Debenture Interest Calculation")}>
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
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs + Cycles Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <CardTitle className="text-base">Interest Cycles</CardTitle>
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
            emptyTitle="No interest cycles found"
            emptyDescription="Create a new interest cycle to calculate debenture interest."
          />

          {/* Holder-Level Calculations */}
          {calculations.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">
                Holder-Level Calculations: {selectedCycle}
                <span className="ml-2 text-xs font-normal text-muted-foreground">{calculations.length} holders</span>
              </h3>
              <EnterpriseGrid<DebentureCalculation>
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
        title="Approve Interest Cycle"
        description={`This will approve ${selectedCycle} with net interest of ${formatMoney(selectedCycleData?.net ?? 0)}. A payment batch will be generated.`}
        variant="info"
        confirmLabel="Approve & Generate Payment Batch"
        onConfirm={() => {
          toast.success(`Interest cycle ${selectedCycle} approved. Payment batch generated.`);
          setConfirmOpen(false);
        }}
      />
      <ConfirmDialog
        open={confirmOpen && confirmAction === "reject"}
        onOpenChange={(open) => setConfirmOpen(open)}
        title="Reject Interest Cycle"
        description={`This will reject ${selectedCycle}. The calculation will be returned to Maker for revision.`}
        variant="warning"
        confirmLabel="Reject Cycle"
        onConfirm={() => {
          toast.warning(`Interest cycle ${selectedCycle} rejected and returned to Maker`);
          setConfirmOpen(false);
        }}
      />
    </div>
  );
}