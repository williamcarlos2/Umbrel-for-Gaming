/**
 * GET /api/v1/sales
 *
 * Returns sales and acquisition history with aggregate P&L totals.
 *
 * Auth: API key required (read permission)
 *
 * Query params:
 *   type    'sales' | 'acquisitions' | 'both' (default: 'both')
 *   limit   Max records per type (default 100, max 1000)
 *   offset  Pagination offset
 */
import { NextRequest } from 'next/server'
import { requireApiAuth, apiResponse, apiError } from '@/lib/apiAuth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { error } = requireApiAuth(req)
  if (error) return error

  const { searchParams } = new URL(req.url)
  const type   = searchParams.get('type') || 'both'
  const limit  = Math.min(parseInt(searchParams.get('limit') || '100'), 1000)
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    const [
      sales,
      acquisitions,
      salesAgg,
      acqAgg,
      salesTotal,
      acqTotal,
    ] = await Promise.all([
      type !== 'acquisitions'
        ? prisma.sale.findMany({ orderBy: { saleDate: 'desc' }, skip: offset, take: limit })
        : Promise.resolve([]),
      type !== 'sales'
        ? prisma.acquisition.findMany({ orderBy: { purchaseDate: 'desc' }, skip: offset, take: limit })
        : Promise.resolve([]),
      prisma.sale.aggregate({ _sum: { salePrice: true } }),
      prisma.acquisition.aggregate({ _sum: { cost: true } }),
      prisma.sale.count(),
      prisma.acquisition.count(),
    ])

    const revenue = salesAgg._sum.salePrice ?? 0
    const spent   = acqAgg._sum.cost ?? 0

    const result: Record<string, unknown> = {}
    if (type === 'sales' || type === 'both') result.sales = sales
    if (type === 'acquisitions' || type === 'both') result.acquisitions = acquisitions

    return apiResponse(result, {
      totals: {
        salesCount:        salesTotal,
        acquisitionsCount: acqTotal,
        revenue:           Math.round(revenue * 100) / 100,
        spent:             Math.round(spent   * 100) / 100,
        profit:            Math.round((revenue - spent) * 100) / 100,
      },
    })
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : 'Failed to load sales', 500)
  }
}
