import { Bell, CheckCircle2, Mail, MessageSquare, RefreshCw, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast-provider";
import { useNotificationTemplates, useNotifications } from "@/lib/queries";

const channelTabs = ["All", "System", "Email", "SMS"] as const;
const statusTabs = ["All", "Pending", "Sent", "Failed", "Retrying"] as const;

export function NotificationPage() {
  const notifications = useNotifications();
  const templates = useNotificationTemplates();
  const [channelTab, setChannelTab] = useState("All");
  const [statusTab, setStatusTab] = useState("All");

  const filtered = useMemo(() => {
    let items = notifications.data ?? [];
    if (channelTab !== "All") items = items.filter((n) => n.channel === channelTab);
    if (statusTab !== "All") items = items.filter((n) => n.status === statusTab);
    return items;
  }, [notifications.data, channelTab, statusTab]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Notification Center</CardTitle>
            <CardDescription>SMS, Email, System alerts, retry queue, history, and templates.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-md border bg-background p-3">
              <span className="text-xs text-muted-foreground">Total</span>
              <strong className="mt-1 block text-2xl">{notifications.data?.length ?? 0}</strong>
            </div>
            <div className="rounded-md border bg-green-50 p-3">
              <span className="text-xs text-green-700">Sent</span>
              <strong className="mt-1 block text-2xl text-green-700">{notifications.data?.filter((n) => n.status === "Sent").length ?? 0}</strong>
            </div>
            <div className="rounded-md border bg-amber-50 p-3">
              <span className="text-xs text-amber-700">Pending</span>
              <strong className="mt-1 block text-2xl text-amber-700">{notifications.data?.filter((n) => n.status === "Pending").length ?? 0}</strong>
            </div>
            <div className="rounded-md border bg-red-50 p-3">
              <span className="text-xs text-red-700">Failed</span>
              <strong className="mt-1 block text-2xl text-red-700">{notifications.data?.filter((n) => n.status === "Failed" || n.status === "Retrying").length ?? 0}</strong>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-1 rounded-md border p-0.5">
              {channelTabs.map((tab) => (
                <button key={tab} className={`rounded px-3 py-1 text-xs font-medium ${channelTab === tab ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} onClick={() => setChannelTab(tab)}>{tab}</button>
              ))}
            </div>
            <div className="flex gap-1 rounded-md border p-0.5">
              {statusTabs.map((tab) => (
                <button key={tab} className={`rounded px-3 py-1 text-xs font-medium ${statusTab === tab ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} onClick={() => setStatusTab(tab)}>{tab}</button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filtered.map((notif) => (
              <div key={notif.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border bg-background p-3">
                <div>
                  <div className="flex items-center gap-2">
                    {notif.channel === "Email" ? <Mail className="h-4 w-4 text-blue-500" /> : notif.channel === "SMS" ? <MessageSquare className="h-4 w-4 text-green-500" /> : <Bell className="h-4 w-4 text-purple-500" />}
                    <strong className="text-sm">{notif.title}</strong>
                    <Badge tone={notif.status === "Sent" ? "success" : notif.status === "Failed" ? "danger" : notif.status === "Retrying" ? "warning" : "default"}>{notif.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{notif.message}</p>
                  <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                    <span>{notif.channel}</span>
                    <span>To: {notif.recipient}</span>
                    {notif.retryCount > 0 && <span>Retries: {notif.retryCount}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {notif.status === "Failed" && <Button variant="secondary" onClick={() => toast.success("Retrying notification...")}><RefreshCw className="h-3 w-3" /></Button>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {templates.data?.map((tpl) => (
            <div key={tpl.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center gap-2">
                <strong>{tpl.name}</strong>
                <Badge>{tpl.channel}</Badge>
              </div>
              <p className="mt-1 text-muted-foreground">{tpl.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}