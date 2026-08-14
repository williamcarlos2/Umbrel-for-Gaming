import { NextResponse } from 'next/server';
import { readValueHistoryCompat, upsertValueSnapshotCompat } from '@/lib/storageCompat';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await readValueHistoryCompat();
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const body = await req.json();
  const snapshot = await upsertValueSnapshotCompat(body);
  return NextResponse.json(snapshot);
}
