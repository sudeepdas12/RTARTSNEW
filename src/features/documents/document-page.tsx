import { Download, FileText, Search, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast-provider";
import { useDocuments } from "@/lib/queries";
import type { DocumentRecord } from "@/types/domain";

export function DocumentPage() {
  const documents = useDocuments();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Document Management</CardTitle>
            <CardDescription>Upload, preview, OCR status, version history, download, audit, and approval.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button><Upload className="h-4 w-4" />Upload Document</Button>
            <Button variant="secondary" disabled><Search className="h-4 w-4" />Search</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-md border bg-background p-3">
              <span className="text-xs text-muted-foreground">Total Documents</span>
              <strong className="mt-1 block text-2xl">{documents.data?.length ?? 0}</strong>
            </div>
            <div className="rounded-md border bg-green-50 p-3">
              <span className="text-xs text-green-700">OCR Completed</span>
              <strong className="mt-1 block text-2xl text-green-700">{documents.data?.filter((d) => d.ocrStatus === "Completed").length ?? 0}</strong>
            </div>
            <div className="rounded-md border bg-amber-50 p-3">
              <span className="text-xs text-amber-700">OCR Pending</span>
              <strong className="mt-1 block text-2xl text-amber-700">{documents.data?.filter((d) => d.ocrStatus === "Pending").length ?? 0}</strong>
            </div>
            <div className="rounded-md border bg-red-50 p-3">
              <span className="text-xs text-red-700">OCR Failed</span>
              <strong className="mt-1 block text-2xl text-red-700">{documents.data?.filter((d) => d.ocrStatus === "Failed").length ?? 0}</strong>
            </div>
          </div>

          <div className="space-y-2">
            {documents.data?.map((doc) => (
              <div key={doc.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border bg-background p-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm">{doc.title}</strong>
                      <Badge tone={doc.ocrStatus === "Completed" ? "success" : doc.ocrStatus === "Failed" ? "danger" : "warning"}>{doc.ocrStatus}</Badge>
                      <Badge>{doc.status}</Badge>
                    </div>
                    <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                      <span>{doc.fileName}</span>
                      <span>v{doc.version}</span>
                      <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
                      <span>by {doc.uploadedBy}</span>
                      <span>{doc.uploadedAt}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => toast.info("Preview not available in demo")}><FileText className="h-4 w-4" /></Button>
                  <Button variant="secondary" onClick={() => toast.success("Downloading...")}><Download className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}