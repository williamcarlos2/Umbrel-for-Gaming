import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const share = await prisma.wishlistShare.findUnique({ where: { token } })
    if (!share) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const items = await prisma.wishlistItem.findMany({
      where:   { foundAt: null },
      orderBy: [{ priority: 'asc' }, { addedAt: 'desc' }],
      select:  { id: true, title: true, platform: true, priority: true, notes: true, addedAt: true },
    })

    return NextResponse.json({ label: share.label, items })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error' }, { status: 500 })
  }
}
