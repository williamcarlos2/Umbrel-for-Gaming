import { beforeEach, describe, expect, it, vi } from 'vitest';

const readGrailsCompat = vi.fn();
const addGrailCompat = vi.fn();
const acquireGrailCompat = vi.fn();
const updateGrailCompat = vi.fn();
const deleteGrailCompat = vi.fn();

vi.mock('@/lib/storageCompat', () => ({
  readGrailsCompat,
  addGrailCompat,
  acquireGrailCompat,
  updateGrailCompat,
  deleteGrailCompat,
}));

async function loadRoute() {
  return import('@/app/api/grails/route');
}

describe('/api/grails route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('GET returns compat-backed grails', async () => {
    readGrailsCompat.mockResolvedValue([
      { id: 'grail-1', title: 'Panzer Dragoon Saga', platform: 'Saturn', priority: 1, addedAt: '2026-04-20T00:00:00.000Z' },
    ]);

    const route = await loadRoute();
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body[0].title).toBe('Panzer Dragoon Saga');
  });

  it('POST acquired returns 404 when grail is missing', async () => {
    acquireGrailCompat.mockResolvedValue(null);

    const route = await loadRoute();
    const response = await route.POST(new Request('http://localhost/api/grails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'acquired', id: 'missing' }),
    }));

    expect(response.status).toBe(404);
  });
});
