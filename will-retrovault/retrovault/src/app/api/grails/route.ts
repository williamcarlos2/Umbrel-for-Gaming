import { NextResponse } from 'next/server';
import {
  acquireGrailCompat,
  addGrailCompat,
  deleteGrailCompat,
  readGrailsCompat,
  updateGrailCompat,
} from '@/lib/storageCompat';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await readGrailsCompat(), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { action } = body;

  if (action === 'add') {
    const entry = await addGrailCompat({
      title: body.title,
      platform: body.platform,
      notes: body.notes || '',
      priority: body.priority || 2,
    });
    return NextResponse.json(entry);
  }

  if (action === 'acquired') {
    const updated = await acquireGrailCompat(body.id);
    if (!updated) return NextResponse.json({ error: 'Grail not found' }, { status: 404 });
    return NextResponse.json(updated);
  }

  if (action === 'update') {
    const updated = await updateGrailCompat({ ...body, action: undefined });
    if (!updated) return NextResponse.json({ error: 'Grail not found' }, { status: 404 });
    return NextResponse.json(updated);
  }

  if (action === 'delete') {
    const deleted = await deleteGrailCompat(body.id);
    if (!deleted) return NextResponse.json({ error: 'Grail not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
