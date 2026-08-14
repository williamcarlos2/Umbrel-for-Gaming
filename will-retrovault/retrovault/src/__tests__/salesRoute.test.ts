import { beforeEach, describe, expect, it, vi } from 'vitest';

const readSalesCompat = vi.fn();
const addSaleCompat = vi.fn();
const updateSaleCompat = vi.fn();
const deleteSaleCompat = vi.fn();
const readAcquisitionsCompat = vi.fn();
const addAcquisitionCompat = vi.fn();
const updateAcquisitionCompat = vi.fn();
const deleteAcquisitionCompat = vi.fn();
const readWatchlistCompat = vi.fn();
const addWatchlistCompat = vi.fn();
const updateWatchlistCompat = vi.fn();
const deleteWatchlistCompat = vi.fn();

vi.mock('@/lib/storageCompat', () => ({
  readSalesCompat,
  addSaleCompat,
  updateSaleCompat,
  deleteSaleCompat,
  readAcquisitionsCompat,
  addAcquisitionCompat,
  updateAcquisitionCompat,
  deleteAcquisitionCompat,
  readWatchlistCompat,
  addWatchlistCompat,
  updateWatchlistCompat,
  deleteWatchlistCompat,
}));

async function loadRoute() {
  return import('@/app/api/sales/route');
}

describe('/api/sales route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('GET returns compat-backed acquisitions when requested', async () => {
    readAcquisitionsCompat.mockResolvedValue([{ id: 'acq-1', gameTitle: 'Tony Hawk\'s Pro Skater 2', cost: 9.99 }]);

    const route = await loadRoute();
    const response = await route.GET(new Request('http://localhost/api/sales?type=acquisitions'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body[0].id).toBe('acq-1');
  });

  it('POST add for sales returns the compat-created entry', async () => {
    addSaleCompat.mockResolvedValue({ id: 'sale-1', gameTitle: 'Chrono Trigger', salePrice: 199.99 });

    const route = await loadRoute();
    const response = await route.POST(new Request('http://localhost/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'sales', action: 'add', item: { gameTitle: 'Chrono Trigger', salePrice: 199.99, saleDate: '2026-04-20' } }),
    }));

    expect(response.status).toBe(201);
    expect((await response.json()).id).toBe('sale-1');
  });

  it('POST delete for acquisitions returns 404 when entry is missing', async () => {
    deleteAcquisitionCompat.mockResolvedValue(false);

    const route = await loadRoute();
    const response = await route.POST(new Request('http://localhost/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'acquisitions', action: 'delete', item: { id: 'missing' } }),
    }));

    expect(response.status).toBe(404);
  });
});
