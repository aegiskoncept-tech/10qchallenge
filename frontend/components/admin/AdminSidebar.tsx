'use client';

import React from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  ClipboardList,
  BookMarked,
  HelpCircle,
  Video,
  FileText,
  Ticket,
  Bell,
  Edit3,
  Globe,
  MessageSquare,
  FileCheck,
  Receipt,
  ChevronDown,
  ChevronRight,
  X
} from 'lucide-react';

export interface NavItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  hasSub?: boolean;
  subItems?: { id: string; name: string }[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    title: 'MAIN',
    items: [
      {
        id: 'Dashboard',
        name: 'Dashboard',
        icon: LayoutDashboard,
        badge: 'Live',
        badgeColor: 'bg-[#E9F8F1] text-[#16A36A] border-[#B2EAD0]'
      }
    ]
  },
  {
    title: 'ACADEMIC MANAGEMENT',
    items: [
      {
        id: 'Exam Master',
        name: 'Exam Master',
        icon: GraduationCap
      },
      {
        id: 'Course Master',
        name: 'Course Master',
        icon: BookOpen
      },
      {
        id: 'Subject Master',
        name: 'Subject Master',
        icon: ClipboardList
      },
      {
        id: 'Chapter Management',
        name: 'Chapter Management',
        icon: BookMarked,
        hasSub: true,
        subItems: [
          { id: 'Chapter Master', name: 'Chapter Master' },
          { id: 'Chapter Topic Master', name: 'Chapter Topic Master' }
        ]
      },
      {
        id: 'Question Management',
        name: 'Question Management',
        icon: HelpCircle,
        hasSub: true,
        subItems: [
          { id: 'Objective Question', name: 'Objective Question' },
          { id: 'Numerical Question', name: 'Numerical Question' }
        ]
      }
    ]
  },
  {
    title: 'CONTENT MANAGEMENT',
    items: [
      {
        id: 'Video Master',
        name: 'Video Master',
        icon: Video
      },
      {
        id: 'Document Master',
        name: 'Document Master',
        icon: FileText
      }
    ]
  },
  {
    title: 'BUSINESS MANAGEMENT',
    items: [
      {
        id: 'Coupon',
        name: 'Coupon',
        icon: Ticket
      },
      {
        id: 'Notification',
        name: 'Notification',
        icon: Bell
      },
      {
        id: 'Blog Master',
        name: 'Blog Master',
        icon: Edit3
      },
      {
        id: 'SEO Page',
        name: 'SEO Page',
        icon: Globe
      }
    ]
  },
  {
    title: 'MISCELLANEOUS',
    items: [
      {
        id: 'Student Doubt',
        name: 'Student Doubt',
        icon: MessageSquare
      },
      {
        id: 'Student Attempted Test',
        name: 'Student Attempted Test',
        icon: FileCheck
      },
      {
        id: 'Student Invoices',
        name: 'Student Invoices',
        icon: Receipt
      }
    ]
  }
];

