import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { resolveDataPath } from '@/lib/runtimeDataPaths';

export const dynamic = 'force-dynamic';

const CACHE_TTL_DAYS = 30; // re-fetch after 30 days

function getCacheFilePath() {
  return resolveDataPath('youtube-cache.json');
}

type CachedVideo = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  viewCount?: string;
  publishedAt: string;
};

type YouTubeSearchItem = { id: { videoId: string }; snippet: { title: string; channelTitle: string; thumbnails?: { medium?: { url?: string }; default?: { url?: string } }; publishedAt: string } };
type YouTubeStatsItem = { id: string; statistics?: { viewCount?: string } };
type YouTubeErrorPayload = { error?: { message?: string } };
type YouTubeSearchPayload = { items?: YouTubeSearchItem[] };
type YouTubeStatsPayload = { items?: YouTubeStatsItem[] };

type CacheEntry = {
  key: string;
  videos: CachedVideo[];
  fetchedAt: string;
};

function loadCache(): Record<string, CacheEntry> {
  const cacheFile = getCacheFilePath();
  if (!fs.existsSync(cacheFile)) return {};
  try { return JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch { return {}; }
}

function saveCache(cache: Record<string, CacheEntry>) {
  const cacheFile = getCacheFilePath();
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
}

function isCacheValid(entry: CacheEntry): boolean {
  const age = (Date.now() - new Date(entry.fetchedAt).getTime()) / 86400000;
  return age < CACHE_TTL_DAYS;
}

function makeCacheKey(game: string, platform: string, type: string): string {
  return `${type}:${platform.toLowerCase()}:${game.toLowerCase()}`.replace(/[^a-z0-9:]/g, '-');
}

async function searchYouTube(query: string, maxResults = 3): Promise<CachedVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: maxResults.toString(),
    relevanceLanguage: 'en',
    videoEmbeddable: 'true',
    key: apiKey,
  });

  const searchUrl = `https://www.googleapis.com/youtube/v3/search?${params}`;

  try {
    const res = await fetch(searchUrl);
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as YouTubeErrorPayload;
      console.error('YouTube API error:', res.status, err.error?.message);
      return [];
    }
    const data = await res.json() as YouTubeSearchPayload;
    const items = data.items || [];

    if (items.length === 0) return [];

    // Get video stats (view counts)
    const videoIds = items.map((i) => i.id.videoId).join(',');
    const statsParams = new URLSearchParams({ part: 'statistics', id: videoIds, key: apiKey });
    const statsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?${statsParams}`);
    const statsData = (statsRes.ok ? await statsRes.json() : { items: [] }) as YouTubeStatsPayload;
    const statsMap: Record<string, string> = {};
    for (const sv of (statsData.items || [])) {
      statsMap[sv.id] = sv.statistics?.viewCount || '0';
    }

    return items.map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
      viewCount: statsMap[item.id.videoId],
      publishedAt: item.snippet.publishedAt,
    }));
  } catch (e: unknown) {
    console.error('YouTube fetch error:', e instanceof Error ? e.message : 'Unknown error');
    return [];
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const game     = searchParams.get('game') || '';
  const platform = searchParams.get('platform') || '';
  const type     = searchParams.get('type') || 'playthrough'; // playthrough | walkthrough | review | trailer

  if (!game) {
    return NextResponse.json({ error: 'Missing game parameter' }, { status: 400 });
  }

  // Check if configured
  if (!process.env.YOUTUBE_API_KEY) {
    return NextResponse.json({
      configured: false,
      videos: [],
      message: 'Add YOUTUBE_API_KEY to .env.local to enable video lookup.'
    });
  }

  const cacheKey = makeCacheKey(game, platform, type);
  const cache = loadCache();

  // Return from cache if valid
  if (cache[cacheKey] && isCacheValid(cache[cacheKey])) {
    return NextResponse.json({
      configured: true,
      cached: true,
      videos: cache[cacheKey].videos,
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  // Build search query based on type
  const queries: Record<string, string> = {
    playthrough: `${game} ${platform} full playthrough no commentary`,
    walkthrough: `${game} ${platform} walkthrough`,
    review: `${game} ${platform} review`,
    trailer: `${game} ${platform} official trailer gameplay`,
    longplay: `${game} ${platform} longplay`,
  };

  const query = queries[type] || `${game} ${platform} ${type}`;

  const videos = await searchYouTube(query, 3);

  // Cache the result
  cache[cacheKey] = {
    key: cacheKey,
    videos,
    fetchedAt: new Date().toISOString(),
  };
  saveCache(cache);

  return NextResponse.json({
    configured: true,
    cached: false,
    videos,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

// DELETE to clear cache for a specific game
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const game     = searchParams.get('game') || '';

  if (game === 'all') {
    saveCache({});
    return NextResponse.json({ cleared: true, message: 'Full cache cleared' });
  }

  const cache = loadCache();
  const keysToDelete = Object.keys(cache).filter(k =>
    k.includes(game.toLowerCase().replace(/[^a-z0-9]/g, '-'))
  );
  for (const k of keysToDelete) delete cache[k];
  saveCache(cache);

  return NextResponse.json({ cleared: true, deletedKeys: keysToDelete.length });
}
