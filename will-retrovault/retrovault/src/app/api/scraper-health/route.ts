import { NextResponse } from 'next/server';
import { readScraperHealthSummary } from '@/lib/scraperHealth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const summary = readScraperHealthSummary();
  return NextResponse.json(summary, { headers: { 'Cache-Control': 'no-store' } });
}
