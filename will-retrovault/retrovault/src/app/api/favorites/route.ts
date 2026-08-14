import { NextResponse } from 'next/server';
import {
  addPersonCompat,
  readFavoritesCompat,
  removePersonCompat,
  renamePersonCompat,
  toggleFavoriteCompat,
  toggleRegretCompat,
} from '@/lib/storageCompat';

export async function GET() {
  return NextResponse.json(await readFavoritesCompat(), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (body.action === 'add_person') {
    const newPerson = await addPersonCompat(body.name.trim(), body.color ?? null);
    return NextResponse.json(newPerson);
  }

  if (body.action === 'rename_person') {
    const person = await renamePersonCompat(body.id, body.name.trim(), body.color);
    if (!person) return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    return NextResponse.json(person);
  }

  if (body.action === 'remove_person') {
    const removed = await removePersonCompat(body.id);
    if (!removed) return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'toggle_favorite') {
    const favorites = await toggleFavoriteCompat(body.personId, body.gameId);
    return NextResponse.json({ favorites });
  }

  if (body.action === 'toggle_regret') {
    const regrets = await toggleRegretCompat(body.personId, body.gameId);
    return NextResponse.json({ regrets });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
