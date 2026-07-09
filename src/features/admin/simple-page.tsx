import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SimplePage({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3">
        {["Loading skeleton", "Empty state", "Pagination", "Search", "Filter", "Sort", "Bulk actions", "Keyboard navigation", "Audit timeline"].map((item) => (
          <div key={item} className="rounded-md border bg-muted/40 p-3 text-sm font-medium">{item}</div>
        ))}
      </CardContent>
    </Card>
  );
}
