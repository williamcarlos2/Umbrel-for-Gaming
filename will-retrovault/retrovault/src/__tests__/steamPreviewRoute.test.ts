import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/storageCompat', () => ({
  readInventoryCompat: vi.fn(async () => ([
    { id: '1', title: 'Portal 2', platform: 'PC (Steam)', copies: [{ id: 'c1' }] },
    { id: '2', title: 'Balatro', platform: 'Switch', copies: [{ id: 'c2' }] },
  ])),
}));

import { POST } from '@/app/api/steam/preview/route';

describe('/api/steam/preview', () => {
  it('classifies likely matches, possible imports, and review rows', async () => {
    const req = new Request('http://localhost/api/steam/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'PC (Steam)',
        titles: ['Portal 2', 'Balatro', 'Vampire Survivors'],
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summary.total).toBe(3);
    expect(data.summary.likelyMatch).toBe(1);
    expect(data.summary.needsReview).toBe(1);
    expect(data.summary.possibleImport).toBe(1);
  });
});
