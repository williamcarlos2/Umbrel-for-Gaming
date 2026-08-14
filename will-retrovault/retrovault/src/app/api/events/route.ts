import { NextResponse } from 'next/server';
import {
  addEventCompat,
  deleteEventCompat,
  readEventsCompat,
  updateEventCompat,
} from '@/lib/storageCompat';

export const dynamic = 'force-dynamic';

export async function GET() {
  const events = await readEventsCompat();
  return NextResponse.json(events, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { action } = body;

  if (action === 'toggle_attending') {
    const events = await readEventsCompat();
    const existing = events.find((event) => event.id === body.id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const updated = await updateEventCompat(body.id, { attending: !existing.attending });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  }

  if (action === 'toggle_interested') {
    const events = await readEventsCompat();
    const existing = events.find((event) => event.id === body.id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const updated = await updateEventCompat(body.id, { interested: !existing.interested });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  }

  if (action === 'add_notes') {
    const updated = await updateEventCompat(body.id, { notes: body.notes || '' });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  }

  if (action === 'add_manual') {
    const event = await addEventCompat({
      title: body.title,
      dateRaw: body.date,
      date: body.date,
      location: body.location || '',
      venue: body.venue || '',
      url: body.url || '',
      source: 'manual',
      description: body.description || '',
      attending: body.attending || false,
      interested: body.interested || false,
      notes: body.notes || '',
    });
    return NextResponse.json(event);
  }

  if (action === 'delete') {
    const deleted = await deleteEventCompat(body.id);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
