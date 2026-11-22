'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PublicBlogDetail from '@/components/blog/PublicBlogDetail';

function BlogPreviewContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || undefined;

  return <PublicBlogDetail previewToken={token} />;
}

export default function BlogPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <BlogPreviewContent />
    </Suspense>
  );
}
