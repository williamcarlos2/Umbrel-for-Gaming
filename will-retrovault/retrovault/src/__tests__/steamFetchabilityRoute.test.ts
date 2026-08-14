import { describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { POST } from '@/app/api/steam/fetchability/route';

describe('/api/steam/fetchability', () => {
  it('detects a private steam profile shell', async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      text: async () => '<html><title>Steam Community :: Test</title><div class="profile_private">This profile is private</div></html>',
    });

    const req = new Request('http://localhost/api/steam/fetchability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'https://steamcommunity.com/id/testuser' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.fetchability.isPrivate).toBe(true);
    expect(data.fetchability.readable).toBe(false);
  });
});
