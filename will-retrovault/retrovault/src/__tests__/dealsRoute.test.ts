import { beforeEach, describe, expect, it, vi } from 'vitest';

const readDealsCompat = vi.fn();
const updateDealDismissedCompat = vi.fn();
const clearDismissedDealsCompat = vi.fn();

vi.mock('@/lib/storageCompat', () => ({
  readDealsCompat,
  updateDealDismissedCompat,
  clearDismissedDealsCompat,
}));

async function loadRoute() {
  return import('@/app/api/deals/route');
}

describe('/api/deals route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('GET returns compat-backed deals data', async () => {
    readDealsCompat.mockReturnValue({ craigslist: [{ id: 'cl-1' }], reddit: [] });

    const route = await loadRoute();
    const response = await route.GET(new Request('http://localhost/api/deals'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.craigslist[0].id).toBe('cl-1');
  });

  it('POST dismiss updates deal state through compat storage', async () => {
    updateDealDismissedCompat.mockReturnValue(true);

    const route = await loadRoute();
    const response = await route.POST(new Request('http://localhost/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss', source: 'craigslist', id: 'cl-1' }),
    }));

    expect(response.status).toBe(200);
    expect((await response.json()).ok).toBe(true);
  });

  it('POST clear_dismissed reports removed count', async () => {
    clearDismissedDealsCompat.mockReturnValue(2);

    const route = await loadRoute();
    const response = await route.POST(new Request('http://localhost/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear_dismissed', source: 'reddit' }),
    }));

    expect(response.status).toBe(200);
    expect((await response.json()).removed).toBe(2);
  });
});
