'use client';

import React from 'react';
import { LucideIcon, Inbox, AlertTriangle, X } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from './Buttons';

/* =========================================================================
 * 1. EMPTY STATE
 * ========================================================================= */
export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className = ''
}) => {
  return (
    <div className={`p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-md mx-auto ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-[#F6F8FC] border border-[#E3E8F0] flex items-center justify-center text-[#6B7890] mb-3 shadow-2xs">
        <Icon className="w-6 h-6 text-[#6B7890]" />
      </div>
      <h3 className="text-sm sm:text-base font-bold text-[#172B4D] mb-1">
        {title}
      </h3>
      <p className="text-xs text-[#6B7890] leading-relaxed mb-4">
        {description}
      </p>
      {actionLabel && onAction && (
        <PrimaryButton size="sm" onClick={onAction}>
          {actionLabel}
        </PrimaryButton>
      )}
    </div>
  );
};

/* =========================================================================
 * 2. STATUS BADGE
 * ========================================================================= */
export type StatusBadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'active' | 'inactive';

export interface StatusBadgeProps {
  status?: boolean | string;
  variant?: StatusBadgeVariant;
  label?: string;
  dot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
  label,
  dot = true,
  className = ''
}) => {
  // Determine variant if boolean status passed
  let resolvedVariant: StatusBadgeVariant = variant || 'neutral';
  let resolvedLabel = label;

  if (typeof status === 'boolean') {
    resolvedVariant = status ? 'success' : 'neutral';
    if (!resolvedLabel) resolvedLabel = status ? 'Active' : 'Inactive';
  } else if (typeof status === 'string' && !variant) {
    const s = status.toLowerCase();
    if (s === 'active' || s === 'published' || s === 'completed' || s === 'live') resolvedVariant = 'success';
    else if (s === 'pending' || s === 'warning' || s === 'in progress') resolvedVariant = 'warning';
    else if (s === 'failed' || s === 'danger' || s === 'rejected' || s === 'error') resolvedVariant = 'danger';
    else if (s === 'draft' || s === 'inactive' || s === 'archived') resolvedVariant = 'neutral';
    else resolvedVariant = 'info';
    if (!resolvedLabel) resolvedLabel = status;
  }

  const styles = {
    success: 'bg-[#E9F8F1] text-[#16A36A] border-[#B2EAD0]',
    warning: 'bg-[#FEF8EC] text-[#E6A23C] border-[#FBDCA6]',
    danger: 'bg-[#FDF0F0] text-[#E5484D] border-[#F9C6C7]',
    info: 'bg-[#EDF5FD] text-[#2075E8] border-[#B8D8FA]',
    neutral: 'bg-[#F6F8FC] text-[#6B7890] border-[#E3E8F0]',
    active: 'bg-[#E9F8F1] text-[#16A36A] border-[#B2EAD0]',
    inactive: 'bg-[#F6F8FC] text-[#6B7890] border-[#E3E8F0]'
  }[resolvedVariant];

  const dotColors = {
    success: 'bg-[#16A36A]',
    warning: 'bg-[#E6A23C]',
    danger: 'bg-[#E5484D]',
    info: 'bg-[#2075E8]',
    neutral: 'bg-[#9AA5B8]',
    active: 'bg-[#16A36A]',
    inactive: 'bg-[#9AA5B8]'
  }[resolvedVariant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${styles} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors}`} />}
      <span>{resolvedLabel || '—'}</span>
    </span>
  );
};

/* =========================================================================
 * 3. CONFIRM DIALOG
 * ========================================================================= */
export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#14233F]/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-[#E3E8F0] shadow-elevated max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDestructive
                  ? 'bg-[#FDF0F0] text-[#E5484D] border border-[#F9C6C7]'
                  : 'bg-[#FEF8EC] text-[#E6A23C] border border-[#FBDCA6]'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#172B4D]">{title}</h3>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-[#9AA5B8] hover:text-[#172B4D] rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#6B7890] leading-relaxed">
          {message}
        </p>

        <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EDF1F7]">
          <SecondaryButton size="sm" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </SecondaryButton>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-semibold rounded-lg text-white transition-colors cursor-pointer disabled:opacity-50 ${
              isDestructive
                ? 'bg-[#E5484D] hover:bg-[#D43F44]'
                : 'bg-[#1455C0] hover:bg-[#0F449E]'
            }`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
