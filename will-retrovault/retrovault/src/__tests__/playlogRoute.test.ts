import { beforeEach, describe, expect, it, vi } from 'vitest';

const readPlaylogCompat = vi.fn();
const upsertPlaylogCompat = vi.fn();
const deletePlaylogCompat = vi.fn();
const setPlaylogStatusCompat = vi.fn();

vi.mock('@/lib/storageCompat', () => ({
  readPlaylogCompat,
  upsertPlaylogCompat,
  deletePlaylogCompat,
  setPlaylogStatusCompat,
}));

async function loadRoute() {
  return import('@/app/api/playlog/route');
}

describe('/api/playlog route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('GET returns compat-backed playlog entries', async () => {
    readPlaylogCompat.mockResolvedValue([
      { id: 'entry-1', title: 'Chrono Trigger', platform: 'SNES', status: 'playing', updatedAt: '2026-04-20T00:00:00.000Z' },
    ]);

    const route = await loadRoute();
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Chrono Trigger');
  });

  it('POST set_status returns 404 when entry is missing', async () => {
    setPlaylogStatusCompat.mockResolvedValue(null);

    const route = await loadRoute();
    const response = await route.POST(new Request('http://localhost/api/playlog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_status', id: 'missing', status: 'beat' }),
    }));

    expect(response.status).toBe(404);
  });
});
