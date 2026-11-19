'use client';

import React from 'react';
import {
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
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from './ui/PageHeader';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';

export interface AdminModulePlaceholderProps {
  moduleId: string;
  title: string;
  category: 'Main' | 'Academic Management' | 'Content & Assessments' | 'Growth & Students' | 'Settings';
  hierarchyLevel?: string;
  description: string;
  dbCount?: number;
  dbEntityName?: string;
}

export const AdminModulePlaceholder: React.FC<AdminModulePlaceholderProps> = ({
  moduleId,
  title,
  category,
  hierarchyLevel,
  description,
  dbCount,
  dbEntityName
}) => {
  const getIcon = () => {
    switch (moduleId) {
      case 'exams':
        return <GraduationCap className="w-6 h-6 text-[#1455C0]" />;
      case 'courses':
        return <BookOpen className="w-6 h-6 text-[#1455C0]" />;
      case 'subjects':
        return <ClipboardList className="w-6 h-6 text-[#1455C0]" />;
      case 'chapters':
        return <BookMarked className="w-6 h-6 text-[#1455C0]" />;
      case 'topics':
        return <Layers className="w-6 h-6 text-[#1455C0]" />;
      case 'questions':
        return <HelpCircle className="w-6 h-6 text-[#1455C0]" />;
      case 'videos':
        return <Video className="w-6 h-6 text-[#1455C0]" />;
      case 'documents':
        return <FileText className="w-6 h-6 text-[#1455C0]" />;
      case 'test-series':
        return <FileCheck className="w-6 h-6 text-[#1455C0]" />;
      case 'coupons':
        return <Ticket className="w-6 h-6 text-[#1455C0]" />;
      case 'notifications':
        return <Bell className="w-6 h-6 text-[#1455C0]" />;
      case 'blogs':
        return <Edit3 className="w-6 h-6 text-[#1455C0]" />;
      case 'seo':
        return <Globe className="w-6 h-6 text-[#1455C0]" />;
      case 'doubts':
        return <MessageSquare className="w-6 h-6 text-[#1455C0]" />;
      case 'attempted-tests':
        return <FileCheck className="w-6 h-6 text-[#1455C0]" />;
      case 'invoices':
        return <Receipt className="w-6 h-6 text-[#1455C0]" />;
      default:
        return <Layers className="w-6 h-6 text-[#1455C0]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={title}
        subtitle={description}
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: category },
          { label: title }
        ]}
        actions={
          <Badge variant="purple" size="md" dot>
            Phase 00 Foundation Shell
          </Badge>
        }
      />

      {/* Overview Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-[#1455C0]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1455C0]/10 flex items-center justify-center shrink-0">
              {getIcon()}
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#6B7890] uppercase tracking-wider">Module Status</p>
              <p className="text-xs font-semibold text-[#172B4D] mt-0.5">Ready for Activation</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-bold text-xs">
              {dbCount !== undefined ? dbCount : '✓'}
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#6B7890] uppercase tracking-wider">
                {dbEntityName ? `${dbEntityName} in Database` : 'Backend Persistence'}
              </p>
              <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                {dbCount !== undefined ? `${dbCount} verified record(s)` : 'Storage Connected'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#6B7890] uppercase tracking-wider">Architecture Tier</p>
              <p className="text-xs font-semibold text-[#172B4D] mt-0.5">
                {hierarchyLevel || category}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Container Card */}
      <Card className="p-8 text-center space-y-4 bg-white border border-[#E3E8F0] shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-[#F6F8FC] border border-[#E3E8F0] text-[#1455C0] flex items-center justify-center mx-auto shadow-inner">
          {getIcon()}
        </div>

        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-base font-bold text-[#172B4D]">{title}</h3>
          <p className="text-xs text-[#6B7890] leading-relaxed">
            The clean React Admin foundation shell is loaded and active. Per Phase 00 specifications,
            individual module workflows are isolated until their dedicated feature instructions are executed.
          </p>
        </div>

        {hierarchyLevel && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F6F8FC] border border-[#E3E8F0] text-[11px] font-medium text-[#172B4D]">
            <span className="text-[#6B7890]">Academic Hierarchy:</span>
            <span className="font-semibold text-[#1455C0]">{hierarchyLevel}</span>
          </div>
        )}

        <div className="pt-2 flex justify-center">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F6F8FC] hover:bg-[#E3E8F0] text-xs font-semibold text-[#172B4D] transition-colors"
          >
            <span>Return to Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </Card>
    </div>
  );
};
