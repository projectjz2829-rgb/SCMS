import React from 'react';

export interface Column<T> {
  header: string;
  accessor?: keyof T | ((row: T) => React.ReactNode);
  align?: 'left' | 'center' | 'right';
  width?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

interface BulkEntryTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  loading?: boolean;
  emptyState?: React.ReactNode;
  loadingSkeleton?: React.ReactNode;
}

export function BulkEntryTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyState,
  loadingSkeleton,
}: BulkEntryTableProps<T>) {
  if (loading) {
    return <>{loadingSkeleton || <div className="p-8 text-center text-slate-400">Loading...</div>}</>;
  }

  if (!data || data.length === 0) {
    return <>{emptyState || <div className="p-8 text-center text-slate-400">No records found</div>}</>;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {columns.map((col, idx) => {
                const alignClass =
                  col.align === 'center'
                    ? 'text-center'
                    : col.align === 'right'
                    ? 'text-right'
                    : 'text-left';
                return (
                  <th
                    key={idx}
                    className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${alignClass}`}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {col.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((row, index) => (
              <tr key={keyExtractor(row, index)} className="hover:bg-slate-50/60 transition-colors">
                {columns.map((col, cIdx) => {
                  const alignClass =
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'right'
                      ? 'text-right'
                      : 'text-left';

                  let content: React.ReactNode = null;
                  if (col.render) {
                    content = col.render(row, index);
                  } else if (typeof col.accessor === 'function') {
                    content = col.accessor(row);
                  } else if (col.accessor) {
                    content = String(row[col.accessor] ?? '');
                  }

                  return (
                    <td key={cIdx} className={`px-4 py-3.5 ${alignClass}`}>
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
