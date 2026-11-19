'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }[size];

  return (
    <div className={`flex flex-col items-center justify-center p-6 gap-2 text-[#6B7890] ${className}`}>
      <Loader2 className={`animate-spin text-[#1455C0] ${sizeClasses}`} />
      {text && <span className="text-xs font-medium animate-pulse">{text}</span>}
    </div>
  );
};

export const CardSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => {
  return (
    <div className="bg-white border border-[#E3E8F0] rounded-xl p-5 space-y-4 animate-pulse">
      <div className="h-4 bg-slate-200 rounded-md w-1/3" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-3 bg-slate-100 rounded-md w-full" />
        ))}
      </div>
    </div>
  );
};
