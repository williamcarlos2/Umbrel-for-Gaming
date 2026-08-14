import { beforeEach, describe, expect, it, vi } from 'vitest';

const readTagsCompat = vi.fn();
const addTagCompat = vi.fn();
const removeTagCompat = vi.fn();
const addMentionCompat = vi.fn();
const deleteMentionCompat = vi.fn();

vi.mock('@/lib/storageCompat', () => ({
  readTagsCompat,
  addTagCompat,
  removeTagCompat,
  addMentionCompat,
  deleteMentionCompat,
}));

async function loadRoute() {
  return import('@/app/api/tags/route');
}

describe('/api/tags route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('GET returns compat-backed tags payload', async () => {
    readTagsCompat.mockResolvedValue({
      gameTags: { 'game-1': ['grail'] },
      platformTags: {},
      mentions: {},
    });

    const route = await loadRoute();
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.gameTags['game-1']).toEqual(['grail']);
  });

  it('POST add_tag returns updated tags for the entity', async () => {
    addTagCompat.mockResolvedValue(['grail', 'rpg']);

    const route = await loadRoute();
    const response = await route.POST(new Request('http://localhost/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_tag', entityId: 'game-1', entityType: 'game', tag: 'rpg' }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tags: ['grail', 'rpg'] });
  });
});
