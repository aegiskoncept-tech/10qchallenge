'use client';

import React, { useEffect, useState } from 'react';
import { AdminModulePlaceholder } from '@/components/admin/AdminModulePlaceholder';

export default function AdminQuestionsPage() {
  const [count, setCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetch('/api/admin/questions')
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data)) setCount(j.data.length);
      })
      .catch(() => { });
  }, []);

  return (
    <AdminModulePlaceholder
      moduleId="questions"
      title="Question Management"
      category="Academic Management"
      hierarchyLevel="Question Bank → Test Series"
      description="Persistent Objective (MCQ) & Numerical Question Master pool for mock tests."
      dbCount={count}
      dbEntityName="Questions"
    />
  );
}
