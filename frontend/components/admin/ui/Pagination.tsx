'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';

/* =========================================================================
 * 1. PAGINATION
 * ========================================================================= */
export interface PaginationProps {
  currentPage: number;
  totalEntries: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalEntries,
  pageSize = 10,
  onPageChange,
  className = ''
}) => {
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const startEntry = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(currentPage * pageSize, totalEntries);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6B7890] pt-3 ${className}`}
    >
      <div>
        Showing <span className="font-semibold text-[#172B4D]">{startEntry}</span> to{' '}
        <span className="font-semibold text-[#172B4D]">{endEntry}</span> of{' '}
        <span className="font-semibold text-[#172B4D]">{totalEntries}</span> entries
      </div>

      <div className="flex items-center space-x-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-2.5 py-1 text-[#6B7890] border border-[#E3E8F0] rounded-md text-[11px] hover:bg-[#F6F8FC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
        >
          <ChevronLeft className="w-3 h-3" />
          <span>Previous</span>
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
          // Show first, last, and pages around current
          if (p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)) {
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`w-7 h-7 rounded-md text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center ${
                  currentPage === p
                    ? 'bg-[#1455C0] text-white shadow-xs'
                    : 'text-[#172B4D] hover:bg-[#F6F8FC] border border-[#E3E8F0]'
                }`}
              >
                {p}
              </button>
            );
          } else if (p === currentPage - 2 || p === currentPage + 2) {
            return (
              <span key={p} className="px-1 text-[#9AA5B8] text-[11px]">
                ...
              </span>
            );
          }
          return null;
        })}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-2.5 py-1 text-[#6B7890] border border-[#E3E8F0] rounded-md text-[11px] hover:bg-[#F6F8FC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
        >
          <span>Next</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

/* =========================================================================
 * 2. LOADING STATE
 * ========================================================================= */
export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  className = ''
}) => {
  return (
    <div className={`p-12 text-center flex flex-col items-center justify-center space-y-3 ${className}`}>
      <span className="w-6 h-6 rounded-full border-2 border-[#1455C0] border-t-transparent animate-spin" />
      <p className="text-xs font-medium text-[#6B7890]">{message}</p>
    </div>
  );
};

/* =========================================================================
 * 3. ERROR STATE
 * ========================================================================= */
export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'An error occurred',
  message,
  onRetry,
  className = ''
}) => {
  return (
    <div className={`p-6 rounded-xl bg-[#FDF0F0] border border-[#F9C6C7] text-left space-y-3 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#E5484D] shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-xs font-bold text-[#E5484D]">{title}</h4>
          <p className="text-xs text-[#172B4D] mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <div className="pt-1">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#F9C6C7] rounded-lg text-xs font-semibold text-[#E5484D] hover:bg-[#FDF0F0] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Try Again</span>
          </button>
        </div>
      )}
    </div>
  );
};
