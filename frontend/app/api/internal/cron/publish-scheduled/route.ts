import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { SchedulerService } from '@/lib/content/scheduler-service';
import { RevalidationService } from '@/lib/content/revalidation-service';

export const dynamic = 'force-dynamic';

function verifyCronAuth(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET || 'dev-cron-secret-10q';
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  const customHeader = req.headers.get('x-cron-secret');

  return token === cronSecret || customHeader === cronSecret;
}

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized: invalid cron credentials.' }, { status: 401 });
  }

  try {
    const workerId = `api-cron-${crypto.randomUUID()}`;
    const schedulerResult = await SchedulerService.executeSchedulerCycle(workerId);

    // Optionally process outbox immediately
    let outboxResult = null;
    const { searchParams } = new URL(req.url);
    if (searchParams.get('revalidate') === 'true') {
      outboxResult = await RevalidationService.processOutbox(workerId);
    }

    return NextResponse.json({
      success: true,
      scheduler: schedulerResult,
      outbox: outboxResult,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
