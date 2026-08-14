import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { getSchedulerStatus } = await import('@/lib/scheduler');
    const status = getSchedulerStatus();
    return NextResponse.json(status, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({}, { headers: { 'Cache-Control': 'no-store' } });
  }
}
