import { NextResponse } from 'next/server';
import { resolveSteamTarget } from '@/lib/steam';

export const dynamic = 'force-dynamic';

function detectFetchability(html: string) {
  const isPrivate = html.includes('profile_private') || html.includes('This profile is private');
  const hasProfileShell = html.includes('profile_header') || html.includes('profile_item_links') || html.includes('Steam Community ::');
  const loginWalledGames = html.includes('<title>Sign In</title>') || html.includes('g_steamID = false');

  return {
    isPrivate,
    hasProfileShell,
    loginWalledGames,
    readable: hasProfileShell && !isPrivate,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const input = typeof body?.input === 'string' ? body.input : '';
    const resolved = resolveSteamTarget(input);

    if (!resolved.normalizedProfileUrl) {
      return NextResponse.json({ error: 'A valid Steam profile target is required' }, { status: 400 });
    }

    const response = await fetch(resolved.normalizedProfileUrl, {
      headers: {
        'User-Agent': 'RetroVault/SteamConnectorPreview',
      },
      cache: 'no-store',
    });

    const html = await response.text();
    const detection = detectFetchability(html);

    return NextResponse.json({
      ok: true,
      target: resolved.normalizedProfileUrl,
      resolved,
      fetchability: {
        httpStatus: response.status,
        ...detection,
        recommendation: detection.isPrivate
          ? 'Profile is private. Ask the user to temporarily expose Game Details before live import.'
          : detection.readable
            ? 'Profile shell is publicly readable. Safe to continue toward live preview wiring.'
            : 'Profile could not be confidently classified yet. Manual review recommended.',
      },
      dryRun: true,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to check Steam profile fetchability' }, { status: 500 });
  }
}
