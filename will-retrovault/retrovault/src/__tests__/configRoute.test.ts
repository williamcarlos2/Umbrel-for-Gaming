import { describe, it, expect, vi, beforeEach } from 'vitest';

const existsSync = vi.fn();
const readFileSync = vi.fn();
const writeFileSync = vi.fn();
const createHash = vi.fn();
const update = vi.fn();
const digest = vi.fn();

vi.mock('fs', () => ({
  default: {
    existsSync,
    readFileSync,
    writeFileSync,
  },
}));

vi.mock('crypto', () => ({
  default: {
    createHash,
  },
}));

vi.mock('@/lib/runtimeDataPaths', () => ({
  getConfigPath: () => '/tmp/test-app.config.json',
  getRuntimeLabel: () => 'dev',
}));

async function loadRoute() {
  return import('@/app/api/config/route');
}

describe('/api/config route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue(JSON.stringify({
      appName: 'RetroVault',
      tagline: 'Track it',
      ownerName: 'Alex',
      contactEmail: 'alex@example.com',
      shareContact: true,
      themeColor: 'green',
      currency: '$',
      dateFormat: 'US',
      publicUrl: 'https://retrovault.example.com',
      standaloneMode: true,
      fetchScheduleHour: 3,
      priceDataSource: 'pricecharting',
      features: { wishlist: true },
      platforms: ['SNES'],
      region: 'US',
      githubRepo: 'theretrovault/retrovault',
      setupWizardMode: false,
      setupWizardVersion: '2.1.25',
      setupSuggestAuth: true,
      auth: { enabled: true, passwordHash: 'super-secret-hash' },
      plex: { url: 'https://plex.local', token: 'plex-secret-token' },
      apiKeys: [{ id: 'key-1', prefix: 'rvk_deadbeef' }],
    }));
    createHash.mockReturnValue({ update, digest });
    update.mockReturnValue({ digest });
    digest.mockReturnValue('hashed-value');
  });

  it('GET returns a client-safe config shape without secrets', async () => {
    const route = await loadRoute();
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.runtimeEnv).toBe('dev');
    expect(body.appName).toBe('RetroVault');
    expect(body.auth).toEqual({ enabled: true, passwordHash: '(set)' });
    expect(body.plex).toEqual({ url: 'https://plex.local', token: '(set)' });
    expect(body.apiKeys).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('super-secret-hash');
    expect(JSON.stringify(body)).not.toContain('plex-secret-token');
  });

  it('POST merges nested auth and plex updates and hashes new passwords before save', async () => {
    const route = await loadRoute();
    const request = new Request('http://localhost/api/config', {
      method: 'POST',
      body: JSON.stringify({
        ownerName: 'Neo',
        auth: { enabled: false },
        plex: { url: 'https://new-plex.local' },
        newPassword: 'hunter2',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await route.POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(createHash).toHaveBeenCalledWith('sha256');
    expect(update).toHaveBeenCalledWith('hunter2');
    expect(writeFileSync).toHaveBeenCalledTimes(1);

    const saved = JSON.parse(writeFileSync.mock.calls[0][1]);
    expect(saved.ownerName).toBe('Neo');
    expect(saved.auth).toEqual({ enabled: false, passwordHash: 'hashed-value' });
    expect(saved.plex).toEqual({ url: 'https://new-plex.local', token: 'plex-secret-token' });
    expect(saved.newPassword).toBeUndefined();
  });
});
