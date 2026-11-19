import { NextRequest, NextResponse } from 'next/server';
import { readCoursesFromDb } from '@/lib/db/courses';
import { readExamsFromDb } from '@/lib/db/exams';
import { readSubjectsFromDb } from '@/lib/db/subjects';
import { readChaptersFromDb } from '@/lib/db/chapters';
import { readTopicsFromDb } from '@/lib/db/topics';
import { readQuestionsFromDb } from '@/lib/db/questions';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'OVERVIEW', 'GET_STATS');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const courses = readCoursesFromDb();
    const exams = readExamsFromDb();
    const subjects = readSubjectsFromDb();
    const chapters = readChaptersFromDb();
    const topics = readTopicsFromDb();
    const questions = readQuestionsFromDb();

    return NextResponse.json({
      success: true,
      data: {
        counts: {
          courses: courses.length,
          exams: exams.length,
          subjects: subjects.length,
          chapters: chapters.length,
          topics: topics.length,
          questions: questions.length,
        },
        systemStatus: 'Operational',
        lmsVersion: '2.0.0-reset',
        foundationReady: true,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[GET /api/admin/overview Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to retrieve overview statistics.' },
      { status: 500 }
    );
  }
}
