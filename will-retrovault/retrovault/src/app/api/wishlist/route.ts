import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const items = await prisma.wishlistItem.findMany({
      include: {
        player: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: [{ priority: 'asc' }, { addedAt: 'desc' }],
    })
    return NextResponse.json({ items })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.title || !body.platform) {
      return NextResponse.json({ error: 'title and platform are required' }, { status: 400 })
    }
    const item = await prisma.wishlistItem.create({
      data: {
        title:    body.title,
        platform: body.platform,
        gameId:   body.gameId   ?? null,
        playerId: body.playerId ?? null,
        priority: body.priority ?? 2,
        notes:    body.notes    ?? null,
        marketLoose: body.marketLoose != null ? Number(body.marketLoose) : null,
        marketCib: body.marketCib != null ? Number(body.marketCib) : null,
        marketNew: body.marketNew != null ? Number(body.marketNew) : null,
        marketGraded: body.marketGraded != null ? Number(body.marketGraded) : null,
        lastFetched: body.lastFetched ? new Date(body.lastFetched) : null,
      },
    })
    return NextResponse.json({ item }, { status: 201 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error' }, { status: 500 })
  }
}
