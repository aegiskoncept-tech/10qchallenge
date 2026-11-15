'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onClear?: () => void;
  autoFocus?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search records...',
  className = '',
  onClear,
  autoFocus = false
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="w-3.5 h-3.5 text-[#6B7890] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full pl-9 pr-8 py-2 bg-white border border-[#E3E8F0] hover:border-[#CBD5E1] rounded-lg text-xs text-[#172B4D] placeholder-[#9AA5B8] focus:outline-none focus:border-[#1455C0] focus:ring-2 focus:ring-[#1455C0]/10 transition-colors shadow-2xs"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            if (onClear) onClear();
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#9AA5B8] hover:text-[#172B4D] rounded cursor-pointer"
          title="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  children,
  className = '',
  actions
}) => {
  return (
    <div
      className={`bg-white border border-[#E3E8F0] rounded-xl p-4 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
        {children}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#EDF1F7]">
          {actions}
        </div>
      )}
    </div>
  );
};
