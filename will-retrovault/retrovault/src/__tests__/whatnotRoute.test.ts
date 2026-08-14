import { beforeEach, describe, expect, it, vi } from 'vitest';

const readWhatnotCompat = vi.fn();
const addWhatnotSellerCompat = vi.fn();
const addWhatnotStreamCompat = vi.fn();
const removeWhatnotSellerCompat = vi.fn();
const updateWhatnotSellerCompat = vi.fn();
const updateWhatnotStreamCompat = vi.fn();

vi.mock('@/lib/storageCompat', () => ({
  readWhatnotCompat,
  addWhatnotSellerCompat,
  addWhatnotStreamCompat,
  removeWhatnotSellerCompat,
  updateWhatnotSellerCompat,
  updateWhatnotStreamCompat,
}));

async function loadRoute() {
  return import('@/app/api/whatnot/route');
}

describe('/api/whatnot route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('GET returns compat-backed whatnot data', async () => {
    readWhatnotCompat.mockResolvedValue({ sellers: [], streams: [], lastChecked: null });

    const route = await loadRoute();
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sellers).toEqual([]);
  });

  it('POST add_seller creates a compat-backed seller', async () => {
    addWhatnotSellerCompat.mockResolvedValue({ username: 'pixelstash', displayName: 'Pixel Stash' });

    const route = await loadRoute();
    const response = await route.POST(new Request('http://localhost/api/whatnot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_seller', username: 'pixelstash', displayName: 'Pixel Stash' }),
    }));

    expect(response.status).toBe(200);
    expect((await response.json()).username).toBe('pixelstash');
  });

  it('POST attending toggles a stream through compat update', async () => {
    readWhatnotCompat.mockResolvedValue({
      sellers: [],
      streams: [{ id: 'stream-1', seller: 'pixelstash', title: 'Live', attending: false }],
      lastChecked: null,
    });
    updateWhatnotStreamCompat.mockResolvedValue({ id: 'stream-1', attending: true });

    const route = await loadRoute();
    const response = await route.POST(new Request('http://localhost/api/whatnot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'attending', id: 'stream-1' }),
    }));

    expect(response.status).toBe(200);
    expect((await response.json()).attending).toBe(true);
  });
});
