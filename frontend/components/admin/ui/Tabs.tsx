'use client';

import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'pill' | 'underline';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'pill',
  className = ''
}) => {
  if (variant === 'underline') {
    return (
      <div className={`border-b border-[#E3E8F0] flex gap-6 text-xs font-semibold ${className}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`pb-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-[#1455C0] text-[#1455C0]'
                  : 'border-transparent text-[#6B7890] hover:text-[#172B4D] hover:border-slate-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-[#1455C0]/10 text-[#1455C0]' : 'bg-slate-100 text-[#6B7890]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-1.5 bg-[#F1F4F9] p-1 rounded-xl w-fit ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              isActive
                ? 'bg-white text-[#172B4D] shadow-xs'
                : 'text-[#6B7890] hover:text-[#172B4D] hover:bg-white/50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-[#1455C0] text-white' : 'bg-slate-200 text-[#6B7890]'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
