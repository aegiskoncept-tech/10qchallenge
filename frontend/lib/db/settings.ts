import fs from 'fs';
import path from 'path';

export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  siteUrl: string;
  paymentGatewayMode: 'SANDBOX' | 'PRODUCTION';
  maintenanceMode: boolean;
  classroomAccessPolicy: 'STRICT_SETTLEMENT' | 'ALLOW_PENDING';
  defaultTestDurationMinutes: number;
  maxLoginAttempts: number;
  sessionTimeoutHours: number;
  updatedAt: string;
  updatedBy: string;
}

export const CANONICAL_DEFAULT_SETTINGS: PlatformSettings = {
  platformName: '10Q Challenge LMS',
  supportEmail: 'support@10qchallenge.in',
  supportPhone: '+91 98765 43210',
  siteUrl: 'https://10qchallenge.in',
  paymentGatewayMode: 'SANDBOX',
  maintenanceMode: false,
  classroomAccessPolicy: 'STRICT_SETTLEMENT',
  defaultTestDurationMinutes: 180,
  maxLoginAttempts: 5,
  sessionTimeoutHours: 72,
  updatedAt: '2026-11-01T00:00:00.000Z',
  updatedBy: 'System',
};

function getSettingsPaths(): string[] {
  const cwd = process.cwd();
  const persistentDir = process.env.DATA_STORE_DIR;
  const candidates = [
    ...(persistentDir ? [path.join(persistentDir, 'data', 'platform-settings.json')] : []),
    path.join(cwd, 'data', 'platform-settings.json'),
    path.join(cwd, 'frontend', 'data', 'platform-settings.json'),
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
    const fallback = path.join(cwd, 'data', 'platform-settings.json');
    const dir = path.dirname(fallback);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    validPaths.push(fallback);
  }
  return validPaths;
}

export function readPlatformSettings(): PlatformSettings {
  const paths = getSettingsPaths();
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') return { ...CANONICAL_DEFAULT_SETTINGS, ...parsed };
        }
      }
    } catch {}
  }
  writePlatformSettings(CANONICAL_DEFAULT_SETTINGS);
  return CANONICAL_DEFAULT_SETTINGS;
}

export function writePlatformSettings(settings: PlatformSettings): void {
  const json = JSON.stringify(settings, null, 2);
  const paths = getSettingsPaths();
  for (const p of paths) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, json, 'utf-8');
    } catch {}
  }
}

export function updatePlatformSettings(
  partial: Partial<PlatformSettings>,
  user = 'Administrator'
): PlatformSettings {
  const current = readPlatformSettings();
  const updated: PlatformSettings = {
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
    updatedBy: user,
  };
  writePlatformSettings(updated);
  return updated;
}
