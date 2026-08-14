import { NextResponse } from 'next/server';
import {
  addMentionCompat,
  addTagCompat,
  deleteMentionCompat,
  readTagsCompat,
  removeTagCompat,
} from '@/lib/storageCompat';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await readTagsCompat(), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { action, entityId, entityType, tag, mention } = body;

  if (action === 'add_tag') {
    const tags = await addTagCompat(entityId, entityType, tag);
    return NextResponse.json({ tags });
  }

  if (action === 'remove_tag') {
    const tags = await removeTagCompat(entityId, entityType, tag);
    return NextResponse.json({ tags });
  }

  if (action === 'add_mention') {
    const entry = await addMentionCompat(mention);
    return NextResponse.json(entry);
  }

  if (action === 'delete_mention') {
    const removed = await deleteMentionCompat(body.personId, body.mentionId);
    if (!removed) return NextResponse.json({ error: 'Mention not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
