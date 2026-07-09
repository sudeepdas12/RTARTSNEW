import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardMetric } from "@/types/domain";

const toneMap = {
  default: "info",
  success: "success",
  warning: "warning",
  danger: "danger"
} as const;

export function MetricCard({ metric }: { metric: DashboardMetric }) {
  return (
    <Card>
      <CardContent className="flex min-h-28 items-start justify-between p-4">
        <div>
          <span className="text-xs font-medium text-muted-foreground">{metric.label}</span>
          <strong className="mt-2 block text-2xl">{metric.value}</strong>
          <Badge className="mt-3" tone={toneMap[metric.tone]}>
            {metric.delta}
          </Badge>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardContent>
    </Card>
  );
}
