import { beforeEach, describe, expect, it, vi } from 'vitest';

const readFavoritesCompat = vi.fn();
const addPersonCompat = vi.fn();
const renamePersonCompat = vi.fn();
const removePersonCompat = vi.fn();
const toggleFavoriteCompat = vi.fn();
const toggleRegretCompat = vi.fn();

vi.mock('@/lib/storageCompat', () => ({
  readFavoritesCompat,
  addPersonCompat,
  renamePersonCompat,
  removePersonCompat,
  toggleFavoriteCompat,
  toggleRegretCompat,
}));

async function loadRoute() {
  return import('@/app/api/favorites/route');
}

describe('/api/favorites route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('GET returns compat-backed favorites payload', async () => {
    readFavoritesCompat.mockResolvedValue({
      people: [{ id: 'person-1', name: 'Alex' }],
      favorites: { 'person-1': ['game-1'] },
      regrets: { 'person-1': [] },
    });

    const route = await loadRoute();
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.people).toHaveLength(1);
    expect(body.favorites['person-1']).toEqual(['game-1']);
  });

  it('POST toggle_favorite returns updated favorite ids', async () => {
    toggleFavoriteCompat.mockResolvedValue(['game-1', 'game-2']);

    const route = await loadRoute();
    const response = await route.POST(new Request('http://localhost/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_favorite', personId: 'person-1', gameId: 'game-2' }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ favorites: ['game-1', 'game-2'] });
  });
});
