export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { permanentRedirect } from 'next/navigation';
import { getExamBySlugOrId } from '@/lib/db/exams';
import Exam from '@/src/views/Exam';

export default async function ExamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug) {
    const exam = getExamBySlugOrId(slug, false);
    if (exam && exam.isCanonicalSlug === false) {
      permanentRedirect(`/exam/${exam.slug}`);
    }
  }

  return <Exam />;
}
