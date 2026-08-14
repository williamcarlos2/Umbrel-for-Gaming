import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function defaultLabel() {
  return 'My Collection';
}

export async function GET() {
  try {
    let share = await prisma.collectionShare.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!share) {
      share = await prisma.collectionShare.create({ data: { label: defaultLabel() } });
    }

    return NextResponse.json({
      token: share.token,
      label: share.label,
      expiresAt: share.expiresAt?.toISOString() ?? null,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const label = body.label || defaultLabel();
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    await prisma.collectionShare.deleteMany();
    const share = await prisma.collectionShare.create({
      data: {
        label,
        token: body.token || undefined,
        expiresAt,
      },
    });

    return NextResponse.json({
      token: share.token,
      label: share.label,
      expiresAt: share.expiresAt?.toISOString() ?? null,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await prisma.collectionShare.deleteMany();
    const fresh = await prisma.collectionShare.create({ data: { label: defaultLabel() } });
    return NextResponse.json({
      token: fresh.token,
      label: fresh.label,
      expiresAt: fresh.expiresAt?.toISOString() ?? null,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error' }, { status: 500 });
  }
}
