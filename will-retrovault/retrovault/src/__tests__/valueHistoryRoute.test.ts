import { beforeEach, describe, expect, it, vi } from 'vitest';

const readValueHistoryCompat = vi.fn();
const upsertValueSnapshotCompat = vi.fn();

vi.mock('@/lib/storageCompat', () => ({
  readValueHistoryCompat,
  upsertValueSnapshotCompat,
}));

async function loadRoute() {
  return import('@/app/api/value-history/route');
}

describe('/api/value-history route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('GET returns compat-backed value history snapshots', async () => {
    readValueHistoryCompat.mockResolvedValue([
      { date: '2026-04-20', totalValue: 4200, totalCib: 7000, totalPaid: 5000, gameCount: 260 },
    ]);

    const route = await loadRoute();
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body[0].date).toBe('2026-04-20');
  });

  it('POST upserts a snapshot through compat storage', async () => {
    upsertValueSnapshotCompat.mockResolvedValue({
      date: '2026-04-21',
      totalValue: 4300,
      totalCib: 7100,
      totalPaid: 5000,
      gameCount: 261,
    });

    const route = await loadRoute();
    const response = await route.POST(new Request('http://localhost/api/value-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-04-21', totalValue: 4300, totalCib: 7100, totalPaid: 5000, gameCount: 261 }),
    }));

    expect(response.status).toBe(200);
    expect((await response.json()).gameCount).toBe(261);
  });
});
