'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Maximize2,
  Minimize2,
  ExternalLink,
  LogOut,
  User,
  Shield,
  Layers,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export interface AdminHeaderProps {
  activeTab: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMobile: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  activeTab,
  isCollapsed,
  onToggleCollapse,
  onOpenMobile
}) => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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

  return (
    <header className="h-16 bg-white border-b border-[#E3E8F0] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
      {/* LEFT SECTION: SIDEBAR TOGGLE & CONTEXT */}
      <div className="flex items-center space-x-3">
        {/* Desktop Sidebar Collapse Toggle */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden md:inline-flex p-2 rounded-lg text-[#6B7890] hover:text-[#172B4D] hover:bg-[#F6F8FC] border border-[#E3E8F0] transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Mobile Drawer Open Button */}
        <button
          type="button"
          onClick={onOpenMobile}
          className="inline-flex md:hidden p-2 rounded-lg text-[#6B7890] hover:text-[#172B4D] hover:bg-[#F6F8FC] border border-[#E3E8F0] transition-colors cursor-pointer"
          title="Open navigation menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Active Page Context Breadcrumb / Pill */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="hidden sm:inline text-[#6B7890] font-medium">LMS Administration</span>
          <span className="hidden sm:inline text-[#9AA5B8]">/</span>
          <span className="font-bold text-[#172B4D] bg-[#F6F8FC] px-2.5 py-1 rounded-md border border-[#E3E8F0] text-xs">
            {activeTab}
          </span>
        </div>
      </div>

      {/* RIGHT SECTION: CONTROLS & PROFILE */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-2 rounded-lg text-[#6B7890] hover:text-[#172B4D] hover:bg-[#F6F8FC] border border-[#E3E8F0] transition-colors cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>

        {/* Live Site Shortcut */}
        <Link
          href="/"
          target="_blank"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#172B4D] bg-white hover:bg-[#F6F8FC] border border-[#E3E8F0] transition-colors shadow-3xs"
          title="Open live website in new tab"
        >
          <span>Live Site</span>
          <ExternalLink className="w-3 h-3 text-[#6B7890]" />
        </Link>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-lg border border-[#E3E8F0] hover:bg-[#F6F8FC] transition-colors cursor-pointer text-left"
          >
            <div className="w-7 h-7 rounded-md bg-[#14233F] text-white font-bold text-xs flex items-center justify-center shrink-0">
              HJ
            </div>
            <div className="hidden lg:block leading-tight">
              <p className="text-xs font-bold text-[#172B4D]">Harshal Jain</p>
              <p className="text-[10px] text-[#16A36A] font-semibold">Master Admin</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#6B7890] hidden sm:block" />
          </button>

          {profileDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-dropdown border border-[#E3E8F0] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-3 border-b border-[#EDF1F7] bg-[#FAFCFF] rounded-t-xl">
                  <p className="text-xs font-bold text-[#172B4D]">Harshal Jain</p>
                  <p className="text-[11px] text-[#1455C0] font-semibold flex items-center gap-1 mt-0.5">
                    <Shield className="w-3 h-3" />
                    Master Administrator
                  </p>
                  <p className="text-[10px] text-[#6B7890] truncate mt-1">admin@10qchallenge.in</p>
                </div>

                <div className="py-1">
                  <Link
                    href="/"
                    target="_blank"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-[#172B4D] hover:bg-[#F6F8FC] transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#6B7890]" />
                    <span>View Live Website</span>
                  </Link>
                  <Link
                    href="/student/dashboard"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-[#172B4D] hover:bg-[#F6F8FC] transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#6B7890]" />
                    <span>Inspect Student LMS</span>
                  </Link>
                </div>

                <div className="border-t border-[#EDF1F7] pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleSignOut();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-[#E5484D] hover:bg-[#FDF0F0] font-semibold transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
