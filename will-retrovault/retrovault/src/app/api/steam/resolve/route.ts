import { NextResponse } from 'next/server';
import { resolveSteamTarget } from '@/lib/steam';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const input = typeof body?.input === 'string' ? body.input : '';
    const resolved = resolveSteamTarget(input);

    return NextResponse.json({
      ok: true,
      resolved,
      preview: resolved.canPreview
        ? {
            target: resolved.normalizedProfileUrl,
            importMode: resolved.importMode,
            suggestedPlatform: resolved.suggestedPlatform,
            steps: [
              'Resolve profile target',
              'Verify Steam Community visibility',
              'Fetch owned-games listing in a later slice',
              'Normalize titles before any inventory write',
              'Dry-run dedupe against existing RetroVault entries',
            ],
          }
        : null,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to resolve Steam target' }, { status: 500 });
  }
}
