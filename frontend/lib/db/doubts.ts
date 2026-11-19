import fs from 'fs';
import path from 'path';

export interface DoubtRecord {
  id: number;
  studentId: number | string;
  studentName: string;
  studentEmail?: string;
  courseId: number;
  courseTitle: string;
  lessonId?: number;
  lessonTitle?: string;
  subject?: string;
  queryText: string;
  timestampMinutes?: string;
  screenshotUrl?: string;
  status: 'PENDING' | 'RESOLVED';
  facultyName?: string;
  solutionText?: string;
  createdAt: string;
  solvedAt?: string;
}

export const CANONICAL_DEFAULT_DOUBTS: DoubtRecord[] = [
  {
    id: 1,
    studentId: 101,
    studentName: 'Aarav Sharma',
    studentEmail: 'aarav.sharma@gmail.com',
    courseId: 1,
    courseTitle: 'BITSAT 2026 Crash Course',
    lessonTitle: 'Mechanics & 1D Kinematics - Complete Masterclass',
    subject: 'Physics',
    queryText: 'In the relative velocity derivation at 42:15, why is the cross-product sign negative when projecting onto the vertical axis?',
    timestampMinutes: '42:15',
    status: 'RESOLVED',
    facultyName: 'Dr. Vikramaditya (BITS Pilani)',
    solutionText: 'The negative sign emerges from the standard right-hand rule coordinate system convention where the vertical axis is defined upwards (+j) while the relative acceleration acts downwards (-g). Hence, a_rel = -g j.',
    createdAt: '2026-11-02T10:30:00.000Z',
    solvedAt: '2026-11-02T12:00:00.000Z',
  },
  {
    id: 2,
    studentId: 102,
    studentName: 'Rohan Deshmukh',
    studentEmail: 'rohan.d@yahoo.com',
    courseId: 1,
    courseTitle: 'BITSAT 2026 Crash Course',
    lessonTitle: 'Chemical Bonding & Hybridization Speed Techniques',
    subject: 'Chemistry',
    queryText: 'Can we apply the steric number formula directly for xenon fluorides like XeF4 and XeOF4?',
    timestampMinutes: '18:40',
    status: 'PENDING',
    createdAt: '2026-11-03T14:15:00.000Z',
  },
];

function getDoubtDataPaths(): string[] {
  const cwd = process.cwd();
  const persistentDir = process.env.DATA_STORE_DIR;
  const candidates = [
    ...(persistentDir ? [path.join(persistentDir, 'data', 'doubts.json'), path.join(persistentDir, 'doubts.json')] : []),
    path.join(cwd, 'data', 'doubts.json'),
    path.join(cwd, 'frontend', 'data', 'doubts.json'),
  ];
  const uniqueDirs = new Set<string>();
  const validPaths: string[] = [];
  for (const p of candidates) {
    const dir = path.dirname(p);
    if (!uniqueDirs.has(dir) && fs.existsSync(dir)) {
      uniqueDirs.add(dir);
      validPaths.push(p);
    }
  }
  if (validPaths.length === 0) {
    const fallback = path.join(cwd, 'data', 'doubts.json');
    const dir = path.dirname(fallback);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    validPaths.push(fallback);
  }
  return validPaths;
}

export function readDoubtsFromDb(): DoubtRecord[] {
  const paths = getDoubtDataPaths();
  for (const filePath of paths) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch (err) {}
  }
  writeDoubtsToDb(CANONICAL_DEFAULT_DOUBTS);
  return CANONICAL_DEFAULT_DOUBTS;
}

export function writeDoubtsToDb(doubts: DoubtRecord[]): void {
  const json = JSON.stringify(doubts, null, 2);
  const paths = getDoubtDataPaths();
  for (const filePath of paths) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, json, 'utf-8');
    } catch (err) {}
  }
}

export function getAdminDoubts(filters?: { status?: string; search?: string; subject?: string }): DoubtRecord[] {
  let list = readDoubtsFromDb();
  if (filters?.status && filters.status !== 'ALL') {
    list = list.filter((d) => d.status === filters.status);
  }
  if (filters?.subject && filters.subject !== 'ALL') {
    list = list.filter((d) => d.subject?.toLowerCase() === filters.subject?.toLowerCase());
  }
  if (filters?.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    list = list.filter(
      (d) =>
        d.queryText.toLowerCase().includes(q) ||
        d.studentName.toLowerCase().includes(q) ||
        d.courseTitle.toLowerCase().includes(q) ||
        (d.lessonTitle && d.lessonTitle.toLowerCase().includes(q))
    );
  }
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getStudentDoubts(studentId: number | string): DoubtRecord[] {
  const all = readDoubtsFromDb();
  return all
    .filter((d) => String(d.studentId) === String(studentId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createDoubt(data: {
  studentId: number | string;
  studentName: string;
  studentEmail?: string;
  courseId: number;
  courseTitle: string;
  lessonId?: number;
  lessonTitle?: string;
  subject?: string;
  queryText: string;
  timestampMinutes?: string;
  screenshotUrl?: string;
}): Promise<{ success: boolean; doubt?: DoubtRecord; error?: string }> {
  if (!data.queryText?.trim()) return { success: false, error: 'Query text is required.' };

  const all = readDoubtsFromDb();
  const newId = all.length > 0 ? Math.max(...all.map((d) => Number(d.id) || 0)) + 1 : 1;
  const now = new Date().toISOString();

  const newDoubt: DoubtRecord = {
    id: newId,
    studentId: data.studentId,
    studentName: data.studentName || 'Student',
    studentEmail: data.studentEmail,
    courseId: Number(data.courseId),
    courseTitle: data.courseTitle,
    lessonId: data.lessonId,
    lessonTitle: data.lessonTitle,
    subject: data.subject || 'General',
    queryText: data.queryText.trim(),
    timestampMinutes: data.timestampMinutes,
    screenshotUrl: data.screenshotUrl,
    status: 'PENDING',
    createdAt: now,
  };

  all.push(newDoubt);
  writeDoubtsToDb(all);
  return { success: true, doubt: newDoubt };
}

export async function resolveDoubt(
  id: number,
  solutionText: string,
  facultyName: string
): Promise<{ success: boolean; doubt?: DoubtRecord; error?: string }> {
  const all = readDoubtsFromDb();
  const index = all.findIndex((d) => Number(d.id) === Number(id));
  if (index === -1) return { success: false, error: 'Doubt not found.' };

  const existing = all[index];
  const updated: DoubtRecord = {
    ...existing,
    solutionText: solutionText.trim(),
    facultyName: facultyName.trim() || 'Academic Faculty',
    status: 'RESOLVED',
    solvedAt: new Date().toISOString(),
  };

  all[index] = updated;
  writeDoubtsToDb(all);
  return { success: true, doubt: updated };
}

export async function deleteDoubt(id: number): Promise<{ success: boolean; error?: string }> {
  const all = readDoubtsFromDb();
  const index = all.findIndex((d) => Number(d.id) === Number(id));
  if (index === -1) return { success: false, error: 'Doubt not found.' };

  all.splice(index, 1);
  writeDoubtsToDb(all);
  return { success: true };
}
