/**
 * GET /api/v1/inventory
 *
 * Returns paginated game catalog with optional filters.
 *
 * Auth: API key required (read permission)
 *
 * Query params:
 *   platform   Filter to a specific platform (case-insensitive)
 *   owned      'true' | 'false' — filter by ownership
 *   q          Title search (substring match)
 *   has_price  'true' — only games with market data
 *   sort       'title' | 'platform' | 'marketLoose' | 'lastFetched'
 *   limit      Max results (default 100, max 1000)
 *   offset     Pagination offset (default 0)
 */
import { NextRequest } from 'next/server'
import { requireApiAuth, apiResponse, apiError } from '@/lib/apiAuth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { error } = requireApiAuth(req)
  if (error) return error

  const { searchParams } = new URL(req.url)
  const platform  = searchParams.get('platform')?.toLowerCase()
  const owned     = searchParams.get('owned')
  const q         = searchParams.get('q')?.toLowerCase()
  const hasPrice  = searchParams.get('has_price')
  const sortField = searchParams.get('sort') || 'title'
  const limit     = Math.min(parseInt(searchParams.get('limit') || '100'), 1000)
  const offset    = parseInt(searchParams.get('offset') || '0')

  try {
    // Build where clause
    const where: Record<string, unknown> = {}
    if (platform) where.platform = platform
    if (owned === 'true')  where.copies = { some: {} }
    if (owned === 'false') where.copies = { none: {} }
    if (q) where.title = { contains: q }
    if (hasPrice === 'true') where.marketLoose = { gt: 0 }

    // Build orderBy
    type OrderBy = Record<string, 'asc' | 'desc'>
    const ORDER_MAP: Record<string, OrderBy> = {
      title:       { title: 'asc' },
      platform:    { platform: 'asc' },
      marketLoose: { marketLoose: 'desc' },
      lastFetched: { lastFetched: 'desc' },
    }
    const orderBy = ORDER_MAP[sortField] ?? { title: 'asc' }

    const [total, games] = await Promise.all([
      prisma.game.count({ where }),
      prisma.game.findMany({
        where,
        include: { copies: true },
        orderBy,
        skip: offset,
        take: limit,
      }),
    ])

    const page = games.map(item => ({
      id:           item.id,
      title:        item.title,
      platform:     item.platform,
      copies:       item.copies.length,
      owned:        item.copies.length > 0,
      isDigital:    item.isDigital,
      condition:    item.copies[0]?.condition ?? null,
      hasBox:       item.copies[0]?.hasBox ?? false,
      hasManual:    item.copies[0]?.hasManual ?? false,
      priceAcquired: item.copies.reduce((s, c) => s + c.priceAcquired, 0),
      market: {
        loose:  item.marketLoose  ?? null,
        cib:    item.marketCib    ?? null,
        new:    item.marketNew    ?? null,
        graded: item.marketGraded ?? null,
      },
      lastFetched:  item.lastFetched?.toISOString() ?? null,
      purchaseDate: item.purchaseDate ?? null,
      source:       item.source ?? null,
      tags:         [],
    }))

    return apiResponse(page, { total, offset, limit, returned: page.length })
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : 'Failed to load inventory', 500)
  }
}
