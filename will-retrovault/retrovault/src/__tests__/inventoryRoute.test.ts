import { beforeEach, describe, expect, it, vi } from 'vitest';

const readInventoryCompat = vi.fn();
const createInventoryCompat = vi.fn();
const updateInventoryCompat = vi.fn();
const deleteInventoryCompat = vi.fn();

vi.mock('@/lib/storageCompat', () => ({
  readInventoryCompat,
  createInventoryCompat,
  updateInventoryCompat,
  deleteInventoryCompat,
}));

async function loadRoute() {
  return import('@/app/api/inventory/route');
}

describe('/api/inventory route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('GET returns hybrid-visible inventory rows from compat storage', async () => {
    readInventoryCompat.mockResolvedValue([
      { id: 'catalog-row', title: 'Wonder Boy in Monster World', platform: 'Sega Genesis', status: 'No', copies: [] },
      {
        id: 'owned-row',
        title: 'Wonder Boy in Monster World',
        platform: 'Sega Genesis',
        status: 'Yes',
        notes: 'Chase After the Right Price',
        purchaseDate: '2026-03-27',
        copies: [{ id: 'copy-1', condition: 'Other', hasBox: true, hasManual: false, priceAcquired: '27.56' }],
      },
    ]);

    const route = await loadRoute();
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(2);
    expect(body.find((item: { id: string }) => item.id === 'owned-row')).toMatchObject({
      title: 'Wonder Boy in Monster World',
      status: 'Yes',
      purchaseDate: '2026-03-27',
    });
  });

  it('PUT returns 404 when the target inventory row is not found', async () => {
    readInventoryCompat.mockResolvedValue([]);

    const route = await loadRoute();
    const response = await route.PUT(new Request('http://localhost/api/inventory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'missing-row', title: 'Missing Game', platform: 'NES' }),
    }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Item not found' });
  });
});
