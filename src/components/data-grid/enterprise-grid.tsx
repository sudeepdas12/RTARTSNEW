import { AgGridReact } from "@ag-grid-community/react";
import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
import type { ColDef, GridReadyEvent } from "@ag-grid-community/core";
import { EmptyState } from "@/components/ui/empty-state";

interface EnterpriseGridProps<T extends object> {
  rows: T[];
  columns: ColDef<T>[];
  height?: number;
  emptyTitle?: string;
  onSelectionChanged?: (rows: T[]) => void;
}

export function EnterpriseGrid<T extends object>({ rows, columns, height = 460, emptyTitle = "No rows found", onSelectionChanged }: EnterpriseGridProps<T>) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description="Adjust filters or create a new record to continue." />;
  }

  function onGridReady(event: GridReadyEvent<T>) {
    event.api.sizeColumnsToFit();
  }

  function handleSelectionChanged(event: { api: { getSelectedRows: () => T[] } }) {
    onSelectionChanged?.(event.api.getSelectedRows());
  }

  return (
    <div className="ag-theme-quartz ag-theme-rta w-full" style={{ height }}>
      <AgGridReact<T>
        rowData={rows}
        columnDefs={columns}
        modules={[ClientSideRowModelModule]}
        animateRows
        pagination
        paginationPageSize={25}
        rowSelection="multiple"
        suppressRowClickSelection
        enableCellTextSelection
        defaultColDef={{
          sortable: true,
          filter: true,
          resizable: true,
          minWidth: 120
        }}
        onGridReady={onGridReady}
        onSelectionChanged={handleSelectionChanged}
      />
    </div>
  );
}
