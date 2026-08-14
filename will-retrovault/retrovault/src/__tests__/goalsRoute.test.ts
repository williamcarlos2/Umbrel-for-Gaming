import { beforeEach, describe, expect, it, vi } from 'vitest';

const readGoalsCompat = vi.fn();
const setGoalPriorityCompat = vi.fn();

vi.mock('@/lib/storageCompat', () => ({
  readGoalsCompat,
  setGoalPriorityCompat,
}));

async function loadRoute() {
  return import('@/app/api/goals/route');
}

describe('/api/goals route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('GET returns compat-backed goal priorities', async () => {
    readGoalsCompat.mockResolvedValue({ priorities: { 'SNES': 1 } });

    const route = await loadRoute();
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.priorities.SNES).toBe(1);
  });

  it('POST delegates goal priority updates to compat storage', async () => {
    const route = await loadRoute();
    const response = await route.POST(new Request('http://localhost/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'Genesis', priority: 2 }),
    }));

    expect(response.status).toBe(200);
    expect(setGoalPriorityCompat).toHaveBeenCalledWith('Genesis', 2);
  });
});
