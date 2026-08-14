import { NextResponse } from 'next/server';
import { writeDataFile } from '@/lib/data';
import { buildAchievementPayload, loadManualAchievements } from '@/lib/achievementContext';

export const dynamic = 'force-dynamic';

function saveManual(ids: string[]) {
  writeDataFile('achievements-unlocked.json', [...new Set(ids)]);
}

export async function GET() {
  return NextResponse.json(await buildAchievementPayload(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(req: Request) {
  const { action, id } = await req.json();
  if (action === 'unlock_manual') {
    const manual = loadManualAchievements();
    if (!manual.includes(id)) {
      manual.push(id);
      saveManual(manual);
    }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
