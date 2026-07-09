import { AgGridReact } from "@ag-grid-community/react";
import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
import type { ColDef, GetRowIdParams, GridReadyEvent, RowClassParams, RowDoubleClickedEvent } from "@ag-grid-community/core";
import { type MutableRefObject, useCallback, useRef } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export interface EnterpriseGridProps<T extends object> {
  rows: T[];
  columns: ColDef<T>[];
  height?: number | string;
  rowHeight?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  onSelectionChanged?: (rows: T[]) => void;
  onRowDoubleClicked?: (row: T) => void;
  onContextMenu?: (row: T, event: MouseEvent) => void;
  getRowId?: (params: GetRowIdParams<T>) => string;
  groupBy?: string[];
  showFooter?: boolean;
  footerRow?: Record<string, string | number>;
  pagination?: boolean;
  paginationPageSize?: number;
  suppressPagination?: boolean;
  gridRef?: MutableRefObject<AgGridReact<T> | null>;
  rowClassRules?: Record<string, ((params: RowClassParams<T>) => boolean)>;
  loading?: boolean;
  maxHeightEnabled?: boolean;
}

export function EnterpriseGrid<T extends object>({
  rows,
  columns,
  height = 480,
  rowHeight = 36,
  emptyTitle = "No records found",
  emptyDescription = "Adjust your filters or create a new record to get started.",
  onSelectionChanged,
  onRowDoubleClicked,
  onContextMenu,
  getRowId,
  groupBy,
  showFooter = false,
  footerRow,
  pagination = true,
  paginationPageSize = 25,
  suppressPagination = false,
  gridRef: externalGridRef,
  rowClassRules,
  loading = false,
  maxHeightEnabled = false
}: EnterpriseGridProps<T>) {
  const gridRef = externalGridRef ?? useRef<AgGridReact<T> | null>(null);
  const handleGridReady = useCallback((event: GridReadyEvent<T>) => {
    event.api.sizeColumnsToFit();
  }, []);

  const handleSelectionChanged = useCallback(() => {
    if (!onSelectionChanged || !gridRef.current) return;
    onSelectionChanged(gridRef.current.api.getSelectedRows());
  }, [onSelectionChanged, gridRef]);

  const handleRowDoubleClicked = useCallback((event: RowDoubleClickedEvent<T>) => {
    if (event.data) onRowDoubleClicked?.(event.data);
  }, [onRowDoubleClicked]);

  const defaultColDef: ColDef<T> = {
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 100,
    cellClass: "ag-cell-rta",
    headerClass: "ag-header-rta"
  };

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const style: React.CSSProperties = maxHeightEnabled
    ? { maxHeight: height, height: "auto" }
    : { height };

  return (
    <div className="ag-theme-quartz ag-theme-rta w-full" style={style}>
      <AgGridReact<T>
        ref={gridRef}
        rowData={rows}
        columnDefs={columns}
        modules={[ClientSideRowModelModule]}
        animateRows
        pagination={pagination && !suppressPagination}
        paginationPageSize={paginationPageSize}
        rowSelection="multiple"
        suppressRowClickSelection
        enableCellTextSelection
        rowHeight={rowHeight}
        headerHeight={36}
        getRowId={getRowId}
        rowClassRules={rowClassRules}
        defaultColDef={defaultColDef}
        onGridReady={handleGridReady}
        onSelectionChanged={handleSelectionChanged}
        onRowDoubleClicked={handleRowDoubleClicked}
        groupDisplayType={groupBy?.length ? "singleColumn" : undefined}
        groupDefaultExpanded={-1}
        onCellContextMenu={(event) => {
          if (onContextMenu && event.data && event.event) {
            onContextMenu(event.data, event.event as unknown as MouseEvent);
          }
        }}
        ensureDomOrder
        suppressMovableColumns={false}
        suppressColumnVirtualisation={false}
        overlayLoadingTemplate='<span class="ag-overlay-loading-center">Loading...</span>'
        overlayNoRowsTemplate='<span class="ag-overlay-loading-center">No data available</span>'
      />
      {showFooter && footerRow && (
        <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-xs font-medium">
          {Object.entries(footerRow).map(([key, value]) => (
            <span key={key}>{key}: {value}</span>
          ))}
        </div>
      )}
    </div>
  );
}