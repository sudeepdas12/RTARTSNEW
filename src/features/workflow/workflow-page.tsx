import { CheckCircle2, Clock, MessageSquare, Paperclip, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useApproveTask, useWorkflowTasks } from "@/lib/queries";

const toneByPriority = { Low: "info", Medium: "warning", High: "danger" } as const;

export function WorkflowPage() {
  const tasks = useWorkflowTasks();
  const approve = useApproveTask();

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Generic Workflow Queue</CardTitle>
          <CardDescription>Assigned, pending, approved, rejected, escalated, history, timeline, comments, attachments, and reports.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.data?.map((task) => (
          <div key={task.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border bg-background p-3">
            <div>
              <div className="flex items-center gap-2">
                <strong>{task.title}</strong>
                <Badge tone={toneByPriority[task.priority]}>{task.priority}</Badge>
                <Badge>{task.status}</Badge>
              </div>
              <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                <span>{task.module}</span>
                <span>Assigned to {task.assignedTo}</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{task.dueAt}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary"><MessageSquare className="h-4 w-4" />Comment</Button>
              <Button variant="secondary"><Paperclip className="h-4 w-4" />Attach</Button>
              <Button variant="danger"><XCircle className="h-4 w-4" />Reject</Button>
              <Button onClick={() => approve.mutate(task.id)}><CheckCircle2 className="h-4 w-4" />Approve</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
