import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    let share = await prisma.wishlistShare.findFirst({ orderBy: { createdAt: 'desc' } })
    if (!share) {
      share = await prisma.wishlistShare.create({ data: { label: 'My Wishlist' } })
    }
    return NextResponse.json({ token: share.token, label: share.label })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error' }, { status: 500 })
  }
}

// Regenerate share token (revokes old links)
export async function DELETE() {
  try {
    await prisma.wishlistShare.deleteMany()
    const fresh = await prisma.wishlistShare.create({ data: { label: 'My Wishlist' } })
    return NextResponse.json({ token: fresh.token })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error' }, { status: 500 })
  }
}
