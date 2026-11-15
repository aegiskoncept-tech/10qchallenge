'use client';

import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  sortColumn,
  sortDirection,
  onSort,
  isLoading = false,
  emptyState,
  className = ''
}: DataTableProps<T>) {
  return (
    <div className={`w-full overflow-hidden border border-[#E3E8F0] rounded-xl bg-white shadow-subtle ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#F6F8FC] border-b border-[#E3E8F0] text-[#6B7890] font-bold uppercase text-[11px] tracking-wider select-none">
              {columns.map((col) => {
                const isSorted = sortColumn === col.key;
                const alignClass = {
                  left: 'text-left',
                  center: 'text-center',
                  right: 'text-right'
                }[col.align || 'left'];

                return (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className={`p-3 font-semibold ${alignClass} ${
                      col.sortable ? 'cursor-pointer hover:text-[#172B4D] hover:bg-[#EDF1F7]/60' : ''
                    }`}
                    onClick={() => {
                      if (col.sortable && onSort) onSort(col.key);
                    }}
                  >
                    <div className={`inline-flex items-center gap-1.5 ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : ''}`}>
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-[#9AA5B8]">
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-[#1455C0]" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-[#1455C0]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDF1F7] text-[#172B4D]">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-[#6B7890]">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-[#1455C0] border-t-transparent animate-spin" />
                    <span>Loading records...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-[#6B7890]">
                  {emptyState || 'No records found.'}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={keyExtractor(row, index)}
                  className="hover:bg-[#F6F8FC]/80 transition-colors"
                >
                  {columns.map((col) => {
                    const alignClass = {
                      left: 'text-left',
                      center: 'text-center',
                      right: 'text-right'
                    }[col.align || 'left'];

                    return (
                      <td key={col.key} className={`p-3 ${alignClass}`}>
                        {col.render ? col.render(row, index) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
