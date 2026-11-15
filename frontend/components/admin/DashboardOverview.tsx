'use client';

import React from 'react';
import {
  BookOpen,
  Users,
  GraduationCap,
  HelpCircle,
  FileCheck,
  CheckCircle2,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { StatusBadge } from './ui/EmptyState';

export interface DashboardOverviewProps {
  totalCourses?: number;
  activeCourses?: number;
  totalExams?: number;
  totalQuestions?: number;
  totalStudents?: number;
  totalTestSeries?: number;
  onNavigateTab?: (tabName: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  totalCourses = 2,
  activeCourses = 2,
  totalExams = 5,
  totalQuestions = 5,
  totalStudents = 2430,
  totalTestSeries = 25,
  onNavigateTab
}) => {
  const statCards = [
    {
      title: 'Total Courses',
      value: totalCourses,
      change: '+2 this month',
      icon: BookOpen,
      iconBg: 'bg-[#E8F1FC] text-[#1455C0]',
      targetTab: 'Course Master'
    },
    {
      title: 'Total Students',
      value: totalStudents.toLocaleString(),
      change: '+18% growth',
      icon: Users,
      iconBg: 'bg-[#E9F8F1] text-[#16A36A]'
    },
    {
      title: 'Total Exams',
      value: totalExams,
      change: '5 Master Exams',
      icon: GraduationCap,
      iconBg: 'bg-[#FEF8EC] text-[#E6A23C]',
      targetTab: 'Exam Master'
    },
    {
      title: 'Total Questions',
      value: totalQuestions,
      change: 'Bank populated',
      icon: HelpCircle,
      iconBg: 'bg-[#FDF0F0] text-[#E5484D]',
      targetTab: 'Objective Question'
    },
    {
      title: 'Total Test Series',
      value: totalTestSeries,
      change: 'Full mocks',
      icon: FileCheck,
      iconBg: 'bg-[#EDF5FD] text-[#2075E8]'
    },
    {
      title: 'Active Courses',
      value: activeCourses,
      change: '100% active',
      icon: CheckCircle2,
      iconBg: 'bg-[#E9F8F1] text-[#16A36A]',
      targetTab: 'Course Master'
    }
  ];

  const recentActivities = [
    {
      id: 1,
      activity: 'Question Bank Updated',
      user: 'Harshal Jain (Admin)',
      module: 'Question Master',
      date: 'Today, 03:40 AM',
      status: 'Completed'
    },
    {
      id: 2,
      activity: 'Chapter Topic Hierarchy Saved',
      user: 'Harshal Jain (Admin)',
      module: 'Chapter Master',
      date: 'Yesterday, 10:15 PM',
      status: 'Completed'
    },
    {
      id: 3,
      activity: 'BITSAT 2026 Batch Enrollment Sync',
      user: 'System Automated',
      module: 'Course Master',
      date: '14 Nov 2026',
      status: 'Live'
    },
    {
      id: 4,
      activity: 'Exam Master Slug Canonization',
      user: 'Harshal Jain (Admin)',
      module: 'Exam Master',
      date: '14 Nov 2026',
      status: 'Completed'
    }
  ];

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <PageHeader
        title="Dashboard Overview"
        description="Comprehensive enterprise metrics, student engagement tracking and academic catalogue health."
        breadcrumbs={[{ label: 'Dashboard' }]}
        badge={
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#E9F8F1] text-[#16A36A] border border-[#B2EAD0] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A36A] animate-pulse" />
            Live Production System
          </span>
        }
      />

      {/* OVERVIEW STATS GRID (6 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              onClick={() => {
                if (stat.targetTab && onNavigateTab) onNavigateTab(stat.targetTab);
              }}
              className={`bg-white rounded-xl border border-[#E3E8F0] p-4 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between ${
                stat.targetTab ? 'cursor-pointer hover:border-[#1455C0]/40' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#6B7890] truncate">
                  {stat.title}
                </span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${stat.iconBg}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-[#172B4D] tracking-tight">
                  {stat.value}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[#6B7890] mt-1">
                  <TrendingUp className="w-3 h-3 text-[#16A36A]" />
                  <span>{stat.change}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ANALYTICS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* STUDENT ENROLLMENTS OVERVIEW (2 COLS) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E3E8F0] p-5 sm:p-6 shadow-subtle space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EDF1F7] gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#172B4D]">Student Enrollment Trend</h2>
              <p className="text-xs text-[#6B7890]">Monthly growth across BITSAT, JEE Main, and VITEEE cohorts</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#E8F1FC] text-[#1455C0] border border-[#B8D8FA]">
                2026 Batch Target
              </span>
            </div>
          </div>

          {/* SVG ILLUSTRATIVE CHART */}
          <div className="pt-2">
            <div className="h-48 w-full flex items-end justify-between gap-2 px-2 pt-6">
              {[
                { month: 'Jun', count: 320, pct: '32%' },
                { month: 'Jul', count: 480, pct: '48%' },
                { month: 'Aug', count: 720, pct: '62%' },
                { month: 'Sep', count: 1100, pct: '75%' },
                { month: 'Oct', count: 1650, pct: '88%' },
                { month: 'Nov', count: 2430, pct: '100%' }
              ].map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[10px] font-mono text-[#6B7890] opacity-0 group-hover:opacity-100 transition-opacity">
                    {bar.count}
                  </span>
                  <div
                    style={{ height: bar.pct }}
                    className="w-full max-w-[36px] bg-[#1455C0] rounded-t-md hover:bg-[#0F449E] transition-all"
                  />
                  <span className="text-[11px] font-semibold text-[#6B7890]">{bar.month}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-[#EDF1F7] flex items-center justify-between text-xs text-[#6B7890]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1455C0]" />
              <span>Paid Enrollments (+2,430 students)</span>
            </span>
            <span className="text-[11px] font-mono text-[#16A36A] font-semibold">
              +142% vs previous term
            </span>
          </div>
        </div>

        {/* COURSE PERFORMANCE BREAKDOWN (1 COL) */}
        <div className="bg-white rounded-xl border border-[#E3E8F0] p-5 sm:p-6 shadow-subtle space-y-4 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-[#EDF1F7]">
              <h2 className="text-sm font-bold text-[#172B4D]">Course Performance</h2>
              <p className="text-xs text-[#6B7890]">Active student distribution by exam</p>
            </div>

            <div className="space-y-4 pt-4">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-[#172B4D]">BITSAT 2026 Master Crash Course</span>
                  <span className="text-[#1455C0]">60%</span>
                </div>
                <div className="w-full bg-[#F6F8FC] h-2 rounded-full overflow-hidden border border-[#E3E8F0]">
                  <div className="bg-[#1455C0] h-full rounded-full" style={{ width: '60%' }} />
                </div>
                <span className="text-[10px] text-[#6B7890] mt-0.5 block">1,450 enrolled students</span>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-[#172B4D]">JEE Main 2026 Rank Booster</span>
                  <span className="text-[#16A36A]">40%</span>
                </div>
                <div className="w-full bg-[#F6F8FC] h-2 rounded-full overflow-hidden border border-[#E3E8F0]">
                  <div className="bg-[#16A36A] h-full rounded-full" style={{ width: '40%' }} />
                </div>
                <span className="text-[10px] text-[#6B7890] mt-0.5 block">980 enrolled students</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#F6F8FC] border border-[#E3E8F0] rounded-lg text-xs text-[#6B7890] flex items-start gap-2 mt-4">
            <Info className="w-4 h-4 text-[#1455C0] shrink-0 mt-0.5" />
            <span>
              All exam courses are configured with synchronized master exams and centralized question bank links.
            </span>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY LOG TABLE */}
      <div className="bg-white rounded-xl border border-[#E3E8F0] shadow-subtle overflow-hidden">
        <div className="p-5 border-b border-[#EDF1F7] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#172B4D]">Recent Administrator Activity</h2>
            <p className="text-xs text-[#6B7890]">Audit trail of curriculum changes and system events</p>
          </div>
          <span className="text-[11px] font-semibold text-[#6B7890] bg-[#F6F8FC] px-2.5 py-1 rounded-md border border-[#E3E8F0]">
            Audit Trail
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F6F8FC] border-b border-[#E3E8F0] text-[#6B7890] font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3.5">ACTIVITY</th>
                <th className="p-3.5">USER</th>
                <th className="p-3.5">MODULE</th>
                <th className="p-3.5">DATE / TIME</th>
                <th className="p-3.5 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1F7] text-[#172B4D]">
              {recentActivities.map((act) => (
                <tr key={act.id} className="hover:bg-[#F6F8FC]/80 transition-colors">
                  <td className="p-3.5 font-semibold text-[#172B4D]">
                    {act.activity}
                  </td>
                  <td className="p-3.5 text-[#6B7890]">
                    {act.user}
                  </td>
                  <td className="p-3.5 text-[#1455C0] font-medium">
                    {act.module}
                  </td>
                  <td className="p-3.5 text-[#6B7890] font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-[#9AA5B8]" />
                      <span>{act.date}</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-center">
                    <StatusBadge status={act.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
