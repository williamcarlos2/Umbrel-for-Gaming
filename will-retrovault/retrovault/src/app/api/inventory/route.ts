import { NextResponse } from 'next/server';
import {
  createInventoryCompat,
  deleteInventoryCompat,
  readInventoryCompat,
  updateInventoryCompat,
} from '@/lib/storageCompat';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const inventory = await readInventoryCompat();
    return NextResponse.json(inventory, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch {
    return NextResponse.json({ error: "Failed to load inventory" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newItem = await request.json();
    newItem.id = newItem.id || Math.random().toString(36).substring(2, 10);
    const created = await createInventoryCompat(newItem);
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const updatedItem = await request.json();
    const inventory = await readInventoryCompat();
    const existing = inventory.find((item) => item.id === updatedItem.id);
    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const today = new Date().toISOString().split('T')[0];
    const existingHistory = existing.priceHistory || {};
    const newHistory = {
      ...existingHistory,
      [today]: {
        loose: updatedItem.marketLoose || null,
        cib: updatedItem.marketCib || null,
        new: updatedItem.marketNew || null,
        graded: updatedItem.marketGraded || null,
        fetchedAt: new Date().toISOString(),
      },
    };

    const updated = await updateInventoryCompat({ ...updatedItem, priceHistory: newHistory });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }
    
    const deleted = await deleteInventoryCompat(id);
    if (!deleted) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
