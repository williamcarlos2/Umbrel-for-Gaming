"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

type Video = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  viewCount?: string | null;
  publishedAt: string;
};

type VideoType = "playthrough" | "walkthrough" | "review" | "trailer" | "longplay";

type Props = {
  game: string;
  platform: string;
  type?: VideoType;
};

const TYPE_OPTIONS: { id: VideoType; label: string }[] = [
  { id: "playthrough", label: "▶ Playthrough" },
  { id: "walkthrough", label: "📖 Walkthrough" },
  { id: "review",      label: "⭐ Review" },
  { id: "longplay",    label: "🎮 Longplay" },
];

function fmtViews(n?: string | null): string {
  if (!n) return "";
  const num = parseInt(n);
  if (isNaN(num)) return "";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M views`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K views`;
  return `${num} views`;
}

export function YouTubePanel({ game, platform, type: initialType = "playthrough" }: Props) {
  const [type, setType] = useState(initialType);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = async (t: VideoType = type) => {
    if (configured === false) return; // Don't try if not configured
    setLoading(true);
    setError(null);
    setVideos([]);
    setActiveVideo(null);
    try {
      const res = await fetch(
        `/api/youtube?game=${encodeURIComponent(game)}&platform=${encodeURIComponent(platform)}&type=${t}`
      );
      const data = await res.json();
      if (data.videos) setVideos(data.videos);
      if (!data.videos?.length) setError("No videos found for this game.");
    } catch {
      setError("Failed to load videos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Quick config check before loading
    fetch(`/api/youtube?game=${encodeURIComponent(game)}&platform=${encodeURIComponent(platform)}&type=${type}`)
      .then(r => r.json())
      .then(data => {
        setConfigured(data.configured !== false);
        if (data.configured !== false) {
          setVideos(data.videos || []);
          if (!data.videos?.length) setError('No videos found.');
        }
        setLoading(false);
      })
      .catch(() => { setError('Failed to load.'); setLoading(false); });
  }, [game, platform, type]);

  const switchType = (t: VideoType) => {
    setType(t);
    fetchVideos(t);
  };

  // Still checking config
  if (configured === null && loading) return null;

  // Not configured — show a small unobtrusive hint with a settings link
  if (configured === false) {
    return (
      <div className="mt-5 border-t border-zinc-900 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-zinc-700 font-terminal text-xs flex items-center gap-1.5">
            📺 Videos not enabled
          </span>
          <a href="/settings#youtube" className="text-zinc-700 hover:text-blue-500 font-terminal text-xs transition-colors">
            Enable in Settings →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 border-t-2 border-zinc-800 pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-red-500 text-lg">📺</span>
          <h4 className="text-zinc-400 font-terminal text-base uppercase">Videos</h4>
        </div>
        {/* Type selector */}
        <div className="flex gap-1 flex-wrap justify-end">
          {TYPE_OPTIONS.map(t => (
            <button key={t.id} onClick={() => switchType(t.id)}
              className={`px-2 py-0.5 font-terminal text-xs border transition-colors ${
                type === t.id ? "border-red-700 bg-red-950/30 text-red-400" : "border-zinc-800 text-zinc-600 hover:border-zinc-600"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-zinc-600 font-terminal text-sm animate-pulse py-3">Searching YouTube...</div>
      )}

      {error && !loading && (
        <div className="text-zinc-600 font-terminal text-sm py-2">{error}</div>
      )}

      {/* Inline player */}
      {activeVideo && (
        <div className="mb-3">
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              className="absolute inset-0 w-full h-full border border-zinc-700"
              src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1&rel=0`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <button onClick={() => setActiveVideo(null)}
            className="text-zinc-600 hover:text-zinc-400 font-terminal text-xs mt-1 transition-colors">
            ✕ Close player
          </button>
        </div>
      )}

      {/* Video cards */}
      {!loading && videos.length > 0 && (
        <div className="space-y-2">
          {videos.map(v => (
            <div key={v.videoId} className={`border transition-colors cursor-pointer group ${
              activeVideo === v.videoId ? "border-red-700 bg-red-950/10" : "border-zinc-800 hover:border-zinc-600"
            }`}
              onClick={() => setActiveVideo(activeVideo === v.videoId ? null : v.videoId)}>
              <div className="flex gap-3 p-2">
                {/* Thumbnail */}
                <div className="relative shrink-0 w-24 h-14 bg-zinc-900 overflow-hidden">
                  <Image src={v.thumbnail} alt="" fill sizes="96px" className="object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                    <span className="text-white text-xl">▶</span>
                  </div>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-200 font-terminal text-xs leading-tight line-clamp-2">{v.title}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className="text-zinc-600 font-terminal text-xs">{v.channelTitle}</span>
                    {v.viewCount && (
                      <span className="text-zinc-700 font-terminal text-xs">{fmtViews(v.viewCount)}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex flex-col justify-between items-end gap-1">
                  <a href={`https://www.youtube.com/watch?v=${v.videoId}`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-zinc-700 hover:text-red-500 font-terminal text-xs transition-colors">
                    ↗
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
