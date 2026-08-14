import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const item = await prisma.wishlistItem.update({
      where: { id },
      data: {
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.notes    !== undefined && { notes: body.notes }),
        ...(body.foundAt  !== undefined && {
          foundAt: body.foundAt ? new Date(body.foundAt) : null,
        }),
        ...(body.title    !== undefined && { title: body.title }),
        ...(body.platform !== undefined && { platform: body.platform }),
        ...(body.playerId !== undefined && { playerId: body.playerId || null }),
        ...(body.marketLoose !== undefined && { marketLoose: body.marketLoose != null ? Number(body.marketLoose) : null }),
        ...(body.marketCib !== undefined && { marketCib: body.marketCib != null ? Number(body.marketCib) : null }),
        ...(body.marketNew !== undefined && { marketNew: body.marketNew != null ? Number(body.marketNew) : null }),
        ...(body.marketGraded !== undefined && { marketGraded: body.marketGraded != null ? Number(body.marketGraded) : null }),
        ...(body.lastFetched !== undefined && { lastFetched: body.lastFetched ? new Date(body.lastFetched) : null }),
      },
    })
    return NextResponse.json({ item })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error' }, { status: 500 })
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.wishlistItem.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error' }, { status: 500 })
  }
}