export interface AdminSidebarProps {
  activeTab: string;
  onSelectTab: (tabName: string) => void;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  counts?: Record<string, number>;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
  counts = {}
}) => {
  const [expandedMenus, setExpandedMenus] = React.useState<Record<string, boolean>>({
    'Chapter Management': true,
    'Question Management': true
  });

  const toggleSubmenu = (menuName: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  const isItemActive = (item: NavItem): boolean => {
    if (activeTab === item.name || activeTab === item.id) return true;
    if (item.subItems) {
      return item.subItems.some((s) => s.name === activeTab || s.id === activeTab);
    }
    return false;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#FFFFFF] border-r border-[#E3E8F0] select-none">
      {/* BRAND HEADER */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#E3E8F0] shrink-0 bg-white">
        <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-[#14233F] text-[#F6F8FC] flex items-center justify-center font-black text-sm tracking-tighter shrink-0 shadow-xs border border-[#14233F]">
            10Q
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[#172B4D] text-sm tracking-tight truncate">
                  10Q Challenge
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wider bg-[#1455C0] text-white">
                  LMS
                </span>
              </div>
              <p className="text-[10px] text-[#6B7890] font-medium truncate">
                Admin Control Hub
              </p>
            </div>
          )}
        </Link>
        {isMobileOpen && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 text-[#6B7890] hover:text-[#172B4D] hover:bg-[#F6F8FC] rounded-lg cursor-pointer md:hidden"
            title="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* NAVIGATION ITEMS LIST */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            {!isCollapsed ? (
              <div className="px-2 pb-1 text-[10px] font-bold tracking-wider text-[#9AA5B8] uppercase">
                {group.title}
              </div>
            ) : (
              <div className="py-1 text-center text-[10px] text-[#9AA5B8] font-bold">•</div>
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item);
                const isExpanded = Boolean(expandedMenus[item.name]);
                const count = counts[item.name];

                if (item.hasSub) {
                  return (
                    <div key={item.id} className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => toggleSubmenu(item.name)}
                        title={isCollapsed ? item.name : undefined}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer group ${
                          active
                            ? 'bg-[#14233F] text-white shadow-2xs'
                            : 'text-[#172B4D] hover:bg-[#F6F8FC] hover:text-[#1455C0]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              active ? 'text-white' : 'text-[#6B7890] group-hover:text-[#1455C0]'
                            }`}
                          />
                          {!isCollapsed && (
                            <span className="truncate">{item.name}</span>
                          )}
                        </div>

                        {!isCollapsed && (
                          <span className={`text-[#6B7890] ${active ? 'text-white' : ''}`}>
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </span>
                        )}
                      </button>

                      {/* SUBITEMS */}
                      {isExpanded && !isCollapsed && item.subItems && (
                        <div className="pl-6 pr-1 py-0.5 space-y-0.5 border-l-2 border-[#EDF1F7] ml-4 mt-0.5">
                          {item.subItems.map((sub) => {
                            const subActive = activeTab === sub.name || activeTab === sub.id;
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => {
                                  onSelectTab(sub.name);
                                  onCloseMobile();
                                }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center justify-between ${
                                  subActive
                                    ? 'bg-[#1455C0] text-white font-semibold shadow-2xs'
                                    : 'text-[#6B7890] hover:text-[#172B4D] hover:bg-[#F6F8FC]'
                                }`}
                              >
                                <span className="truncate">{sub.name}</span>
                                {subActive && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // Regular Single Nav Item
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.name);
                      onCloseMobile();
                    }}
                    title={isCollapsed ? item.name : undefined}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer group ${
                      active
                        ? 'bg-[#14233F] text-white shadow-2xs'
                        : 'text-[#172B4D] hover:bg-[#F6F8FC] hover:text-[#1455C0]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          active ? 'text-white' : 'text-[#6B7890] group-hover:text-[#1455C0]'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">{item.name}</span>}
                    </div>

                    {!isCollapsed && (
                      <div className="flex items-center gap-1.5">
                        {count !== undefined && count > 0 && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${
                              active ? 'bg-white/20 text-white' : 'bg-[#F6F8FC] text-[#6B7890] border border-[#E3E8F0]'
                            }`}
                          >
                            {count}
                          </span>
                        )}
                        {item.badge && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${item.badgeColor || ''}`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER USER SUMMARY */}
      <div className="p-3 border-t border-[#E3E8F0] bg-[#FAFCFF] shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-[#1455C0] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
            HJ
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden leading-tight flex-1">
              <p className="text-xs font-bold text-[#172B4D] truncate">Harshal Jain</p>
              <p className="text-[10px] text-[#16A36A] font-semibold truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A36A]" />
                Online Administrator
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside
        className={`hidden md:block shrink-0 transition-all duration-200 ease-in-out h-screen sticky top-0 z-30 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* MOBILE DRAWER */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#14233F]/50 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
          />
          {/* Slide-over Container */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
