import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  /** Extra classes applied to both the header cell and body cells. */
  className?: string;
  /** Drop the column entirely (e.g. an actions column the user can't use). */
  hidden?: boolean;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  /** Minimum table width before horizontal scrolling kicks in. */
  minWidth?: number;
};

const alignClass = {
  left: "text-left",
  right: "text-right",
  center: "text-center"
} as const;

/**
 * Consistent, responsive table for admin list pages. Columns declare how each
 * cell renders, so pages stay declarative and share the same look.
 */
export function DataTable<T>({ columns, rows, getRowKey, minWidth = 720 }: DataTableProps<T>) {
  const visible = columns.filter((column) => !column.hidden);

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          <thead>
            <tr className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              {visible.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 font-medium",
                    alignClass[column.align ?? "left"],
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getRowKey(row)} className="border-b last:border-0 transition hover:bg-muted/40">
                {visible.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-4 py-3 align-middle",
                      alignClass[column.align ?? "left"],
                      column.className
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
