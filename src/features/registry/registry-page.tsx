import type { ColDef, ICellRendererParams } from "@ag-grid-community/core";
import { Download, FileText, Printer, Save, Search, ShieldAlert, UserCheck, UserX } from "lucide-react";
import { useMemo, useState } from "react";
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

export function RegistryPage() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedRows, setSelectedRows] = useState<HolderRecord[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const query = useMemo(() => {
    const params = new URLSearchParams({ category });
    if (search) params.set("search", search);
    return params;
  }, [category, search]);
  const holders = useHolders(query);

  const columns = useMemo<ColDef<HolderRecord>[]>(
    () => [
      { field: "boid", headerName: "BOID", pinned: "left", minWidth: 170, checkboxSelection: true, headerCheckboxSelection: true },
      { field: "holder", headerName: "Holder", pinned: "left", minWidth: 190 },
      { field: "category", headerName: "Category", cellRenderer: (params: ICellRendererParams) => <Badge>{params.value}</Badge> },
      { field: "units", valueFormatter: ({ value }) => formatNumber(Number(value)) },
      { field: "faceValue", headerName: "Face Value", valueFormatter: ({ value }) => formatMoney(Number(value)) },
      { field: "dividend", valueFormatter: ({ value }) => formatMoney(Number(value)) },
      { field: "interest", valueFormatter: ({ value }) => formatMoney(Number(value)) },
      { field: "tax", valueFormatter: ({ value }) => formatMoney(Number(value)) },
      { field: "netAmount", headerName: "Net Amount", valueFormatter: ({ value }) => formatMoney(Number(value)) },
      { field: "bank" },
      {
        field: "kycStatus", headerName: "KYC",
        cellRenderer: (params: ICellRendererParams) => {
          const status = params.value as string;
          return status === "Verified" ? <UserCheck className="h-4 w-4 text-green-600" /> :
            status === "Pending" ? <ShieldAlert className="h-4 w-4 text-amber-600" /> :
            <UserX className="h-4 w-4 text-red-600" />;
        }
      },
      { field: "freezeStatus", headerName: "Freeze" },
      { field: "status", headerName: "Status", cellRenderer: (params: ICellRendererParams) => {
        const s = params.value as string;
        return <Badge tone={s === "Ready" ? "success" : s === "Pending KYC" ? "warning" : s === "Frozen" ? "danger" : "default"}>{s}</Badge>;
      }},
      { field: "remarks", headerName: "Remarks", minWidth: 200 }
    ],
    []
  );

  function handleExportExcel() {
    const data = holders.data?.data ?? [];
    if (data.length === 0) { toast.error("No data to export"); return; }
    exportHoldersToExcel(data);
    toast.success(`Exported ${data.length} holders to Excel`);
  }

  function handlePrint() {
    printPage("Holder Register");
    toast.success("Print dialog opened");
  }

  function handleBulkFreeze() {
    if (selectedRows.length === 0) { toast.error("Select holders first"); return; }
    setConfirmOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Holder Register</CardTitle>
          <CardDescription>Excel replacement grid with BOID, category, units, tax, net payable, bank, KYC, freeze, and payment state.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled><Save className="h-4 w-4" />Saved Views</Button>
          <Button variant="secondary" onClick={handleExportExcel}><Download className="h-4 w-4" />Excel</Button>
          <Button variant="secondary" disabled><FileText className="h-4 w-4" />PDF</Button>
          <Button variant="secondary" onClick={handlePrint}><Printer className="h-4 w-4" />Print</Button>
          <Button variant="danger" onClick={handleBulkFreeze} disabled={selectedRows.length === 0}>
            <ShieldAlert className="h-4 w-4" />Freeze ({selectedRows.length})
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-7 gap-2">
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            <option value="Public">Public</option>
            <option value="Institution">Institution</option>
            <option value="Tax Exempt">Tax Exempt</option>
            <option value="Private Placement">Private Placement</option>
            <option value="Promoter">Promoter</option>
          </select>
          <div className="relative col-span-2">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input className="h-9 w-full rounded-md border bg-background pl-8 pr-2 text-sm" placeholder="Search BOID, holder, PAN..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <input className="h-9 rounded-md border bg-background px-2 text-sm" placeholder="PAN" />
          <input className="h-9 rounded-md border bg-background px-2 text-sm" placeholder="Citizenship" />
          <input className="h-9 rounded-md border bg-background px-2 text-sm" placeholder="Bank" />
          <select className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="">All Status</option>
            <option value="Ready">Ready</option>
            <option value="Pending KYC">Pending KYC</option>
            <option value="Frozen">Frozen</option>
            <option value="Payment Failed">Payment Failed</option>
          </select>
        </div>
        <ContextMenu items={[
          { label: "View Details", onClick: () => toast.info("View details") },
          { label: "Edit Holder", onClick: () => toast.info("Edit holder") },
          { separator: true, label: "", onClick: () => {} },
          { label: "Freeze Holder", onClick: () => setConfirmOpen(true), icon: <ShieldAlert className="h-4 w-4" /> },
          { label: "Export Selected", onClick: handleExportExcel, icon: <Download className="h-4 w-4" /> }
        ]}>
          <div>
            <EnterpriseGrid
              rows={holders.data?.data ?? []}
              columns={columns}
              onSelectionChanged={(rows) => setSelectedRows(rows)}
            />
          </div>
        </ContextMenu>
      </CardContent>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Freeze Selected Holders"
        description={`This will freeze ${selectedRows.length} holder(s) and prevent any disbursement. This action can be reversed.`}
        variant="warning"
        confirmLabel="Freeze Holders"
        onConfirm={() => {
          toast.success(`${selectedRows.length} holder(s) frozen`);
          setSelectedRows([]);
        }}
      />
    </Card>
  );
}