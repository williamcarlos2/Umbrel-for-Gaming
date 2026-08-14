import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireApiAuthMock = vi.fn();
const apiResponseMock = vi.fn((payload: unknown) => payload);
const fetchMock = vi.fn();

vi.mock('@/lib/apiAuth', () => ({
  requireApiAuth: (req: Request, requireWrite?: boolean) => requireApiAuthMock(req, requireWrite),
  apiResponse: (payload: unknown) => apiResponseMock(payload),
}));

vi.mock('@/data/achievements', async () => {
  const actual = await vi.importActual<typeof import('@/data/achievements')>('@/data/achievements');
  return actual;
});

describe('/api/v1/achievements', () => {
  beforeEach(() => {
    vi.resetModules();
    requireApiAuthMock.mockReset();
    apiResponseMock.mockClear();
    fetchMock.mockReset();
    requireApiAuthMock.mockReturnValue({});
    vi.stubGlobal('fetch', fetchMock);
  });

  it('returns a bounded completion percent from unlocked vs total non-secret achievements', async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        unlockedIds: ['c_first', 'c_10', 'setup_done'],
      }),
    });

    const { GET } = await import('@/app/api/v1/achievements/route');

    const response = await GET({
      nextUrl: { origin: 'https://retrovault.peschpit.com' },
    } as never);
    const body = response as unknown as { summary: { unlocked: number; total: number; completionPercent: number } };

    expect(body.summary.unlocked).toBe(3);
    expect(body.summary.total).toBeGreaterThan(3);
    expect(body.summary.completionPercent).toBeGreaterThanOrEqual(0);
    expect(body.summary.completionPercent).toBeLessThanOrEqual(100);
  });
});
