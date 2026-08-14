/**
 * GET /api/v1/achievements
 *
 * Returns evaluated achievement status: auto-unlocked IDs (computed from
 * collection context), manually unlocked IDs, and the full achievement catalog.
 *
 * Auth: API key required (read permission)
 */
import { NextRequest } from 'next/server';
import { requireApiAuth, apiResponse } from '@/lib/apiAuth';
import { ACHIEVEMENTS, getCompletionPercent, getTotalPoints } from '@/data/achievements';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error } = requireApiAuth(req);
  if (error) return error;

  // Fetch from the internal achievements API
  const baseUrl = req.nextUrl.origin;
  const ach = await fetch(`${baseUrl}/api/achievements`, { cache: 'no-store' })
    .then(r => r.json())
    .catch(() => ({ unlockedIds: [] }));

  const unlockedIds: string[] = ach.unlockedIds || [];
  const points = getTotalPoints(unlockedIds);

  const unlocked = ACHIEVEMENTS
    .filter(a => unlockedIds.includes(a.id) && !a.secret)
    .map(a => ({
      id: a.id,
      name: a.name,
      category: a.category,
      rarity: a.rarity,
      points: a.points,
      condition: a.condition,
    }));

  const locked = ACHIEVEMENTS
    .filter(a => !unlockedIds.includes(a.id) && !a.secret)
    .map(a => ({
      id: a.id,
      name: a.name,
      category: a.category,
      rarity: a.rarity,
      points: a.points,
      condition: a.condition,
    }));

  const nonSecretUnlockedIds = unlockedIds.filter(id => ACHIEVEMENTS.some(a => a.id === id && !a.secret));

  return apiResponse({
    summary: {
      unlocked: nonSecretUnlockedIds.length,
      total: ACHIEVEMENTS.filter(a => !a.secret).length,
      points,
      completionPercent: getCompletionPercent(nonSecretUnlockedIds),
    },
    unlocked,
    locked,
  });
}
