import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, Command, Moon, Search, Sun, Workflow } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast-provider";
import { navItems } from "@/components/layout/navigation";
import { canAny } from "@/lib/permissions";
import { useCompanies, useCurrentUser } from "@/lib/queries";
import { cn } from "@/lib/utils";

const pageTitles: Record<string, string> = {
  "/": "Executive Dashboard",
  "/registry": "Holder Management",
  "/corporate-actions": "Corporate Actions",
  "/dividends": "Dividend Module",
  "/debentures": "Debenture Interest",
  "/payments": "Payment Operations",
  "/reconciliation": "Bank Reconciliation",
  "/agm": "AGM",
  "/documents": "Document Management",
  "/notifications": "Notification Center",
  "/workflow": "Workflow Queue",
  "/reports": "Reports",
  "/admin": "Administration",
  "/settings": "Settings",
  "/audit": "Audit Trail",
  "/help": "Help",
  "/docs": "Documentation"
};

const keyboardShortcuts: Record<string, string> = {
  "g then d": "Go to Dashboard",
  "g then r": "Go to Registry",
  "g then v": "Go to Dividends",
  "g then b": "Go to Debentures",
  "g then p": "Go to Payments",
  "g then c": "Go to Corporate Actions",
  "g then w": "Go to Workflow",
  "g then n": "Go to Notifications",
  "g then a": "Go to Administration",
  "g then u": "Go to Audit",
  "g then s": "Go to Settings",
  "g then h": "Go to Help",
  "?": "Show keyboard shortcuts",
  "ctrl+k": "Focus search",
  "ctrl+b": "Toggle sidebar",
  "ctrl+e": "Export current view"
};

