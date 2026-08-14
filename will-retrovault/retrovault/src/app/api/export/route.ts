import { NextResponse } from 'next/server';
import fs from 'fs';
import { NextRequest } from 'next/server';
import { resolveDataPath } from '@/lib/runtimeDataPaths';

export const dynamic = 'force-dynamic';

const PUBLIC_FILES = [
  'inventory.json', 'favorites.json', 'sales.json', 'acquisitions.json',
  'watchlist.json', 'goals.json', 'grails.json', 'playlog.json',
  'tags.json', 'events.json', 'whatnot.json', 'value-history.json',
  'achievements-unlocked.json', 'app.config.json',
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get('file');

  // Single file export
  if (file && PUBLIC_FILES.includes(file)) {
    const filePath = resolveDataPath(file);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${file}"`,
        'Cache-Control': 'no-store',
      }
    });
  }

  // Full collection export as JSON bundle
  const bundle: Record<string, unknown> = {
    _meta: {
      exportedAt: new Date().toISOString(),
      version: '2.0.0',
      description: 'RetroVault collection export',
    }
  };

  for (const f of PUBLIC_FILES) {
    const filePath = resolveDataPath(f);
    if (fs.existsSync(filePath)) {
      try {
        bundle[f.replace('.json', '')] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch { /* skip malformed */ }
    }
  }

  const json = JSON.stringify(bundle, null, 2);
  const date = new Date().toISOString().split('T')[0];

  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="retrovault-export-${date}.json"`,
      'Cache-Control': 'no-store',
    }
  });
}
