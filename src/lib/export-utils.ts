import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { CycleSummary, HolderRecord, PaymentBatch, ReconciliationItem } from "@/types/domain";

export function exportToExcel<T extends Record<string, unknown>>(data: T[], filename: string, sheetName = "Data") {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(blob, `${filename}.xlsx`);
}

export function exportHoldersToExcel(holders: HolderRecord[]) {
  exportToExcel(
    holders as unknown as Record<string, unknown>[],
    `holder-register-${new Date().toISOString().slice(0, 10)}`,
    "Holders"
  );
}

export function exportDividendCyclesToExcel(cycles: CycleSummary[]) {
  exportToExcel(
    cycles as unknown as Record<string, unknown>[],
    `dividend-cycles-${new Date().toISOString().slice(0, 10)}`,
    "Dividend Cycles"
  );
}

export function exportPaymentBatchesToExcel(batches: PaymentBatch[]) {
  exportToExcel(
    batches as unknown as Record<string, unknown>[],
    `payment-batches-${new Date().toISOString().slice(0, 10)}`,
    "Payments"
  );
}

export function exportReconciliationToExcel(items: ReconciliationItem[]) {
  exportToExcel(
    items as unknown as Record<string, unknown>[],
    `reconciliation-${new Date().toISOString().slice(0, 10)}`,
    "Reconciliation"
  );
}

export function printPage(title: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(`
    <html>
      <head><title>${title}</title></head>
      <body>${document.getElementById("print-area")?.innerHTML ?? ""}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}