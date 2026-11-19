'use client';

import React from 'react';

/* =========================================================================
 * 1. FORM SECTION
 * ========================================================================= */
export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  actions,
  className = ''
}) => {
  return (
    <div className={`bg-white border border-[#E3E8F0] rounded-xl shadow-subtle p-5 sm:p-6 space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EDF1F7] gap-2">
        <div>
          <h2 className="text-sm font-bold text-[#172B4D]">{title}</h2>
          {description && (
            <p className="text-xs text-[#6B7890] mt-0.5">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
};

/* =========================================================================
 * 2. FORM FIELD
 * ========================================================================= */
export interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  helperText,
  description,
  children,
  className = '',
  htmlFor
}) => {
  const displayHelper = helperText || description;
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={htmlFor}
          className="block text-xs font-semibold text-[#172B4D]"
        >
          {label} {required && <span className="text-[#E5484D]">*</span>}
        </label>
        {displayHelper && !error && (
          <span className="text-[11px] text-[#9AA5B8]">{displayHelper}</span>
        )}
      </div>
      <div>{children}</div>
      {error && (
        <p className="text-[11px] text-[#E5484D] font-medium mt-0.5">{error}</p>
      )}
    </div>
  );
};
