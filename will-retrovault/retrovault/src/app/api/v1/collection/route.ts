/**
 * GET /api/v1/collection
 *
 * Returns a high-level summary of the entire collection: game counts, total value,
 * P&L totals, grail/watchlist status, and play log stats.
 *
 * Auth: API key required (read permission)
 * Powered by: Prisma/SQLite parallel aggregations
 */
import { NextRequest } from 'next/server'
import { requireApiAuth, apiResponse, apiError } from '@/lib/apiAuth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { error } = requireApiAuth(req)
  if (error) return error

  try {
    const [
      totalGames,
      ownedGames,
      digitalGames,
      platformGroups,
      valueAgg,
      cibAgg,
      copiesAgg,
      salesAgg,
      salesCount,
      grailsActive,
      grailsFound,
      watchlistCount,
      playlogTotal,
      playlogBeaten,
      playlogPlaying,
      playlogBacklog,
    ] = await Promise.all([
      prisma.game.count(),
      prisma.game.count({ where: { copies: { some: {} }, isDigital: false } }),
      prisma.game.count({ where: { copies: { some: {} }, isDigital: true } }),
      prisma.game.groupBy({ by: ['platform'], where: { copies: { some: {} } } }),
      prisma.game.aggregate({ _sum: { marketLoose: true }, where: { copies: { some: {} }, isDigital: false } }),
      prisma.game.aggregate({ _sum: { marketCib: true }, where: { copies: { some: {} }, isDigital: false } }),
      prisma.gameCopy.aggregate({ _sum: { priceAcquired: true } }),
      prisma.sale.aggregate({ _sum: { salePrice: true } }),
      prisma.sale.count(),
      prisma.grail.count({ where: { acquiredAt: null } }),
      prisma.grail.count({ where: { NOT: { acquiredAt: null } } }),
      prisma.watchlistItem.count(),
      prisma.playLogEntry.count(),
      prisma.playLogEntry.count({ where: { status: 'beat' } }),
      prisma.playLogEntry.count({ where: { status: 'playing' } }),
      prisma.playLogEntry.count({ where: { status: 'backlog' } }),
    ])

    const totalValue  = valueAgg._sum.marketLoose ?? 0
    const totalCib    = (cibAgg._sum.marketCib ?? 0) || totalValue
    const totalPaid   = copiesAgg._sum.priceAcquired ?? 0
    const saleRevenue = salesAgg._sum.salePrice ?? 0
    const platforms   = platformGroups.map((p: { platform: string }) => p.platform)

    return apiResponse({
      games: {
        total: totalGames,
        owned: ownedGames,
        platforms: platforms.length,
        digital: digitalGames,
      },
      value: {
        loose:          Math.round(totalValue  * 100) / 100,
        cib:            Math.round(totalCib    * 100) / 100,
        paid:           Math.round(totalPaid   * 100) / 100,
        unrealizedGain: Math.round((totalValue - totalPaid) * 100) / 100,
      },
      business: {
        totalSales:  salesCount,
        saleRevenue: Math.round(saleRevenue * 100) / 100,
        totalProfit: Math.round((saleRevenue - totalPaid) * 100) / 100,
      },
      hunting: {
        grailsActive,
        grailsFound,
        watchlistItems: watchlistCount,
      },
      personal: {
        playlogGames:     playlogTotal,
        gamesBeaten:      playlogBeaten,
        currentlyPlaying: playlogPlaying,
        backlog:          playlogBacklog,
      },
      platforms,
    })
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : 'Failed to compute collection stats', 500)
  }
}
