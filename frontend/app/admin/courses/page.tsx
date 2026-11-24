'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CourseMasterCatalogue } from '@/components/admin/CourseMasterCatalogue';
import { CourseRecord } from '@/lib/db/courses';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';
import { apiClient } from '@/lib/apiClient';

function AdminCoursesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Backward-compatibility: smoothly redirect legacy query links (?action=add or ?edit=1)
  useEffect(() => {
    const action = searchParams.get('action');
    const editId = searchParams.get('edit') || searchParams.get('id');

    if (action === 'add' || action === 'create') {
      router.replace('/admin/courses/create');
      return;
    }
    if (editId) {
      router.replace(`/admin/courses/${editId}/edit`);
      return;
    }
  }, [searchParams, router]);

  const fetchCourses = async () => {
    try {
      const res = await apiClient('/api/admin/courses');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setCourses(json.data);
        }
      }
    } catch (e) {
      console.error('[AdminCoursesPage Fetch Error]', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <LoadingSpinner size="lg" />
        <p className="text-xs font-bold text-slate-500">Loading Course Master...</p>
      </div>
    );
  }

  return <CourseMasterCatalogue courses={courses} onRefresh={fetchCourses} />;
}

export default function AdminCoursesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
          <LoadingSpinner size="lg" />
          <p className="text-xs font-bold text-slate-500">Loading Course Master...</p>
        </div>
      }
    >
      <AdminCoursesContent />
    </Suspense>
  );
}
