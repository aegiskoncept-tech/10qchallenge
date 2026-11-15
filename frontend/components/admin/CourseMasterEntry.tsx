'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  HelpCircle,
  ClipboardList,
  Video,
  FileText,
  FileCheck,
  Users,
  Eye,
  Layers,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { PrimaryButton, SecondaryButton } from './ui/Buttons';
import { SearchInput, FilterBar } from './ui/SearchInput';
import { StatusBadge } from './ui/EmptyState';

export interface CourseItem {
  id: number;
  title: string;
  exam: string;
  slug: string;
  shortDescription?: string;
  price?: string | number;
  originalPrice?: string | number;
  discount?: string;
  image?: string;
  bannerImage?: string;
  enrolledStudent?: number;
  isActive?: boolean;
  rating?: number;
}

export interface CourseMasterEntryProps {
  courses?: CourseItem[];
  onAddCourse?: () => void;
  onEditCourse?: (course: CourseItem) => void;
  onSelectAction?: (action: string, course: CourseItem) => void;
}

export const CourseMasterEntry: React.FC<CourseMasterEntryProps> = ({
  courses = [],
  onAddCourse,
  onEditCourse,
  onSelectAction
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [examFilter, setExamFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);

  // Default fallback canonical courses if list is empty
  const displayCourses: CourseItem[] = courses.length > 0 ? courses : [
    {
      id: 1,
      title: 'BITSAT 2026 Master Crash Course (Updated Batch)',
      exam: 'BITSAT',
      slug: 'bitsat-2026-master-crash-course',
      shortDescription: 'Complete 60-day intensive crash course by BITSians',
      price: '4999',
      originalPrice: '9999',
      discount: '50% OFF',
      image: '/uploads/courses/bitsat-crash-thumb.png',
      enrolledStudent: 1450,
      isActive: true,
      rating: 4.9
    },
    {
      id: 2,
      title: 'JEE Main 2026 Rank Booster Batch',
      exam: 'JEE',
      slug: 'jee-main-2026-rank-booster-batch',
      shortDescription: 'Formula shortcut tricks and speed problem solving',
      price: '5999',
      originalPrice: '12999',
      discount: '54% OFF',
      image: '/uploads/courses/jee-main-thumb.png',
      enrolledStudent: 980,
      isActive: true,
      rating: 4.8
    }
  ];

  const filteredCourses = displayCourses.filter((c) => {
    if (examFilter && c.exam.toLowerCase() !== examFilter.toLowerCase()) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(term);
      const matchSlug = c.slug.toLowerCase().includes(term);
      if (!matchTitle && !matchSlug) return false;
    }
    return true;
  });

  const actionMenuItems = [
    { id: 'edit', label: 'Edit Course', icon: Edit2 },
    { id: 'faq', label: 'Course FAQs', icon: HelpCircle },
    { id: 'subject', label: 'Assign Subjects', icon: ClipboardList },
    { id: 'video', label: 'Video Lectures', icon: Video },
    { id: 'document', label: 'Study Documents', icon: FileText },
    { id: 'testseries', label: 'Test Series Papers', icon: FileCheck }
  ];

  const handleAction = (actionId: string, course: CourseItem) => {
    setOpenActionMenuId(null);
    if (actionId === 'edit' && onEditCourse) {
      onEditCourse(course);
    } else if (onSelectAction) {
      onSelectAction(actionId, course);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <PageHeader
        title="Course Master"
        description="Centralized product catalogue hub. Manage academic courses, pricing tiers, and curriculum assets."
        breadcrumbs={[{ label: 'Academic Management' }, { label: 'Course Master' }]}
        actions={
          <PrimaryButton
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              if (onAddCourse) onAddCourse();
            }}
          >
            Add New Course
          </PrimaryButton>
        }
      />

      {/* FILTER & SEARCH BAR */}
      <FilterBar
        actions={
          <div className="flex items-center gap-1 bg-[#F6F8FC] p-1 rounded-lg border border-[#E3E8F0]">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-[#1455C0] shadow-2xs'
                  : 'text-[#6B7890] hover:text-[#172B4D]'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-[#1455C0] shadow-2xs'
                  : 'text-[#6B7890] hover:text-[#172B4D]'
              }`}
              title="Table View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        }
      >
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by course title or slug..."
          className="w-full sm:w-72"
        />

        <select
          value={examFilter}
          onChange={(e) => setExamFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-[#E3E8F0] rounded-lg text-xs text-[#172B4D] focus:outline-none focus:border-[#1455C0] shadow-2xs cursor-pointer"
        >
          <option value="">All Exams</option>
          <option value="BITSAT">BITSAT</option>
          <option value="JEE">JEE</option>
          <option value="COMEDK">COMEDK</option>
          <option value="VITEEE">VITEEE</option>
          <option value="Manipal (MET)">Manipal (MET)</option>
        </select>
      </FilterBar>

      {/* COURSE CARDS GRID VIEW */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-xl border border-[#E3E8F0] shadow-subtle hover:shadow-card transition-all overflow-hidden flex flex-col justify-between group"
            >
              {/* IMAGE / BANNER AREA */}
              <div className="relative h-44 bg-[#14233F] overflow-hidden flex items-center justify-center">
                {course.image ? (
                  <img
                    src={course.image}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    onError={(e) => {
                      // Fallback placeholder
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="text-white/40 flex flex-col items-center gap-1">
                    <Layers className="w-8 h-8" />
                    <span className="text-[11px] font-mono">10Q Course</span>
                  </div>
                )}

                {/* EXAM BADGE & ACTIVE STATUS */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-[#1455C0] text-white shadow-xs">
                    {course.exam}
                  </span>
                  <StatusBadge status={course.isActive} />
                </div>

                {/* THREE-DOT ACTION MENU BUTTON */}
                <div className="absolute top-3 right-3">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenActionMenuId(
                        openActionMenuId === course.id ? null : course.id
                      )
                    }
                    className="w-7 h-7 rounded-lg bg-white/90 hover:bg-white text-[#172B4D] flex items-center justify-center shadow-xs cursor-pointer transition-colors"
                    title="Course Actions"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* ACTION DROPDOWN */}
                  {openActionMenuId === course.id && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setOpenActionMenuId(null)}
                      />
                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-dropdown border border-[#E3E8F0] py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                        {actionMenuItems.map((item) => {
                          const ItemIcon = item.icon;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleAction(item.id, course)}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#172B4D] hover:bg-[#F6F8FC] hover:text-[#1455C0] transition-colors cursor-pointer text-left font-medium"
                            >
                              <ItemIcon className="w-3.5 h-3.5 text-[#6B7890]" />
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* CARD DETAILS */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-[#172B4D] line-clamp-1 group-hover:text-[#1455C0] transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-xs text-[#6B7890] mt-1 line-clamp-2 leading-relaxed">
                    {course.shortDescription || 'Comprehensive curriculum with video lectures, study materials and mock tests.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#EDF1F7] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-sm font-bold text-[#172B4D]">
                      ₹{course.price || '4,999'}
                    </span>
                    {course.originalPrice && (
                      <span className="text-[11px] text-[#9AA5B8] line-through ml-1.5">
                        ₹{course.originalPrice}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[#6B7890]">
                    <Users className="w-3.5 h-3.5 text-[#9AA5B8]" />
                    <span>{course.enrolledStudent || 1450} Enrolled</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-[#E3E8F0] shadow-subtle overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F6F8FC] border-b border-[#E3E8F0] text-[#6B7890] font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3.5">COURSE</th>
                <th className="p-3.5">EXAM</th>
                <th className="p-3.5">PRICE</th>
                <th className="p-3.5">STUDENTS</th>
                <th className="p-3.5 text-center">STATUS</th>
                <th className="p-3.5 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1F7] text-[#172B4D]">
              {filteredCourses.map((c) => (
                <tr key={c.id} className="hover:bg-[#F6F8FC]/80 transition-colors">
                  <td className="p-3.5">
                    <div className="font-bold text-[#172B4D]">{c.title}</div>
                    <div className="text-[11px] text-[#6B7890] font-mono">{c.slug}</div>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8F1FC] text-[#1455C0]">
                      {c.exam}
                    </span>
                  </td>
                  <td className="p-3.5 font-semibold">
                    ₹{c.price || '4,999'}
                  </td>
                  <td className="p-3.5 text-[#6B7890]">
                    {c.enrolledStudent || 1450}
                  </td>
                  <td className="p-3.5 text-center">
                    <StatusBadge status={c.isActive} />
                  </td>
                  <td className="p-3.5 text-center">
                    <SecondaryButton
                      size="sm"
                      onClick={() => onEditCourse && onEditCourse(c)}
                    >
                      Manage
                    </SecondaryButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
