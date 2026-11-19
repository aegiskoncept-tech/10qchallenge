'use client';

import React from 'react';
import { Info, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

export type AlertType = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  type?: AlertType;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  onClose,
  className = ''
}) => {
  const configs = {
    info: {
      bg: 'bg-blue-50/80',
      border: 'border-blue-200',
      text: 'text-blue-900',
      icon: <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
    },
    success: {
      bg: 'bg-emerald-50/80',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
    },
    warning: {
      bg: 'bg-amber-50/80',
      border: 'border-amber-200',
      text: 'text-amber-900',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
    },
    error: {
      bg: 'bg-rose-50/80',
      border: 'border-rose-200',
      text: 'text-rose-900',
      icon: <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
    }
  }[type];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border ${configs.bg} ${configs.border} ${configs.text} text-xs ${className}`}
    >
      {configs.icon}
      <div className="flex-1 min-w-0">
        {title && <h5 className="font-bold text-xs mb-0.5">{title}</h5>}
        <div className="leading-relaxed opacity-90">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-0.5 rounded-lg transition-colors cursor-pointer"
          aria-label="Dismiss alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
