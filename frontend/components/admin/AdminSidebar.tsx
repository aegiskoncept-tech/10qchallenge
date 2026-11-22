'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  ClipboardList,
  BookMarked,
  Layers,
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
  Clock,
  RotateCcw,
  Building,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  Users,
  CreditCard,
  Settings,
  UserCog
} from 'lucide-react';

export interface NavItem {
  id: string;
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: 'success' | 'warning' | 'info' | 'neutral';
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
        href: '/admin/dashboard',
        icon: LayoutDashboard,
        badge: 'Live',
        badgeVariant: 'success'
      },
      {
        id: 'Audit Logs',
        name: 'Audit Logs',
        href: '/admin/audit-logs',
        icon: Shield
      }
    ]
  },
  {
    title: 'ACADEMIC MANAGEMENT',
    items: [
      {
        id: 'Exam Master',
        name: 'Exam Master',
        href: '/admin/exams',
        icon: GraduationCap
      },
      {
        id: 'Course Master',
        name: 'Course Master',
        href: '/admin/courses',
        icon: BookOpen
      },
      {
        id: 'Subject Master',
        name: 'Subject Master',
        href: '/admin/subjects',
        icon: ClipboardList
      },
      {
        id: 'Chapter Management',
        name: 'Chapter Management',
        href: '/admin/chapters',
        icon: BookMarked
      },
      {
        id: 'Topic Master',
        name: 'Topic Master',
        href: '/admin/topics',
        icon: Layers
      },
      {
        id: 'Question Management',
        name: 'Question Management',
        href: '/admin/questions',
        icon: HelpCircle
      }
    ]
  },
  {
    title: 'CONTENT & ASSESSMENTS',
    items: [
      {
        id: 'Video Master',
        name: 'Video Master',
        href: '/admin/videos',
        icon: Video
      },
      {
        id: 'Document Master',
        name: 'Document Master',
        href: '/admin/documents',
        icon: FileText
      },
      {
        id: 'Test Series',
        name: 'Test Series',
        href: '/admin/test-series',
        icon: FileCheck
      }
    ]
  },
  {
    title: 'GROWTH & STUDENTS',
    items: [
      {
        id: 'Student Directory',
        name: 'Student Directory',
        href: '/admin/students',
        icon: Users
      },
      {
        id: 'Coupon',
        name: 'Coupon',
        href: '/admin/coupons',
        icon: Ticket
      },
      {
        id: 'Notification',
        name: 'Notification',
        href: '/admin/notifications',
        icon: Bell
      },
      {
        id: 'Blog Master',
        name: 'Blog Master',
        href: '/admin/blogs',
        icon: Edit3
      },
      {
        id: 'SEO Page',
        name: 'SEO Page',
        href: '/admin/seo',
        icon: Globe
      },
      {
        id: 'Student Doubt',
        name: 'Student Doubt',
        href: '/admin/doubts',
        icon: MessageSquare
      },
      {
        id: 'Student Attempted Test',
        name: 'Student Attempted Test',
        href: '/admin/attempted-tests',
        icon: Clock
      },
      {
        id: 'Orders',
        name: 'Orders',
        href: '/admin/orders',
        icon: CreditCard
      },
      {
        id: 'Payments Ledger',
        name: 'Payments Ledger',
        href: '/admin/payments',
        icon: Receipt
      },
      {
        id: 'Refunds Queue',
        name: 'Refunds Queue',
        href: '/admin/refunds',
        icon: RotateCcw
      },
      {
        id: 'Settlement & Rec',
        name: 'Settlement & Rec',
        href: '/admin/settlements',
        icon: Building
      },
      {
        id: 'Student Invoices',
        name: 'Student Invoices',
        href: '/admin/invoices',
        icon: Receipt
      }
    ]
  },
  {
    title: 'SYSTEM & SETTINGS',
    items: [
      {
        id: 'Admin Roles',
        name: 'Admin Roles',
        href: '/admin/roles',
        icon: UserCog
      },
      {
        id: 'Platform Settings',
        name: 'Platform Settings',
        href: '/admin/settings',
        icon: Settings
      }
    ]
  }
];

export interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  counts?: Record<string, number>;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  counts = {}
}) => {
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return pathname === '/admin/dashboard' || pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
            10Q
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black tracking-wider text-white uppercase truncate">
                10Q Challenge
              </span>
              <span className="text-[10px] font-semibold text-amber-400 tracking-wider uppercase">
                LMS Admin Panel
              </span>
            </div>
          )}
        </Link>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            {!isCollapsed && (
              <h4 className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                {group.title}
              </h4>
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.href);

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => {
                      if (isMobileOpen) onCloseMobile();
                    }}
                    title={isCollapsed ? item.name : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${active
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                      }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform ${active ? 'text-slate-950' : 'text-slate-400 group-hover:text-amber-400'
                        }`}
                    />
                    {!isCollapsed && (
                      <span className="truncate flex-1">{item.name}</span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${active
                          ? 'bg-slate-900 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer System Pill & Collapse Toggle */}
      <div className="p-3 border-t border-slate-800 shrink-0 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="flex items-center gap-2 px-2 py-1 text-[11px] text-slate-400 font-medium">
            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Production v2.0</span>
          </div>
        ) : (
          <div className="w-full flex justify-center py-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" title="Production v2.0" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-200 z-30 ${isCollapsed ? 'w-20' : 'w-64'
          }`}
      >
        <div className={`fixed top-0 bottom-0 left-0 transition-all duration-200 ${isCollapsed ? 'w-20' : 'w-64'
          }`}>
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-200 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};
