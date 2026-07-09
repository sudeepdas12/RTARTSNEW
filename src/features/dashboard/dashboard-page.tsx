import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard, useWorkflowTasks } from "@/lib/queries";
import { formatMoney } from "@/lib/utils";
import { Activity, AlertTriangle, Building2, CalendarCheck, Clock, TrendingUp } from "lucide-react";

export function DashboardPage() {
  const { metrics, charts } = useDashboard();
  const tasks = useWorkflowTasks();

  if (metrics.isLoading || charts.isLoading) {
    return <Skeleton className="h-[800px]" />;
  }

  const pendingTasks = tasks.data?.filter((t) => t.status === "pending") ?? [];
  const highPriorityTasks = pendingTasks.filter((t) => t.priority === "High");

  return (
    <div className="space-y-4">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-3 gap-3 2xl:grid-cols-6">
        {metrics.data?.map((metric) => <MetricCard key={metric.id} metric={metric} />)}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Financial Operations Trend</CardTitle>
              <CardDescription>Dividend, interest, payment, TDS, corporate actions, and holder growth trends.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="dividend" stroke="#087f83" fill="#087f8333" name="Dividend" />
                  <Area type="monotone" dataKey="interest" stroke="#285f9f" fill="#285f9f33" name="Interest" />
                  <Area type="monotone" dataKey="payments" stroke="#237a4b" fill="#237a4b33" name="Payments" />
                  <Area type="monotone" dataKey="tds" stroke="#b36b00" fill="#b36b0033" name="TDS" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-rows-2 gap-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Corporate Actions & Holder Growth</CardTitle>
                <CardDescription>Monthly corporate actions and holder growth rate.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" hide />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="corporateActions" fill="#7c3aed" name="Actions" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="holderGrowth" fill="#0ea5e9" name="Growth %" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Workflow Queue</CardTitle>
                <CardDescription>{pendingTasks.length} pending · {highPriorityTasks.length} high priority</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasks.data?.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
                  <div className={cn(
                    "grid h-8 w-8 place-items-center rounded-full",
                    task.priority === "High" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                  )}>
                    {task.priority === "High" ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate">{task.title}</strong>
                    <span className="text-xs text-muted-foreground">{task.module} · due {task.dueAt}</span>
                  </div>
                  <Badge tone={task.priority === "High" ? "danger" : task.priority === "Medium" ? "warning" : "info"}>{task.priority}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Widgets Row */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm"><Activity className="h-4 w-4" />Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span>Dividend cycle DIV-2082-83 created</span>
              <span className="ml-auto">5m ago</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span>Payment batch PAY-078 drafted</span>
              <span className="ml-auto">15m ago</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>Recon exception REC-3 flagged</span>
              <span className="ml-auto">1h ago</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              <span>Bonus share CA-001 approved</span>
              <span className="ml-auto">2h ago</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4" />Top Companies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span>NHPL</span><span className="text-muted-foreground">NPR 39.3M</span></div>
            <div className="flex items-center justify-between"><span>RBBMB</span><span className="text-muted-foreground">NPR 12.0M</span></div>
            <div className="flex items-center justify-between"><span>SICL</span><span className="text-muted-foreground">NPR 5.6M</span></div>
            <div className="flex items-center justify-between"><span>NBL</span><span className="text-muted-foreground">NPR 2.1M</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm"><CalendarCheck className="h-4 w-4" />Upcoming AGMs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>NHPL AGM</span>
              <Badge tone="info">2026-08-15</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>SICL AGM</span>
              <Badge tone="info">2026-09-01</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm"><TrendingUp className="h-4 w-4" />Scheduler Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span>API Health</span><Badge tone="success">99.98%</Badge></div>
            <div className="flex items-center justify-between"><span>Database</span><Badge tone="success">99.95%</Badge></div>
            <div className="flex items-center justify-between"><span>Scheduler</span><Badge tone="success">Online</Badge></div>
            <div className="flex items-center justify-between"><span>Queue Depth</span><Badge tone="warning">384</Badge></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}