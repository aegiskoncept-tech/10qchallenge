'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-[#6B7890] ${className}`}>
      <ol className="flex items-center space-x-1.5 flex-wrap">
        <li className="flex items-center">
          <Link
            href="/admin"
            className="hover:text-[#172B4D] transition-colors flex items-center gap-1 text-[#6B7890]"
            title="Admin Home"
          >
            <Home className="w-3.5 h-3.5 text-[#6B7890]" />
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center space-x-1.5">
              <ChevronRight className="w-3 h-3 text-[#9AA5B8] shrink-0" />
              {isLast || (!item.href && !item.onClick) ? (
                <span className={`font-semibold ${isLast ? 'text-[#172B4D]' : 'text-[#6B7890]'}`}>
                  {item.label}
                </span>
              ) : item.onClick ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="hover:text-[#1455C0] transition-colors cursor-pointer text-[#6B7890]"
                >
                  {item.label}
                </button>
              ) : (
                <Link
                  href={item.href || '#'}
                  className="hover:text-[#1455C0] transition-colors text-[#6B7890]"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
  badge,
  className = ''
}) => {
  return (
    <div className={`space-y-1.5 mb-6 ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} className="mb-2" />
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172B4D]">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-[#6B7890] mt-0.5 max-w-3xl">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">{actions}</div>}
      </div>
    </div>
  );
};
