import { NextResponse } from 'next/server';
import {
  deletePlaylogCompat,
  readPlaylogCompat,
  setPlaylogStatusCompat,
  upsertPlaylogCompat,
} from '@/lib/storageCompat';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await readPlaylogCompat(), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { action } = body;

  if (action === 'upsert') {
    const entry = await upsertPlaylogCompat({
      id: body.id || `${body.title}-${body.platform}-${Date.now()}`.replace(/\s+/g, '-').toLowerCase(),
      title: body.title,
      platform: body.platform,
      status: body.status,
      rating: body.rating,
      notes: body.notes,
      startedAt: body.startedAt,
      finishedAt: body.finishedAt,
    });
    return NextResponse.json(entry);
  }

  if (action === 'delete') {
    const deleted = await deletePlaylogCompat(body.id);
    if (!deleted) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'set_status') {
    const updated = await setPlaylogStatusCompat(body.id, body.status);
    if (!updated) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
