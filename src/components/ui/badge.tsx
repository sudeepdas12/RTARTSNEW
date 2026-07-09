import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "default" | "success" | "warning" | "danger" | "info";

const tones: Record<BadgeTone, string> = {
  default: "bg-muted text-muted-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
  info: "bg-primary/10 text-primary"
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return <span className={cn("inline-flex h-6 items-center rounded-full px-2 text-xs font-semibold", tones[tone], className)} {...props} />;
}
