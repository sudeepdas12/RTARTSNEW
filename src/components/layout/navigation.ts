import {
  Activity,
  Banknote,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  FileBarChart,
  Gauge,
  HelpCircle,
  Landmark,
  Scale,
  Settings,
  ShieldCheck,
  Users
} from "lucide-react";
import type { Permission } from "@/types/domain";

export interface NavItem {
  label: string;
  path: string;
  icon: typeof Gauge;
  permissions: Permission[];
}

export const navItems: NavItem[] = [
  { label: "Dashboard", path: "/", icon: Gauge, permissions: ["dashboard:read"] },
  { label: "Registry", path: "/registry", icon: Users, permissions: ["registry:read"] },
  { label: "Corporate Actions", path: "/corporate-actions", icon: Building2, permissions: ["dividend:read"] },
  { label: "Dividends", path: "/dividends", icon: Banknote, permissions: ["dividend:read"] },
  { label: "Debentures", path: "/debentures", icon: Landmark, permissions: ["debenture:read"] },
  { label: "Payments", path: "/payments", icon: BriefcaseBusiness, permissions: ["payment:read"] },
  { label: "Bank Reconciliation", path: "/reconciliation", icon: Scale, permissions: ["reconciliation:write"] },
  { label: "AGM", path: "/agm", icon: CalendarClock, permissions: ["registry:read"] },
  { label: "Documents", path: "/documents", icon: BookOpen, permissions: ["documents:read"] },
  { label: "Notifications", path: "/notifications", icon: Bell, permissions: ["notifications:read"] },
  { label: "Workflow", path: "/workflow", icon: Activity, permissions: ["workflow:read"] },
  { label: "Reports", path: "/reports", icon: FileBarChart, permissions: ["reports:export"] },
  { label: "Administration", path: "/admin", icon: ShieldCheck, permissions: ["admin:manage", "audit:read"] },
  { label: "Settings", path: "/settings", icon: Settings, permissions: ["dashboard:read"] },
  { label: "Audit", path: "/audit", icon: Activity, permissions: ["audit:read"] },
  { label: "Help", path: "/help", icon: HelpCircle, permissions: ["dashboard:read"] },
  { label: "Documentation", path: "/docs", icon: BookOpen, permissions: ["dashboard:read"] }
];
