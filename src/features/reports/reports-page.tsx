import { CalendarClock, Download, FileSpreadsheet, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const groups = [
  "Dashboard Reports",
  "Operational Reports",
  "Financial Reports",
  "Tax Reports",
  "Audit Reports",
  "Custom Reports",
  "Saved Reports",
  "Scheduled Reports"
];

export function ReportsPage() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {groups.map((group) => (
        <Card key={group}>
          <CardHeader>
            <div>
              <CardTitle>{group}</CardTitle>
              <CardDescription>Exportable Excel, PDF, CSV, and print-ready reports.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="secondary"><FileSpreadsheet className="h-4 w-4" />Excel</Button>
            <Button variant="secondary"><Download className="h-4 w-4" />PDF</Button>
            <Button variant="secondary"><Printer className="h-4 w-4" />Print</Button>
            <Button variant="secondary"><CalendarClock className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
