'use client';

import React, { useEffect, useState } from 'react';
import { AdminModulePlaceholder } from '@/components/admin/AdminModulePlaceholder';

export default function AdminExamsPage() {
  const [count, setCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetch('/api/admin/exams')
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data)) setCount(j.data.length);
      })
      .catch(() => { });
  }, []);

  return (
    <AdminModulePlaceholder
      moduleId="exams"
      title="Exam Master"
      category="Academic Management"
      hierarchyLevel="Course Master Root Context (BITSAT, JEE, etc.)"
      description="Configure target competitive examination categories and prerequisites."
      dbCount={count}
      dbEntityName="Exam Categories"
    />
  );
}
