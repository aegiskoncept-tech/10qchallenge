import { NextRequest, NextResponse } from 'next/server';
import { getTopicById, updateTopic, deleteTopic } from '@/lib/db/topics';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const topicId = Number(id);

    if (!topicId || isNaN(topicId)) {
      return NextResponse.json({ success: false, error: 'Valid numeric topic ID required.' }, { status: 400 });
    }

    const topic = getTopicById(topicId);

    if (!topic) {
      return NextResponse.json({ success: false, error: 'Topic not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: topic });
  } catch (error: any) {
    console.error('[GET /api/admin/topics/[id] Exception]', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const topicId = Number(id);

    if (!topicId || isNaN(topicId)) {
      return NextResponse.json({ success: false, error: 'Valid numeric topic ID required.' }, { status: 400 });
    }

    const body = await req.json();
    const adminUser = req.headers.get('x-admin-user') || body.adminUser || 'Administrator';

    const result = await updateTopic(topicId, body, adminUser);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.topic,
      message: 'Topic updated successfully.',
    });
  } catch (error: any) {
    console.error('[PUT /api/admin/topics/[id] Exception]', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const topicId = Number(id);

    if (!topicId || isNaN(topicId)) {
      return NextResponse.json({ success: false, error: 'Valid numeric topic ID required.' }, { status: 400 });
    }

    const result = await deleteTopic(topicId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.topic,
      message: 'Topic deleted successfully.',
    });
  } catch (error: any) {
    console.error('[DELETE /api/admin/topics/[id] Exception]', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error.' }, { status: 500 });
  }
}
