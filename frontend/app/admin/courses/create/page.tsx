'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CourseFormPanel, CourseFormData } from '@/components/admin/CourseFormPanel';
import { apiClient } from '@/lib/apiClient';

export default function CreateCoursePage() {
  const router = useRouter();

  const handleSave = async (formData: CourseFormData) => {
    const res = await apiClient('/api/admin/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        subjectIds: formData.selectedSubjectIds || [],
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to create course on server.');
    }

    // Redirect to course catalogue on successful creation
    router.push('/admin/courses');
  };

  const handleCancel = () => {
    router.push('/admin/courses');
  };

  return (
    <CourseFormPanel
      mode="create"
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}
