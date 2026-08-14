import { NextResponse } from 'next/server';
import { readDatabaseBackupIntegrity } from '@/lib/databaseBackupIntegrity';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(readDatabaseBackupIntegrity(), { headers: { 'Cache-Control': 'no-store' } });
}
