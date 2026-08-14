/**
 * GET /api/v1/watchlist
 *
 * Returns watchlist items enriched with current market prices from the catalog.
 * alertTriggered=true when the current market price is at or below the alert threshold.
 *
 * Auth: API key required (read permission)
 */
import { NextRequest } from 'next/server'
import { requireApiAuth, apiResponse, apiError } from '@/lib/apiAuth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { error } = requireApiAuth(req)
  if (error) return error

  try {
    const items = await prisma.watchlistItem.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Enrich with current market prices from Game catalog
    const gameIds = items.map(i => i.gameId).filter((id): id is string => !!id)
    const games = gameIds.length > 0
      ? await prisma.game.findMany({ where: { id: { in: gameIds } }, select: { id: true, marketLoose: true } })
      : []
    const priceMap = Object.fromEntries(games.map(g => [g.id, g.marketLoose]))

    const enriched = items.map(item => {
      const market = item.gameId ? (priceMap[item.gameId] ?? null) : null
      const target = item.alertPrice
      return {
        ...item,
        currentPrice:    market,
        alertTriggered:  market != null && market > 0 && target > 0 && market <= target,
        priceDifference: market != null && target > 0
          ? Math.round((market - target) * 100) / 100
          : null,
      }
    })

    const alerts = enriched.filter(i => i.alertTriggered)
    return apiResponse(enriched, { total: enriched.length, alertsTriggered: alerts.length })
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : 'Failed to load watchlist', 500)
  }
}
