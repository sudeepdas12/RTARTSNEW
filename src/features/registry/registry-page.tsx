import type { ColDef, ICellRendererParams } from "@ag-grid-community/core";
import {
  Ban,
  Download,
  FileText,
  History,
  Lock,
  Printer,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Unlock,
  Upload,
  UserCheck,
  UserX,
  X
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { EnterpriseGrid } from "@/components/data-grid/enterprise-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ContextMenu } from "@/components/ui/context-menu";
import { toast } from "@/components/ui/toast-provider";
import { exportHoldersToExcel, printPage } from "@/lib/export-utils";
import { useHolders } from "@/lib/queries";
import { formatMoney, formatNumber } from "@/lib/utils";
import type { HolderRecord } from "@/types/domain";

type FilterState = {
  search: string;
  category: string;
  status: string;
  kycStatus: string;
  freezeStatus: string;
  bank: string;
  pan: string;
  citizenship: string;
  company: string;
};

const defaultFilters: FilterState = {
  search: "",
  category: "all",
  status: "all",
  kycStatus: "all",
  freezeStatus: "all",
  bank: "",
  pan: "",
  citizenship: "",
  company: "all"
};

export function RegistryPage() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedRows, setSelectedRows] = useState<HolderRecord[]>([]);
  const [selectedHolder, setSelectedHolder] = useState<HolderRecord | null>(null);
  const [detailTab, setDetailTab] = useState("overview");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"freeze" | "unfreeze" | "merge" | "transfer">("freeze");
  const [contextHolder, setContextHolder] = useState<HolderRecord | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.category !== "all") params.set("category", filters.category);
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.kycStatus !== "all") params.set("kycStatus", filters.kycStatus);
    if (filters.freezeStatus !== "all") params.set("freezeStatus", filters.freezeStatus);
    if (filters.bank) params.set("bank", filters.bank);
    if (filters.pan) params.set("pan", filters.pan);
    if (filters.citizenship) params.set("citizenship", filters.citizenship);
    if (filters.company !== "all") params.set("company", filters.company);
    return params;
  }, [filters]);

  const { data: holdersData, isLoading } = useHolders(query);
  const holders = holdersData?.data ?? [];

  // Summary calculations
  const summary = useMemo(() => {
    const total = holders.length;
    const active = holders.filter((h) => h.status === "Ready").length;
    const frozen = holders.filter((h) => h.freezeStatus !== "None").length;
    const pendingKyc = holders.filter((h) => h.kycStatus !== "Verified").length;
    const unclaimed = holders.filter((h) => h.status === "Payment Failed").length;
    const totalUnits = holders.reduce((s, h) => s + h.units, 0);
    const totalNet = holders.reduce((s, h) => s + h.netAmount, 0);
    return { total, active, frozen, pendingKyc, unclaimed, totalUnits, totalNet };
  }, [holders]);

  // Footer totals
  const footerRow = useMemo(() => ({
    "Total Holders": formatNumber(summary.total),
    "Total Units": formatNumber(summary.totalUnits),
    "Total Net Payable": formatMoney(summary.totalNet)
  }), [summary]);

  const columns = useMemo<ColDef<HolderRecord>[]>(
    () => [
      {
        field: "boid",
        headerName: "BOID",
        pinned: "left",
        minWidth: 170,
        checkboxSelection: true,
        headerCheckboxSelection: true,
        headerCheckboxSelectionFilteredOnly: true
      },
      { field: "holder", headerName: "Holder Name", pinned: "left", minWidth: 200 },
      {
        field: "category",
        headerName: "Category",
        width: 120,
        cellRenderer: (params: ICellRendererParams) => {
          const cat = params.value as string;
          const colors: Record<string, string> = {
            Public: "bg-blue-50 text-blue-700 border-blue-200",
            Institution: "bg-purple-50 text-purple-700 border-purple-200",
            "Tax Exempt": "bg-green-50 text-green-700 border-green-200",
            "Private Placement": "bg-amber-50 text-amber-700 border-amber-200",
            Promoter: "bg-rose-50 text-rose-700 border-rose-200"
          };
          return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${colors[cat] ?? ""}`}>{cat}</span>;
        }
      },
      { field: "pan", headerName: "PAN", width: 110 },
      { field: "citizenship", headerName: "Citizenship", width: 130 },
      {
        field: "units",
        headerName: "Units",
        width: 110,
        type: "numericColumn",
        valueFormatter: ({ value }) => formatNumber(Number(value)),
        aggFunc: "sum"
      },
      {
        field: "faceValue",
        headerName: "Face Value",
        width: 120,
        type: "numericColumn",
        valueFormatter: ({ value }) => formatMoney(Number(value)),
        aggFunc: "sum"
      },
      {
        field: "dividend",
        headerName: "Dividend",
        width: 120,
        type: "numericColumn",
        valueFormatter: ({ value }) => formatMoney(Number(value)),
        aggFunc: "sum"
      },
      {
        field: "interest",
        headerName: "Interest",
        width: 120,
        type: "numericColumn",
        valueFormatter: ({ value }) => formatMoney(Number(value)),
        aggFunc: "sum"
      },
      {
        field: "tax",
        headerName: "TDS",
        width: 110,
        type: "numericColumn",
        valueFormatter: ({ value }) => formatMoney(Number(value)),
        aggFunc: "sum"
      },
      {
        field: "netAmount",
        headerName: "Net Payable",
        width: 130,
        type: "numericColumn",
        valueFormatter: ({ value }) => formatMoney(Number(value)),
        aggFunc: "sum"
      },
      { field: "bank", headerName: "Bank", width: 120 },
      {
        field: "kycStatus",
        headerName: "KYC",
        width: 90,
        cellRenderer: (params: ICellRendererParams) => {
          const status = params.value as string;
          if (status === "Verified") return <UserCheck className="h-4 w-4 text-green-600" aria-label="Verified" />;
          if (status === "Pending") return <ShieldAlert className="h-4 w-4 text-amber-600" aria-label="Pending" />;
          return <UserX className="h-4 w-4 text-red-600" aria-label="Expired" />;
        }
      },
      {
        field: "freezeStatus",
        headerName: "Freeze",
        width: 90,
        cellRenderer: (params: ICellRendererParams) => {
          const status = params.value as string;
          if (status === "Frozen") return <Lock className="h-4 w-4 text-red-600" aria-label="Frozen" />;
          if (status === "Locked") return <Ban className="h-4 w-4 text-amber-600" aria-label="Locked" />;
          return <Unlock className="h-4 w-4 text-green-600" aria-label="None" />;
        }
      },
      {
        field: "status",
        headerName: "Status",
        width: 120,
        cellRenderer: (params: ICellRendererParams) => {
          const s = params.value as string;
          const tone = s === "Ready" ? "success" : s === "Pending KYC" ? "warning" : s === "Frozen" ? "danger" : "default";
          return <Badge tone={tone}>{s}</Badge>;
        }
      },
      { field: "remarks", headerName: "Remarks", minWidth: 200, flex: 1 }
    ],
    []
  );

  const handleExportExcel = useCallback(() => {
    if (holders.length === 0) { toast.error("No data to export"); return; }
    exportHoldersToExcel(holders);
    toast.success(`Exported ${holders.length} holders to Excel`);
  }, [holders]);

  const handlePrint = useCallback(() => {
    printPage("Holder Register");
    toast.success("Print dialog opened");
  }, []);

  const handleBulkAction = useCallback((action: "freeze" | "unfreeze" | "merge" | "transfer") => {
    if (selectedRows.length === 0) { toast.error("Select holders first"); return; }
    setConfirmAction(action);
    setConfirmOpen(true);
  }, [selectedRows]);

  const handleRowDoubleClick = useCallback((row: HolderRecord) => {
    setSelectedHolder(row);
    setDetailTab("overview");
  }, []);

  const handleContextMenu = useCallback((row: HolderRecord, event: MouseEvent) => {
    event.preventDefault();
    setContextHolder(row);
  }, []);

  const updateFilter = useCallback((key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
    toast.success("Filters cleared");
  }, []);

  const contextMenuItems = useMemo(() => [
    { label: "View Details", onClick: () => { setSelectedHolder(contextHolder); setDetailTab("overview"); }, icon: <Search className="h-4 w-4" /> },
    { label: "Edit Holder", onClick: () => toast.info("Edit holder form"), icon: <FileText className="h-4 w-4" /> },
    { separator: true, label: "", onClick: () => {} },
    { label: "Freeze Holder", onClick: () => { setSelectedRows([contextHolder!]); setConfirmAction("freeze"); setConfirmOpen(true); }, icon: <Lock className="h-4 w-4" /> },
    { label: "Unfreeze Holder", onClick: () => { setSelectedRows([contextHolder!]); setConfirmAction("unfreeze"); setConfirmOpen(true); }, icon: <Unlock className="h-4 w-4" /> },
    { separator: true, label: "", onClick: () => {} },
    { label: "View Audit History", onClick: () => { setSelectedHolder(contextHolder); setDetailTab("audit"); }, icon: <History className="h-4 w-4" /> },
    { label: "Export Selected", onClick: () => { if (contextHolder) exportHoldersToExcel([contextHolder]); toast.success("Exported"); }, icon: <Download className="h-4 w-4" /> }
  ], [contextHolder]);

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="page-header">
        <div className="page-breadcrumb">Home / Registry / Holder Management</div>
        <h1 className="page-title">Holder Management</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-3">
        <div className="stat">
          <span className="stat-label">Total Holders</span>
          <strong className="stat-value">{formatNumber(summary.total)}</strong>
        </div>
        <div className="stat border-green-200 bg-green-50/50">
          <span className="stat-label text-green-700">Active</span>
          <strong className="stat-value text-green-700">{formatNumber(summary.active)}</strong>
        </div>
        <div className="stat border-amber-200 bg-amber-50/50">
          <span className="stat-label text-amber-700">Pending KYC</span>
          <strong className="stat-value text-amber-700">{formatNumber(summary.pendingKyc)}</strong>
        </div>
        <div className="stat border-red-200 bg-red-50/50">
          <span className="stat-label text-red-700">Frozen</span>
          <strong className="stat-value text-red-700">{formatNumber(summary.frozen)}</strong>
        </div>
        <div className="stat border-rose-200 bg-rose-50/50">
          <span className="stat-label text-rose-700">Unclaimed</span>
          <strong className="stat-value text-rose-700">{formatNumber(summary.unclaimed)}</strong>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: selectedHolder ? "1fr 380px" : "1fr" }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Holder Register</CardTitle>
                <CardDescription>
                  {summary.total} holders · {formatNumber(summary.totalUnits)} units · {formatMoney(summary.totalNet)} net payable
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" className="h-8 text-xs" onClick={() => setShowAdvanced(!showAdvanced)}>
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filters
                </Button>
                <Button variant="secondary" className="h-8 text-xs" disabled>
                  <Save className="h-3.5 w-3.5" />
                  Saved Views
                </Button>
                <Button variant="secondary" className="h-8 text-xs" onClick={handleExportExcel}>
                  <Download className="h-3.5 w-3.5" />
                  Excel
                </Button>
                <Button variant="secondary" className="h-8 text-xs" disabled>
                  <Upload className="h-3.5 w-3.5" />
                  Import
                </Button>
                <Button variant="secondary" className="h-8 text-xs" onClick={handlePrint}>
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </Button>
                <Button
                  variant="danger"
                  className="h-8 text-xs"
                  onClick={() => handleBulkAction("freeze")}
                  disabled={selectedRows.length === 0}
                >
                  <Lock className="h-3.5 w-3.5" />
                  Freeze ({selectedRows.length})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Quick Search & Basic Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-72 flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="h-9 w-full rounded-md border bg-background pl-8 pr-8 text-sm"
                  placeholder="Search by BOID, holder name, PAN, citizenship..."
                  value={filters.search}
                  onChange={(e) => updateFilter("search", e.target.value)}
                />
                {filters.search && (
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => updateFilter("search", "")}>
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <select className="h-9 rounded-md border bg-background px-2 text-sm" value={filters.category} onChange={(e) => updateFilter("category", e.target.value)}>
                <option value="all">All Categories</option>
                <option value="Public">Public</option>
                <option value="Institution">Institution</option>
                <option value="Tax Exempt">Tax Exempt</option>
                <option value="Private Placement">Private Placement</option>
                <option value="Promoter">Promoter</option>
              </select>
              <select className="h-9 rounded-md border bg-background px-2 text-sm" value={filters.status} onChange={(e) => updateFilter("status", e.target.value)}>
                <option value="all">All Status</option>
                <option value="Ready">Ready</option>
                <option value="Pending KYC">Pending KYC</option>
                <option value="Frozen">Frozen</option>
                <option value="Payment Failed">Payment Failed</option>
              </select>
              <Button variant="ghost" className="h-8 text-xs" onClick={clearFilters}>
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>

            {/* Advanced Filters */}
            {showAdvanced && (
              <div className="grid grid-cols-6 gap-2 rounded-md border bg-muted/30 p-3">
                <label className="grid gap-1 text-xs font-medium">
                  PAN
                  <input className="h-8 rounded-md border bg-background px-2 text-xs" placeholder="PAN number" value={filters.pan} onChange={(e) => updateFilter("pan", e.target.value)} />
                </label>
                <label className="grid gap-1 text-xs font-medium">
                  Citizenship
                  <input className="h-8 rounded-md border bg-background px-2 text-xs" placeholder="Citizenship no." value={filters.citizenship} onChange={(e) => updateFilter("citizenship", e.target.value)} />
                </label>
                <label className="grid gap-1 text-xs font-medium">
                  Bank
                  <input className="h-8 rounded-md border bg-background px-2 text-xs" placeholder="Bank name" value={filters.bank} onChange={(e) => updateFilter("bank", e.target.value)} />
                </label>
                <label className="grid gap-1 text-xs font-medium">
                  KYC Status
                  <select className="h-8 rounded-md border bg-background px-2 text-xs" value={filters.kycStatus} onChange={(e) => updateFilter("kycStatus", e.target.value)}>
                    <option value="all">All</option>
                    <option value="Verified">Verified</option>
                    <option value="Pending">Pending</option>
                    <option value="Expired">Expired</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-medium">
                  Freeze Status
                  <select className="h-8 rounded-md border bg-background px-2 text-xs" value={filters.freezeStatus} onChange={(e) => updateFilter("freezeStatus", e.target.value)}>
                    <option value="all">All</option>
                    <option value="None">None</option>
                    <option value="Frozen">Frozen</option>
                    <option value="Locked">Locked</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-medium">
                  Company
                  <select className="h-8 rounded-md border bg-background px-2 text-xs" value={filters.company} onChange={(e) => updateFilter("company", e.target.value)}>
                    <option value="all">All Companies</option>
                    <option value="NHPL">Nepal Hydro Power</option>
                    <option value="RBBMB">RBB Merchant Banking</option>
                    <option value="SICL">Sagarmatha Insurance</option>
                  </select>
                </label>
              </div>
            )}

            {/* AG Grid */}
            <ContextMenu items={contextMenuItems}>
              <div>
                <EnterpriseGrid<HolderRecord>
                  rows={holders}
                  columns={columns}
                  height={520}
                  rowHeight={36}
                  loading={isLoading}
                  showFooter
                  footerRow={footerRow}
                  onSelectionChanged={setSelectedRows}
                  onRowDoubleClicked={handleRowDoubleClick}
                  onContextMenu={handleContextMenu}
                  getRowId={(params) => params.data.boid}
                  emptyTitle="No holders found"
                  emptyDescription="Try adjusting your filters or import holder data to get started."
                />
              </div>
            </ContextMenu>
          </CardContent>
        </Card>

        {/* Detail Drawer */}
        {selectedHolder && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{selectedHolder.holder}</CardTitle>
                <Button variant="ghost" className="h-8 text-xs" onClick={() => setSelectedHolder(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>BOID: {selectedHolder.boid}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1 rounded-md border p-0.5">
                {["overview", "bank", "docs", "corp", "audit"].map((tab) => (
                  <button
                    key={tab}
                    className={`rounded px-2 py-1 text-xs font-medium ${detailTab === tab ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    onClick={() => setDetailTab(tab)}
                  >
                    {tab === "overview" ? "Overview" : tab === "bank" ? "Bank" : tab === "docs" ? "Docs" : tab === "corp" ? "Corp Actions" : "Audit"}
                  </button>
                ))}
              </div>

              {detailTab === "overview" && (
                <div className="mt-3 space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md border bg-muted/30 p-2"><strong className="block text-xs text-muted-foreground">Category</strong>{selectedHolder.category}</div>
                    <div className="rounded-md border bg-muted/30 p-2"><strong className="block text-xs text-muted-foreground">PAN</strong>{selectedHolder.pan}</div>
                    <div className="rounded-md border bg-muted/30 p-2"><strong className="block text-xs text-muted-foreground">Citizenship</strong>{selectedHolder.citizenship}</div>
                    <div className="rounded-md border bg-muted/30 p-2"><strong className="block text-xs text-muted-foreground">Units</strong>{formatNumber(selectedHolder.units)}</div>
                    <div className="rounded-md border bg-muted/30 p-2"><strong className="block text-xs text-muted-foreground">Face Value</strong>{formatMoney(selectedHolder.faceValue)}</div>
                    <div className="rounded-md border bg-muted/30 p-2"><strong className="block text-xs text-muted-foreground">Net Payable</strong>{formatMoney(selectedHolder.netAmount)}</div>
                    <div className="rounded-md border bg-muted/30 p-2"><strong className="block text-xs text-muted-foreground">KYC</strong><Badge tone={selectedHolder.kycStatus === "Verified" ? "success" : selectedHolder.kycStatus === "Pending" ? "warning" : "danger"}>{selectedHolder.kycStatus}</Badge></div>
                    <div className="rounded-md border bg-muted/30 p-2"><strong className="block text-xs text-muted-foreground">Freeze</strong><Badge tone={selectedHolder.freezeStatus === "None" ? "success" : "danger"}>{selectedHolder.freezeStatus}</Badge></div>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-2"><strong className="block text-xs text-muted-foreground">Remarks</strong>{selectedHolder.remarks}</div>
                  <div className="rounded-md border bg-muted/30 p-2"><strong className="block text-xs text-muted-foreground">Last Updated</strong>{selectedHolder.lastUpdated}</div>
                </div>
              )}

              {detailTab === "bank" && (
                <div className="mt-3 space-y-2 text-sm">
                  <div className="rounded-md border bg-muted/30 p-2"><strong className="block text-xs text-muted-foreground">Bank</strong>{selectedHolder.bank}</div>
                  <div className="rounded-md border bg-muted/30 p-2"><strong className="block text-xs text-muted-foreground">Account</strong>****1234</div>
                  <div className="rounded-md border bg-muted/30 p-2"><strong className="block text-xs text-muted-foreground">Branch</strong>Kathmandu Main</div>
                </div>
              )}

              {detailTab === "audit" && (
                <div className="mt-3 space-y-2 text-sm">
                  <div className="rounded-md border bg-muted/30 p-2"><strong className="block text-xs text-muted-foreground">Created</strong>2026-01-15 by Maker-01</div>
                  <div className="rounded-md border bg-muted/30 p-2"><strong className="block text-xs text-muted-foreground">Last Updated</strong>{selectedHolder.lastUpdated} by Checker-02</div>
                  <div className="rounded-md border bg-muted/30 p-2"><strong className="block text-xs text-muted-foreground">KYC Verified</strong>2026-03-20</div>
                </div>
              )}

              {detailTab === "docs" && (
                <div className="mt-3 text-sm text-muted-foreground">
                  <p>No documents uploaded for this holder.</p>
                  <Button variant="secondary" className="mt-2 h-8 text-xs" disabled><Upload className="h-3.5 w-3.5" />Upload Document</Button>
                </div>
              )}

              {detailTab === "corp" && (
                <div className="mt-3 text-sm text-muted-foreground">
                  <p>No corporate actions recorded for this holder.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={confirmOpen && confirmAction === "freeze"}
        onOpenChange={(open) => setConfirmOpen(open)}
        title="Freeze Selected Holders"
        description={`This will freeze ${selectedRows.length} holder(s) and prevent any disbursement. This action can be reversed by an authorized user.`}
        variant="warning"
        confirmLabel={`Freeze ${selectedRows.length} Holder(s)`}
        onConfirm={() => {
          toast.success(`${selectedRows.length} holder(s) frozen`);
          setSelectedRows([]);
          setConfirmOpen(false);
        }}
      />
      <ConfirmDialog
        open={confirmOpen && confirmAction === "unfreeze"}
        onOpenChange={(open) => setConfirmOpen(open)}
        title="Unfreeze Selected Holders"
        description={`This will unfreeze ${selectedRows.length} holder(s) and restore normal operations.`}
        variant="info"
        confirmLabel={`Unfreeze ${selectedRows.length} Holder(s)`}
        onConfirm={() => {
          toast.success(`${selectedRows.length} holder(s) unfrozen`);
          setSelectedRows([]);
          setConfirmOpen(false);
        }}
      />
    </div>
  );
}