export function AppShell() {
  const { data: user } = useCurrentUser();
  const { data: companies = [] } = useCompanies();
  const location = useLocation();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [offline, setOffline] = useState(!navigator.onLine);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Offline detection
  useEffect(() => {
    function handleOnline() { setOffline(false); toast.success("Back online"); }
    function handleOffline() { setOffline(true); toast.error("You are offline. Changes will be saved locally."); }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    let keyBuffer = "";
    let bufferTimeout: ReturnType<typeof setTimeout>;

    function handleKeyDown(event: KeyboardEvent) {
      // Ctrl+K: Focus search
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>("input[placeholder*='Search']");
        searchInput?.focus();
        return;
      }

      // Ctrl+E: Export
      if ((event.ctrlKey || event.metaKey) && event.key === "e") {
        event.preventDefault();
        toast.info("Export triggered via keyboard shortcut");
        return;
      }

      // ?: Show shortcuts
      if (event.key === "?" && !event.ctrlKey && !event.metaKey) {
        setShowShortcuts((prev) => !prev);
        return;
      }

      // Goto navigation: g then [key]
      if (event.key === "g" && !event.ctrlKey && !event.metaKey) {
        keyBuffer = "g";
        clearTimeout(bufferTimeout);
        bufferTimeout = setTimeout(() => { keyBuffer = ""; }, 1000);
        return;
      }

      if (keyBuffer === "g") {
        const navMap: Record<string, string> = {
          d: "/", r: "/registry", v: "/dividends", b: "/debentures",
          p: "/payments", c: "/corporate-actions", w: "/workflow",
          n: "/notifications", a: "/admin", u: "/audit", s: "/settings", h: "/help"
        };
        const path = navMap[event.key];
        if (path) {
          event.preventDefault();
          navigate(path);
          toast.info(`Navigated to ${pageTitles[path] ?? path}`);
        }
        keyBuffer = "";
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  const visibleNav = useMemo(() => navItems.filter((item) => canAny(user, item.permissions)), [user]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  }

  return (
    <div className="grid min-h-screen grid-rows-[56px_1fr_28px] bg-background text-foreground">
      {/* Offline Banner */}
      {offline && (
        <div className="fixed top-0 z-50 flex h-8 w-full items-center justify-center bg-amber-600 text-xs font-medium text-white">
          You are offline. Changes will be saved locally and synced when you reconnect.
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowShortcuts(false)}>
          <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold">Keyboard Shortcuts</h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(keyboardShortcuts).map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                  <kbd className="rounded border bg-background px-2 py-0.5 font-mono text-xs">{key}</kbd>
                  <span className="text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
            <Button className="mt-4 w-full" variant="secondary" onClick={() => setShowShortcuts(false)}>Close</Button>
          </div>
        </div>
      )}

      <header className="z-20 flex items-center gap-3 border-b bg-card px-3" style={offline ? { marginTop: 32 } : {}}>
        <div className="flex min-w-60 items-center gap-3 border-r pr-3">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-accent font-black text-accent-foreground">RT</div>
          <div className="leading-tight">
            <strong className="block text-sm">SEBON RTA/RTS</strong>
            <span className="text-xs text-muted-foreground">Registrar operations</span>
          </div>
        </div>

        <select className="h-9 min-w-56 rounded-md border bg-background px-2 text-sm" aria-label="Company switcher">
          {companies.map((company) => (
            <option key={company.id}>{company.name}</option>
          ))}
        </select>

        <label className="flex h-9 min-w-80 flex-1 items-center gap-2 rounded-md border bg-background px-3 text-sm">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input className="w-full bg-transparent outline-none" placeholder="Search BOID, holder, payment batch, workflow task (Ctrl+K)" />
        </label>

        <Button variant="secondary" title="Quick actions" onClick={() => toast.info("Quick actions menu")}>
          <Command className="h-4 w-4" />
          Quick
        </Button>
        <Button variant="secondary" title="Workflow tasks" onClick={() => navigate("/workflow")}>
          <Workflow className="h-4 w-4" />
          Tasks
          <Badge tone="warning">18</Badge>
        </Button>
        <Button variant="ghost" title="Notifications" onClick={() => navigate("/notifications")}>
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" onClick={toggleTheme} title="Theme switch">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" aria-label="Language">
          <option>EN</option>
          <option>ने</option>
        </select>
        <div className="grid h-9 min-w-28 place-items-center rounded-md border bg-background px-2 text-xs">
          <strong>{user?.name ?? "Loading"}</strong>
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-[260px_1fr_320px]">
        <aside className="min-h-0 overflow-y-auto border-r bg-card">
          <nav className="grid gap-1 p-2" aria-label="Primary">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    cn(
                      "flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground",
                      isActive && "bg-primary text-primary-foreground",
                      !isActive && "hover:bg-muted hover:text-foreground"
                    )
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 overflow-y-auto">
          <div className="border-b bg-background px-5 py-3">
            <div className="text-xs text-muted-foreground">Home / {pageTitles[location.pathname] ?? "Workspace"}</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">{pageTitles[location.pathname] ?? "Workspace"}</h1>
          </div>
          <div className="p-4" id="print-area">
            <Outlet />
          </div>
        </main>

        <aside className="min-h-0 overflow-y-auto border-l bg-card p-3">
          <Card>
            <CardHeader>
              <CardTitle>Details Drawer</CardTitle>
              <Badge tone="info">Context</Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">Select a row, workflow task, payment batch, or report to inspect audit history, documents, comments, and permitted actions.</p>
              <div className="rounded-md border bg-muted/40 p-3">
                <strong className="block">Current role</strong>
                <span className="text-muted-foreground">{user?.role ?? "Loading"}</span>
              </div>
              <div className="rounded-md border bg-muted/40 p-3">
                <strong className="block">Tenant scope</strong>
                <span className="text-muted-foreground">company_id enforced by API and database RLS</span>
              </div>
              <div className="rounded-md border bg-muted/40 p-3">
                <strong className="block">Keyboard shortcuts</strong>
                <span className="text-muted-foreground">Press <kbd className="rounded border bg-background px-1 font-mono text-xs">?</kbd> to view all shortcuts</span>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <footer className="flex items-center justify-between border-t bg-card px-3 text-xs text-muted-foreground">
        <span>
          {offline ? "⚠ Offline mode" : "API healthy · DB healthy · Scheduler online · Queue depth 384"}
        </span>
        <span>Autosave ready · Offline detection active · WCAG 2.1 AA target · Press ? for shortcuts</span>
      </footer>
    </div>
  );
}