import { NextResponse } from 'next/server';
import {
  addWhatnotSellerCompat,
  addWhatnotStreamCompat,
  readWhatnotCompat,
  removeWhatnotSellerCompat,
  updateWhatnotSellerCompat,
  updateWhatnotStreamCompat,
} from '@/lib/storageCompat';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await readWhatnotCompat();
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { action } = body;

  if (action === 'add_seller') {
    const seller = await addWhatnotSellerCompat({
      username: body.username,
      displayName: body.displayName || body.username,
      specialty: body.specialty || '',
      twitterUrl: body.twitterUrl || '',
      instagramUrl: body.instagramUrl || '',
      notes: body.notes || '',
      notifyBefore: body.notifyBefore || 30,
    });
    return NextResponse.json(seller);
  }

  if (action === 'remove_seller') {
    const deleted = await removeWhatnotSellerCompat(body.username);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'add_stream') {
    const stream = await addWhatnotStreamCompat({
      seller: body.seller,
      title: body.title || `${body.seller} live stream`,
      startTime: body.startTime,
      scheduledText: body.scheduledText,
      url: body.url || `https://www.whatnot.com/user/${body.seller}`,
      attending: body.attending || false,
    });
    return NextResponse.json(stream);
  }

  if (action === 'dismiss_stream') {
    return NextResponse.json({ ok: true, deferred: true });
  }

  if (action === 'attending') {
    const data = await readWhatnotCompat();
    const existing = data.streams.find((stream) => stream.id === body.id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const updated = await updateWhatnotStreamCompat(body.id, { attending: !existing.attending });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  }

  if (action === 'update_seller') {
    const updated = await updateWhatnotSellerCompat(body.username, {
      displayName: body.displayName,
      specialty: body.specialty,
      twitterUrl: body.twitterUrl,
      instagramUrl: body.instagramUrl,
      notes: body.notes,
      notifyBefore: body.notifyBefore,
    });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
