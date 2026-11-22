import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { verifyHmacSignature } from '@/lib/content/security';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = process.env.INTERNAL_REVALIDATION_SECRET || 'dev-reval-secret-key-10q';
  const timestamp = req.headers.get('x-internal-timestamp');
  const signature = req.headers.get('x-internal-signature');

  if (!timestamp || !signature) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: missing authentication headers.' },
      { status: 401 }
    );
  }

  // Replay protection: 5 minute window
  const reqTime = parseInt(timestamp, 10);
  if (isNaN(reqTime) || Math.abs(Date.now() - reqTime) > 5 * 60 * 1000) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: request timestamp expired or out of bounds.' },
      { status: 401 }
    );
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Malformed request body.' }, { status: 400 });
  }

  const payloadToVerify = `${timestamp}:${rawBody}`;
  if (!verifyHmacSignature(payloadToVerify, signature, secret)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: invalid HMAC signature.' },
      { status: 401 }
    );
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { targetPaths } = body;
  if (!Array.isArray(targetPaths) || targetPaths.length === 0) {
    return NextResponse.json(
      { success: false, error: 'targetPaths must be a non-empty array of URL paths.' },
      { status: 400 }
    );
  }

  const revalidated: string[] = [];
  const errors: string[] = [];

  for (const p of targetPaths) {
    if (typeof p === 'string' && p.startsWith('/')) {
      try {
        revalidatePath(p);
        revalidated.push(p);
      } catch (err: any) {
        errors.push(`Failed to revalidate ${p}: ${err.message}`);
      }
    }
  }

  return NextResponse.json({
    success: true,
    revalidatedPaths: revalidated,
    errors: errors.length ? errors : undefined,
  });
}
