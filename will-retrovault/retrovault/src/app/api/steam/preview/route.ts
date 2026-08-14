import { NextResponse } from 'next/server';
import { readInventoryCompat } from '@/lib/storageCompat';
import { findInventoryMatch, normalizeText } from '@/lib/fieldMode';

export const dynamic = 'force-dynamic';

type PreviewInput = {
  titles?: string[];
  platform?: string;
};

function classifyTitle(title: string, inventory: Awaited<ReturnType<typeof readInventoryCompat>>, platform: string) {
  const direct = findInventoryMatch(inventory, title, platform);
  if (direct) {
    return {
      title,
      platform,
      status: 'likely_match',
      matchedInventoryId: direct.id,
      matchedTitle: direct.title,
      matchedPlatform: direct.platform,
      notes: 'Exact title/platform match already exists in RetroVault.',
    };
  }

  const fuzzy = inventory.find(item => normalizeText(item.title) === normalizeText(title));
  if (fuzzy) {
    return {
      title,
      platform,
      status: 'needs_review',
      matchedInventoryId: fuzzy.id,
      matchedTitle: fuzzy.title,
      matchedPlatform: fuzzy.platform,
      notes: 'Matching title found on a different platform. Review before import.',
    };
  }

  return {
    title,
    platform,
    status: 'possible_import',
    matchedInventoryId: null,
    matchedTitle: null,
    matchedPlatform: null,
    notes: 'No existing RetroVault entry found. Candidate for future import.',
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as PreviewInput;
    const titles = Array.isArray(body.titles)
      ? body.titles.map((title) => String(title).trim()).filter(Boolean)
      : [];
    const platform = typeof body.platform === 'string' && body.platform.trim()
      ? body.platform.trim()
      : 'PC (Steam)';

    if (titles.length === 0) {
      return NextResponse.json({ error: 'At least one Steam title is required for preview' }, { status: 400 });
    }

    const inventory = await readInventoryCompat();
    const rows = titles.map((title) => classifyTitle(title, inventory, platform));
    const summary = {
      total: rows.length,
      likelyMatch: rows.filter((row) => row.status === 'likely_match').length,
      possibleImport: rows.filter((row) => row.status === 'possible_import').length,
      needsReview: rows.filter((row) => row.status === 'needs_review').length,
    };

    return NextResponse.json({
      ok: true,
      platform,
      summary,
      rows,
      dryRun: true,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to build Steam import preview' }, { status: 500 });
  }
}
