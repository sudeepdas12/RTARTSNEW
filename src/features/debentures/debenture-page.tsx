import type { ColDef } from "@ag-grid-community/core";
import { EnterpriseGrid } from "@/components/data-grid/enterprise-grid";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDebentureCycles } from "@/lib/queries";
import { formatMoney } from "@/lib/utils";
import type { CycleSummary } from "@/types/domain";

export function DebenturePage() {
  const cycles = useDebentureCycles();
  const columns: ColDef<CycleSummary>[] = [
    { field: "id", headerName: "Interest Cycle" },
    { field: "company" },
    { field: "rate", headerName: "Coupon Rate %" },
    { field: "recordDate" },
    { field: "gross", headerName: "Gross Interest", valueFormatter: ({ value }) => formatMoney(Number(value)) },
    { field: "tax", headerName: "TDS", valueFormatter: ({ value }) => formatMoney(Number(value)) },
    { field: "net", headerName: "Net Interest", valueFormatter: ({ value }) => formatMoney(Number(value)) },
    { field: "status" },
    { field: "version" }
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Debenture Interest Calculation</CardTitle>
            <CardDescription>Public, private placement, tax-exempt fund, and summary workflows for 7% RBB Debenture reconciliation replacement.</CardDescription>
          </div>
          <Badge tone="info">Actual/365</Badge>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-5 gap-3">
            {["Face Value", "Coupon", "Days", "Gross Interest", "Net Interest"].map((item) => (
              <div key={item} className="rounded-md border bg-muted/40 p-3">
                <span className="text-xs text-muted-foreground">{item}</span>
                <strong className="mt-1 block">{item === "Coupon" ? "7%" : item === "Days" ? "181" : "Derived"}</strong>
              </div>
            ))}
          </div>
          <EnterpriseGrid rows={cycles.data ?? []} columns={columns} height={380} />
        </CardContent>
      </Card>
    </div>
  );
}
