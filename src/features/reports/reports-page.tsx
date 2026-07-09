import { CalendarClock, Download, FileSpreadsheet, Heart, Printer, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast-provider";

interface ReportItem {
  id: string;
  name: string;
  description: string;
  group: string;
  formats: ("excel" | "pdf" | "csv" | "print")[];
  favorite: boolean;
  lastRun?: string;
  scheduled?: string;
}

const reportGroups = [
  { id: "dashboard", name: "Dashboard Reports", icon: "📊" },
  { id: "operational", name: "Operational Reports", icon: "⚙️" },
  { id: "financial", name: "Financial Reports", icon: "💰" },
  { id: "tax", name: "Tax Reports", icon: "🧾" },
  { id: "audit", name: "Audit Reports", icon: "🔍" },
  { id: "custom", name: "Custom Reports", icon: "🛠️" },
  { id: "saved", name: "Saved Reports", icon: "💾" },
  { id: "scheduled", name: "Scheduled Reports", icon: "📅" }
];

const allReports: ReportItem[] = [
  { id: "rpt-001", name: "Holder Register", description: "Complete list of all registered holders with BOID, category, units, and status", group: "dashboard", formats: ["excel", "pdf", "print"], favorite: true, lastRun: "2026-07-08" },
  { id: "rpt-002", name: "Dividend Summary", description: "Dividend calculation summary by company, category, and cycle", group: "dashboard", formats: ["excel", "pdf", "csv", "print"], favorite: true, lastRun: "2026-07-07" },
  { id: "rpt-003", name: "Interest Summary", description: "Debenture interest calculation summary by debenture and category", group: "dashboard", formats: ["excel", "pdf", "print"], favorite: false, lastRun: "2026-07-06" },
  { id: "rpt-004", name: "Payment Status", description: "Payment batch status with settled, failed, returned, and unclaimed breakdown", group: "operational", formats: ["excel", "pdf", "print"], favorite: true, lastRun: "2026-07-08" },
  { id: "rpt-005", name: "Reconciliation Report", description: "Bank reconciliation matching report with exceptions and differences", group: "operational", formats: ["excel", "pdf", "csv"], favorite: false, lastRun: "2026-07-05" },
  { id: "rpt-006", name: "Corporate Actions Log", description: "All corporate actions with status, approval, and completion dates", group: "operational", formats: ["excel", "pdf", "print"], favorite: false },
  { id: "rpt-007", name: "Workflow Queue", description: "Pending, approved, and rejected workflow tasks by module", group: "operational", formats: ["excel", "pdf"], favorite: true },
  { id: "rpt-008", name: "TDS Certificate", description: "Tax deducted at source certificate by holder and fiscal year", group: "tax", formats: ["pdf", "print"], favorite: true, lastRun: "2026-07-01" },
  { id: "rpt-009", name: "TDS Summary by Category", description: "TDS deducted grouped by holder category and TDS rate", group: "tax", formats: ["excel", "pdf", "csv"], favorite: false },
  { id: "rpt-010", name: "Net Payable Report", description: "Net amount payable to holders after TDS deduction", group: "financial", formats: ["excel", "pdf", "print"], favorite: true, lastRun: "2026-07-08" },
  { id: "rpt-011", name: "Bank File Export Log", description: "History of bank payment file exports with reference numbers", group: "financial", formats: ["excel", "pdf"], favorite: false },
  { id: "rpt-012", name: "Unclaimed Payments", description: "Holders with unclaimed payments requiring follow-up", group: "financial", formats: ["excel", "pdf", "print"], favorite: true },
  { id: "rpt-013", name: "Audit Trail", description: "Complete audit log with before/after state changes", group: "audit", formats: ["excel", "pdf", "csv"], favorite: true, lastRun: "2026-07-08" },
  { id: "rpt-014", name: "User Activity Log", description: "User actions by module, entity, and timestamp", group: "audit", formats: ["excel", "pdf"], favorite: false },
  { id: "rpt-015", name: "KYC Status Report", description: "Holder KYC verification status with pending and expired counts", group: "operational", formats: ["excel", "pdf", "print"], favorite: false },
  { id: "rpt-016", name: "AGM Attendance", description: "AGM attendance records, voting results, and resolutions", group: "operational", formats: ["excel", "pdf", "print"], favorite: false }
];

export function ReportsPage() {
  const [activeGroup, setActiveGroup] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);

  const filteredReports = useMemo(() => {
    let reports = allReports;
    if (showFavorites) reports = reports.filter((r) => r.favorite);
    if (activeGroup !== "all") reports = reports.filter((r) => r.group === activeGroup);
    if (search) {
      const q = search.toLowerCase();
      reports = reports.filter((r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
    }
    return reports;
  }, [activeGroup, search, showFavorites]);

  const handleExport = (report: ReportItem, format: string) => {
    toast.success(`Generating ${format.toUpperCase()} for "${report.name}"`);
  };

  const handleSchedule = (report: ReportItem) => {
    toast.info(`Schedule dialog for "${report.name}"`);
  };

  const handleToggleFavorite = (report: ReportItem) => {
    toast.success(report.favorite ? `Removed "${report.name}" from favorites` : `Added "${report.name}" to favorites`);
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="page-header">
        <div className="page-breadcrumb">Home / Reports / Report Center</div>
        <h1 className="page-title">Report Center</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="stat">
          <span className="stat-label">Total Reports</span>
          <strong className="stat-value">{allReports.length}</strong>
        </div>
        <div className="stat border-amber-200 bg-amber-50/50">
          <span className="stat-label text-amber-700">Favorites</span>
          <strong className="stat-value text-amber-700">{allReports.filter((r) => r.favorite).length}</strong>
        </div>
        <div className="stat border-blue-200 bg-blue-50/50">
          <span className="stat-label text-blue-700">Recently Run</span>
          <strong className="stat-value text-blue-700">{allReports.filter((r) => r.lastRun).length}</strong>
        </div>
        <div className="stat border-green-200 bg-green-50/50">
          <span className="stat-label text-green-700">Scheduled</span>
          <strong className="stat-value text-green-700">{allReports.filter((r) => r.scheduled).length}</strong>
        </div>
      </div>

      {/* Group Tabs + Search */}
      <div className="flex items-center gap-3">
        <div className="filter-tabs">
          <button className={`filter-tab ${activeGroup === "all" ? "filter-tab-active" : ""}`} onClick={() => setActiveGroup("all")}>All</button>
          {reportGroups.map((g) => (
            <button key={g.id} className={`filter-tab ${activeGroup === g.id ? "filter-tab-active" : ""}`} onClick={() => setActiveGroup(g.id)}>
              {g.icon} {g.name}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input className="h-8 w-full rounded-md border bg-background pl-8 pr-2 text-xs" placeholder="Search reports..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant={showFavorites ? "primary" : "secondary"} className="h-8 text-xs" onClick={() => setShowFavorites(!showFavorites)}>
          <Heart className="h-3.5 w-3.5" /> Favorites
        </Button>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-2 gap-3">
        {filteredReports.map((report) => (
          <Card key={report.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm">{report.name}</CardTitle>
                  <CardDescription className="text-xs mt-1">{report.description}</CardDescription>
                </div>
                <button onClick={() => handleToggleFavorite(report)} className="text-muted-foreground hover:text-amber-500 transition-colors">
                  <Heart className={`h-4 w-4 ${report.favorite ? "fill-amber-500 text-amber-500" : ""}`} />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge>{report.group.charAt(0).toUpperCase() + report.group.slice(1)}</Badge>
                  {report.lastRun && <span className="text-xs text-muted-foreground">Last: {report.lastRun}</span>}
                </div>
                <div className="flex gap-1">
                  {report.formats.includes("excel") && (
                    <Button variant="ghost" className="h-7 w-7 p-0" onClick={() => handleExport(report, "excel")} title="Export Excel">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
                    </Button>
                  )}
                  {report.formats.includes("pdf") && (
                    <Button variant="ghost" className="h-7 w-7 p-0" onClick={() => handleExport(report, "pdf")} title="Export PDF">
                      <Download className="h-3.5 w-3.5 text-red-600" />
                    </Button>
                  )}
                  {report.formats.includes("print") && (
                    <Button variant="ghost" className="h-7 w-7 p-0" onClick={() => window.print()} title="Print">
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSchedule(report)} title="Schedule">
                    <CalendarClock className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <div className="empty-state">
          <Search className="empty-state-icon" />
          <p className="empty-state-title">No reports found</p>
          <p className="empty-state-description">Try adjusting your filters or search terms.</p>
        </div>
      )}
    </div>
  );
}