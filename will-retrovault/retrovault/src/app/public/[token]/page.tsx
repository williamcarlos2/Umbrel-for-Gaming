import { notFound } from "next/navigation";
import fs from "fs";
import prisma from "@/lib/prisma";
import { getConfigPath } from "@/lib/runtimeDataPaths";
import { getCopyDisplayLabel } from "@/lib/copyCondition";
import { readInventoryCompat } from "@/lib/storageCompat";

type PublicInventoryItem = { id: string; title: string; platform: string; copies?: { condition?: string; priceAcquired?: string | number; hasBox: boolean; hasManual: boolean }[]; isDigital?: boolean };

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ token: string }> };

export default async function PublicCollectionPage({ params }: Props) {
  const { token } = await params;
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) return notFound();

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const share = await prisma.collectionShare.findUnique({ where: { token } });
  if (!share) return notFound();

  const expired = share.expiresAt && new Date(share.expiresAt) < new Date();
  if (expired) {
    return (
      <div className="min-h-screen bg-zinc-950 text-green-400 font-terminal flex items-center justify-center p-6">
        <div className="max-w-md text-center border-4 border-zinc-800 p-10">
          <div className="text-5xl mb-4">⏳</div>
          <h1 className="text-2xl uppercase tracking-widest text-zinc-500 mb-3">Link Expired</h1>
          <p className="text-zinc-600 text-sm">This collection share link has expired. Ask the owner to generate a new one.</p>
        </div>
      </div>
    );
  }

  const inventory = await readInventoryCompat();
  const owned = (inventory as PublicInventoryItem[]).filter((i) => (i.copies || []).length > 0 && !i.isDigital);

  const platforms = [...new Set(owned.map((i) => i.platform))] as string[];
  const platformCounts: Record<string, number> = {};
  for (const item of owned) {
    platformCounts[item.platform] = (platformCounts[item.platform] || 0) + 1;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-green-400 font-terminal p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="border-4 border-green-800 p-6 mb-8 text-center shadow-[0_0_20px_rgba(34,197,94,0.2)]">
          <div className="text-4xl mb-2">👾</div>
          <h1 className="text-3xl uppercase tracking-widest text-green-400 mb-1">
            {config.ownerName ? `${config.ownerName}'s Collection` : (config.appName || "RetroVault")}
          </h1>
          <p className="text-zinc-500 text-sm">{owned.length} games across {platforms.length} platforms</p>

          {config.shareContact && (config.contactEmail || config.contactPhone || config.ownerName) && (
            <div className="mt-5 pt-4 border-t border-green-900 flex flex-wrap justify-center gap-4">
              {config.ownerName && (
                <span className="flex items-center gap-1.5 text-zinc-400 text-sm font-terminal">
                  <span className="text-green-700">👤</span> {config.ownerName}
                </span>
              )}
              {config.contactEmail && (
                <a href={`mailto:${config.contactEmail}`}
                  className="flex items-center gap-1.5 text-green-400 hover:text-green-200 text-sm font-terminal transition-colors underline underline-offset-2">
                  <span>✉️</span> {config.contactEmail}
                </a>
              )}
              {config.contactPhone && (
                <a href={`tel:${config.contactPhone}`}
                  className="flex items-center gap-1.5 text-green-400 hover:text-green-200 text-sm font-terminal transition-colors underline underline-offset-2">
                  <span>📞</span> {config.contactPhone}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Platform breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
          {Object.entries(platformCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([plat, count]) => (
              <div key={plat} className="border border-green-900 bg-black p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{count}</div>
                <div className="text-zinc-500 text-xs">{plat}</div>
              </div>
            ))}
        </div>

        {/* Games by platform */}
        {platforms.sort().map(plat => {
          const games = owned.filter((i) => i.platform === plat);
          return (
            <div key={plat} className="mb-6">
              <h2 className="text-green-600 uppercase text-lg border-b border-green-900 pb-1 mb-3">{plat} ({games.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {games.sort((a, b) => a.title.localeCompare(b.title)).map((game) => {
                  const copy = game.copies?.[0];
                  return (
                    <div key={game.id} className="border border-zinc-800 p-2 hover:border-zinc-600 transition-colors">
                      <div className="text-zinc-200 text-sm truncate">{game.title}</div>
                      <div className="text-zinc-600 text-xs flex gap-2 mt-0.5">
                        {copy?.condition && <span>{copy.condition}</span>}
                        {copy && <span className={getCopyDisplayLabel(copy) === 'CIB' ? 'text-green-700' : getCopyDisplayLabel(copy) === 'Loose' ? 'text-zinc-500' : 'text-yellow-700'}>{getCopyDisplayLabel(copy)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="mt-8 text-center text-zinc-700 text-xs border-t border-zinc-900 pt-4 space-y-1">
          <p>Powered by RetroVault · Read-only public view · Prices and business data not shown</p>
          {config.githubRepo && (
            <p>
              <a
                href={`https://github.com/${config.githubRepo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-600 hover:text-green-600 transition-colors underline underline-offset-2">
                github.com/{config.githubRepo}
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
