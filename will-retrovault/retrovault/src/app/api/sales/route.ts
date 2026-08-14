import { NextResponse } from 'next/server';
import {
  addAcquisitionCompat,
  addSaleCompat,
  addWatchlistCompat,
  deleteAcquisitionCompat,
  deleteSaleCompat,
  deleteWatchlistCompat,
  readAcquisitionsCompat,
  readSalesCompat,
  readWatchlistCompat,
  updateAcquisitionCompat,
  updateSaleCompat,
  updateWatchlistCompat,
} from '@/lib/storageCompat';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'sales';
  if (type === 'watchlist') {
    const watchlist = await readWatchlistCompat();
    return NextResponse.json(watchlist, { headers: { 'Cache-Control': 'no-store' } });
  }
  if (type === 'acquisitions') {
    const acquisitions = await readAcquisitionsCompat();
    return NextResponse.json(acquisitions, { headers: { 'Cache-Control': 'no-store' } });
  }
  const sales = await readSalesCompat();
  return NextResponse.json(sales, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { type = 'sales', action, item } = body;

  if (type === 'watchlist') {
    if (action === 'add') {
      const entry = await addWatchlistCompat(item);
      return NextResponse.json(entry, { status: 201 });
    }

    if (action === 'update') {
      const updated = await updateWatchlistCompat(item);
      if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(updated);
    }

    if (action === 'delete') {
      const deleted = await deleteWatchlistCompat(item.id);
      if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ ok: true });
    }
  }

  if (type === 'acquisitions') {
    if (action === 'add') {
      const entry = await addAcquisitionCompat(item);
      return NextResponse.json(entry, { status: 201 });
    }

    if (action === 'update') {
      const updated = await updateAcquisitionCompat(item);
      if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(updated);
    }

    if (action === 'delete') {
      const deleted = await deleteAcquisitionCompat(item.id);
      if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ ok: true });
    }
  }

  if (action === 'add') {
    const entry = await addSaleCompat(item);
    return NextResponse.json(entry, { status: 201 });
  }

  if (action === 'update') {
    const updated = await updateSaleCompat(item);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  }

  if (action === 'delete') {
    const deleted = await deleteSaleCompat(item.id);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
