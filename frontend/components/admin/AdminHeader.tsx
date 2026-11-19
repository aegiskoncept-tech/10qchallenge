'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Menu,
  Maximize2,
  Minimize2,
  ExternalLink,
  LogOut,
  User,
  Shield,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export interface AdminHeaderProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMobile: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  isCollapsed,
  onToggleCollapse,
  onOpenMobile
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleSignOut = () => {
    if (logout) {
      logout();
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('10q_auth_user_fresh_v1');
        localStorage.removeItem('10q_user');
      }
    }
    router.push('/login');
  };

  // Derive human-readable page name from path
  const getPageTitle = () => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length <= 1 || segments[1] === 'dashboard') return 'Dashboard Overview';
    const last = segments[1];
    return last
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const adminName = user?.fullName || 'Master Administrator';
  const adminEmail = user?.email || 'admin@10qchallenge.in';
  const initials = adminName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'AD';

  return (
    <header className="h-16 bg-white border-b border-[#E3E8F0] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Left: Mobile hamburger & breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-lg text-[#6B7890] hover:text-[#172B4D] hover:bg-[#F6F8FC] cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex p-2 rounded-lg text-[#6B7890] hover:text-[#172B4D] hover:bg-[#F6F8FC] cursor-pointer"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold">
          <Link href="/admin/dashboard" className="text-[#6B7890] hover:text-[#1455C0] transition-colors">
            Admin
          </Link>
          <span className="text-[#CBD5E1]">/</span>
          <span className="text-[#172B4D] font-bold">{getPageTitle()}</span>
        </div>
      </div>

      {/* Right: Quick actions & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* View public website link */}
        <Link
          href="/"
          target="_blank"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-[#6B7890] hover:text-[#172B4D] hover:bg-[#F6F8FC] border border-transparent hover:border-[#E3E8F0] transition-all"
        >
          <span>View Site</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>

        {/* Fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg text-[#6B7890] hover:text-[#172B4D] hover:bg-[#F6F8FC] cursor-pointer transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Status Pill */}
        <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Active</span>
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[#F6F8FC] cursor-pointer transition-all border border-transparent hover:border-[#E3E8F0]"
            aria-expanded={profileDropdownOpen}
            aria-label="User profile menu"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#1455C0] to-blue-500 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
              {initials}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-[#172B4D] leading-tight truncate max-w-[120px]">
                {adminName}
              </span>
              <span className="text-[10px] font-semibold text-[#6B7890]">Administrator</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#9AA5B8] hidden sm:block" />
          </button>

          {/* Dropdown Menu */}
          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-[#E3E8F0] shadow-xl py-2 z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-2.5 border-b border-[#EDF1F7]">
                <p className="font-bold text-[#172B4D]">{adminName}</p>
                <p className="text-[11px] text-[#6B7890] truncate mt-0.5">{adminEmail}</p>
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                  <Shield className="w-3 h-3 text-amber-600" />
                  <span>Full Administrative Access</span>
                </div>
              </div>

              <div className="py-1">
                <Link
                  href="/admin/dashboard"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-[#172B4D] hover:bg-[#F6F8FC] transition-colors"
                >
                  <User className="w-4 h-4 text-[#6B7890]" />
                  <span>Admin Dashboard</span>
                </Link>
                <Link
                  href="/"
                  target="_blank"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-[#172B4D] hover:bg-[#F6F8FC] transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-[#6B7890]" />
                  <span>View Public LMS</span>
                </Link>
              </div>

              <div className="pt-1 border-t border-[#EDF1F7]">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 transition-colors text-left font-semibold cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
