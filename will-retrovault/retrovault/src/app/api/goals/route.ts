import { NextResponse } from 'next/server';
import { readGoalsCompat, setGoalPriorityCompat } from '@/lib/storageCompat';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await readGoalsCompat(), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const { platform, priority } = await req.json();
  await setGoalPriorityCompat(platform, priority);
  return NextResponse.json({ ok: true });
}
