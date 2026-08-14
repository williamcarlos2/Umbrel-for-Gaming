/**
 * GET /api/v1/grails
 *
 * Returns the Holy Grail tracker list.
 *
 * Auth: API key required (read permission)
 *
 * Query params:
 *   status  'all' | 'hunting' | 'found' (default: 'all')
 */
import { NextRequest } from 'next/server'
import { requireApiAuth, apiResponse, apiError } from '@/lib/apiAuth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { error } = requireApiAuth(req)
  if (error) return error

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'all'

  try {
    const where =
      status === 'hunting' ? { acquiredAt: null } :
      status === 'found'   ? { NOT: { acquiredAt: null } } :
      {}

    const [data, huntingCount, foundCount] = await Promise.all([
      prisma.grail.findMany({ where, orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }] }),
      prisma.grail.count({ where: { acquiredAt: null } }),
      prisma.grail.count({ where: { NOT: { acquiredAt: null } } }),
    ])

    return apiResponse(data, {
      total:   data.length,
      hunting: huntingCount,
      found:   foundCount,
    })
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : 'Failed to load grails', 500)
  }
}
