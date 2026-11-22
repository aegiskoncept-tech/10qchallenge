import React from 'react';
import PublicBlogDetail from '@/components/blog/PublicBlogDetail';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function BlogDetailPage({ params }: PageProps) {
  const { slug } = await params;
  return <PublicBlogDetail slug={slug} />;
}
