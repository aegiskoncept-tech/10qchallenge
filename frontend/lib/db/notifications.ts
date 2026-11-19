import fs from 'fs';
import path from 'path';

export interface NotificationRecord {
  id: number;
  title: string;
  message: string;
  targetAudience: 'ALL' | 'BITSAT' | 'JEE' | 'COMEDK' | 'ENROLLED';
  type: 'ANNOUNCEMENT' | 'EXAM_ALERT' | 'SYSTEM' | 'OFFER';
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  actionUrl?: string;
  isActive: boolean;
  createdAt: string;
  sentBy: string;
}

export const CANONICAL_DEFAULT_NOTIFICATIONS: NotificationRecord[] = [
  {
    id: 1,
    title: 'BITSAT 2026 Session 1 Registration Announced',
    message: 'Official registration portal is now active on bitsadmission.com. Check eligibility and exam dates.',
    targetAudience: 'BITSAT',
    type: 'EXAM_ALERT',
    priority: 'HIGH',
    actionUrl: 'https://www.bitsadmission.com',
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    sentBy: 'System Admin',
  },
  {
    id: 2,
    title: 'Weekend All-India CBT Mock Test Schedule',
    message: 'All-India CBT Mock Test #01 will be live this Sunday at 10:00 AM IST. Ensure you are ready.',
    targetAudience: 'ALL',
    type: 'ANNOUNCEMENT',
    priority: 'NORMAL',
    actionUrl: '/student/tests',
    isActive: true,
    createdAt: '2026-11-02T00:00:00.000Z',
    sentBy: 'Academic Desk',
  },
];

function getNotifPaths(): string[] {
  const cwd = process.cwd();
  const persistentDir = process.env.DATA_STORE_DIR;
  const candidates = [
    ...(persistentDir ? [path.join(persistentDir, 'data', 'notifications.json'), path.join(persistentDir, 'notifications.json')] : []),
    path.join(cwd, 'data', 'notifications.json'),
    path.join(cwd, 'frontend', 'data', 'notifications.json'),
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
    const fallback = path.join(cwd, 'data', 'notifications.json');
    const dir = path.dirname(fallback);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    validPaths.push(fallback);
  }
  return validPaths;
}

export function readNotificationsFromDb(): NotificationRecord[] {
  const paths = getNotifPaths();
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
  writeNotificationsToDb(CANONICAL_DEFAULT_NOTIFICATIONS);
  return CANONICAL_DEFAULT_NOTIFICATIONS;
}

export function writeNotificationsToDb(items: NotificationRecord[]): void {
  const json = JSON.stringify(items, null, 2);
  const paths = getNotifPaths();
  for (const filePath of paths) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, json, 'utf-8');
    } catch (err) {}
  }
}

export function getAdminNotifications(search?: string): NotificationRecord[] {
  let list = readNotificationsFromDb();
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    list = list.filter(
      (n) => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
    );
  }
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createNotification(
  data: Partial<NotificationRecord>,
  user = 'Administrator'
): Promise<{ success: boolean; notification?: NotificationRecord; error?: string }> {
  if (!data.title?.trim()) return { success: false, error: 'Notification title is required.' };
  if (!data.message?.trim()) return { success: false, error: 'Message body is required.' };

  const all = readNotificationsFromDb();
  const newId = all.length > 0 ? Math.max(...all.map((n) => Number(n.id) || 0)) + 1 : 1;
  const now = new Date().toISOString();

  const newNotif: NotificationRecord = {
    id: newId,
    title: data.title.trim(),
    message: data.message.trim(),
    targetAudience: data.targetAudience || 'ALL',
    type: data.type || 'ANNOUNCEMENT',
    priority: data.priority || 'NORMAL',
    actionUrl: data.actionUrl?.trim() || undefined,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    createdAt: now,
    sentBy: user,
  };

  all.push(newNotif);
  writeNotificationsToDb(all);
  return { success: true, notification: newNotif };
}

export async function deleteNotification(id: number): Promise<{ success: boolean; error?: string }> {
  const all = readNotificationsFromDb();
  const index = all.findIndex((n) => Number(n.id) === Number(id));
  if (index === -1) return { success: false, error: 'Notification not found.' };

  all.splice(index, 1);
  writeNotificationsToDb(all);
  return { success: true };
}
