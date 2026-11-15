'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const PrimaryButton: React.FC<ButtonProps> = ({
  children,
  icon,
  iconPosition = 'left',
  isLoading = false,
  size = 'md',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-xs font-semibold',
    lg: 'px-5 py-2.5 text-sm font-semibold'
  }[size];

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-[#1455C0] hover:bg-[#0F449E] text-white focus:outline-none focus:ring-2 focus:ring-[#1455C0]/20 ${
        fullWidth ? 'w-full' : ''
      } ${sizeClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : icon && iconPosition === 'left' ? (
        icon
      ) : null}
      <span>{children}</span>
      {!isLoading && icon && iconPosition === 'right' ? icon : null}
    </button>
  );
};

export const SecondaryButton: React.FC<ButtonProps> = ({
  children,
  icon,
  iconPosition = 'left',
  isLoading = false,
  size = 'md',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-xs font-semibold',
    lg: 'px-5 py-2.5 text-sm font-semibold'
  }[size];

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-[#F6F8FC] text-[#172B4D] border border-[#E3E8F0] hover:border-[#CBD5E1] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1455C0]/10 ${
        fullWidth ? 'w-full' : ''
      } ${sizeClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6B7890]" />
      ) : icon && iconPosition === 'left' ? (
        icon
      ) : null}
      <span>{children}</span>
      {!isLoading && icon && iconPosition === 'right' ? icon : null}
    </button>
  );
};
