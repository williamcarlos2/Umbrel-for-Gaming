import { describe, expect, it } from 'vitest';
import { POST } from '@/app/api/steam/resolve/route';

describe('/api/steam/resolve', () => {
  it('returns a dry-run preview for valid steam input', async () => {
    const req = new Request('http://localhost/api/steam/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: '76561198000000000' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.resolved.importMode).toBe('direct_id');
    expect(data.preview.target).toBe('https://steamcommunity.com/profiles/76561198000000000');
    expect(Array.isArray(data.preview.steps)).toBe(true);
  });
});
