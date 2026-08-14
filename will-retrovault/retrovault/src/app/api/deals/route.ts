import { NextResponse } from 'next/server';
import {
  clearDismissedDealsCompat,
  readDealsCompat,
  updateDealDismissedCompat,
} from '@/lib/storageCompat';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const source = (url.searchParams.get('source') || 'all') as 'craigslist' | 'reddit' | 'all';
  return NextResponse.json(readDealsCompat(source), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { action, id, source } = body as { action: string; id?: string; source?: 'craigslist' | 'reddit' };

  if (!source || !['craigslist', 'reddit'].includes(source)) {
    return NextResponse.json({ error: 'Valid source required' }, { status: 400 });
  }

  if (action === 'dismiss') {
    const updated = updateDealDismissedCompat(source, id || '', true);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  }
  if (action === 'restore') {
    const updated = updateDealDismissedCompat(source, id || '', false);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  }
  if (action === 'clear_dismissed') {
    const removed = clearDismissedDealsCompat(source);
    return NextResponse.json({ ok: true, removed });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
