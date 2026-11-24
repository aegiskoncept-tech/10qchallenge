'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { CourseFormPanel, CourseFormData } from '@/components/admin/CourseFormPanel';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';
import { apiClient } from '@/lib/apiClient';

interface EditCoursePageProps {
  params: Promise<{ id: string }>;
}

export default function EditCoursePage({ params }: EditCoursePageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const courseId = Number(resolvedParams.id);

  const [courseData, setCourseData] = useState<Partial<CourseFormData> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!courseId || isNaN(courseId)) {
      setLoadError('Invalid Course ID provided.');
      setIsLoading(false);
      return;
    }

    const fetchCourse = async () => {
      try {
        const [courseRes, subjectsRes] = await Promise.all([
          apiClient(`/api/admin/courses/${courseId}`),
          apiClient(`/api/admin/courses/${courseId}/subjects`),
        ]);

        if (!courseRes.ok) {
          throw new Error(`Failed to load course #${courseId} (HTTP ${courseRes.status})`);
        }

        const courseJson = await courseRes.json();
        if (!courseJson.success || !courseJson.data) {
          throw new Error(courseJson.error || 'Course not found.');
        }

        let assignedSubjectIds: number[] = [];
        if (subjectsRes.ok) {
          try {
            const subJson = await subjectsRes.json();
            if (subJson.success && Array.isArray(subJson.data)) {
              assignedSubjectIds = subJson.data;
            }
          } catch {}
        }

        setCourseData({
          ...courseJson.data,
          selectedSubjectIds: assignedSubjectIds.length > 0 ? assignedSubjectIds : courseJson.data.subjectIds || [],
        });
      } catch (err: any) {
        setLoadError(err?.message || 'Failed to load course details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  const handleSave = async (formData: CourseFormData) => {
    const res = await apiClient(`/api/admin/courses/${courseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        subjectIds: formData.selectedSubjectIds || [],
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update course on server.');
    }

    // Refresh local state with updated response
    if (json.data) {
      setCourseData({
        ...json.data,
        selectedSubjectIds: formData.selectedSubjectIds || [],
      });
    }
  };

  const handleDelete = async (id: number) => {
    const res = await apiClient(`/api/admin/courses/${id}`, {
      method: 'DELETE',
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.error || 'Failed to delete course.',
        dependencies: json.dependencies,
      };
    }

    // Redirect to course catalogue on successful deletion
    router.push('/admin/courses');
    return { success: true };
  };

  const handleCancel = () => {
    router.push('/admin/courses');
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <LoadingSpinner size="lg" />
        <p className="text-xs font-bold text-slate-500">Loading Course #{courseId}...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-8 text-center rounded-2xl border border-red-200 bg-red-50/60 max-w-lg mx-auto space-y-3">
        <p className="font-extrabold text-sm text-red-900">Failed to Load Course</p>
        <p className="text-xs text-red-700">{loadError}</p>
        <button
          onClick={() => router.push('/admin/courses')}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800"
        >
          Return to Courses
        </button>
      </div>
    );
  }

  return (
    <CourseFormPanel
      mode="edit"
      initialData={courseData}
      onSave={handleSave}
      onDelete={handleDelete}
      onCancel={handleCancel}
    />
  );
}
