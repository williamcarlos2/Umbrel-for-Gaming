import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const store = {
  share: null as null | { token: string; label: string; expiresAt: Date | null; createdAt?: Date },
};

vi.mock('@/lib/prisma', () => ({
  default: {
    collectionShare: {
      findFirst: vi.fn(async () => store.share),
      findUnique: vi.fn(async ({ where }: { where: { token: string } }) => (store.share?.token === where.token ? store.share : null)),
      create: vi.fn(async ({ data }: { data: { token?: string; label?: string; expiresAt?: string } }) => {
        store.share = {
          token: data.token || 'generated-collection-token',
          label: data.label || 'My Collection',
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          createdAt: new Date('2026-04-20T18:00:00.000Z'),
        };
        return store.share;
      }),
      deleteMany: vi.fn(async () => {
        store.share = null;
        return { count: 1 };
      }),
    },
  },
}));

describe('collection share route', () => {
  beforeEach(() => {
    store.share = null;
  });

  it('creates a default collection share on first GET', async () => {
    const { GET } = await import('@/app/api/collection-share/route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.token).toBe('generated-collection-token');
    expect(body.label).toBe('My Collection');
    expect(body.expiresAt).toBeNull();
  });

  it('saves explicit token and expiry on POST', async () => {
    const { POST } = await import('@/app/api/collection-share/route');
    const response = await POST(new NextRequest('http://localhost/api/collection-share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'custom-token',
        label: 'Alex Collection',
        expiresAt: '2026-05-01T00:00:00.000Z',
      }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.token).toBe('custom-token');
    expect(body.label).toBe('Alex Collection');
    expect(body.expiresAt).toBe('2026-05-01T00:00:00.000Z');
  });

  it('regenerates a fresh share on DELETE', async () => {
    store.share = {
      token: 'old-token',
      label: 'Old Collection',
      expiresAt: new Date('2026-05-01T00:00:00.000Z'),
      createdAt: new Date('2026-04-20T18:00:00.000Z'),
    };

    const { DELETE } = await import('@/app/api/collection-share/route');
    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.token).toBe('generated-collection-token');
    expect(body.label).toBe('My Collection');
  });
});
