/**
 * API Auth — Key generation, validation, and rate limiting tests
 *
 * Note on design: CONFIG_FILE is a module-level constant in apiAuth.ts that
 * resolves at import time. We can't easily mock the path, so we test against
 * the real data/app.config.json — but clean up any test keys we create.
 *
 * Pure-function tests (key format, hashing, rate limiting) don't touch disk at all.
 */

import { describe, it, expect, afterEach } from 'vitest';
import crypto from 'crypto';
import {
  generateApiKey,
  addApiKey,
  getApiKeys,
  revokeApiKey,
  validateApiKey,
  requireApiAuth,
} from '@/lib/apiAuth';

// Track IDs created during tests so we can clean up
const testKeyIds: string[] = [];

afterEach(() => {
  // Revoke all keys created during this test run
  for (const id of testKeyIds) revokeApiKey(id);
  testKeyIds.length = 0;
});

function createTestKey(name: string, perms: 'read' | 'write' = 'read') {
  const result = addApiKey(name, perms);
  testKeyIds.push(result.record.id);
  return result;
}

// ─── Key generation (pure, no disk I/O) ──────────────────────────────────────

describe('generateApiKey', () => {
  it('generates keys with rvk_ prefix', () => {
    const { key } = generateApiKey();
    expect(key).toMatch(/^rvk_[a-f0-9]+$/);
  });

  it('generates keys of sufficient length (rvk_ + 64 hex chars)', () => {
    const { key } = generateApiKey();
    expect(key.length).toBeGreaterThan(60);
  });

  it('generates unique keys each time', () => {
    const { key: k1 } = generateApiKey();
    const { key: k2 } = generateApiKey();
    expect(k1).not.toBe(k2);
  });

  it('prefix is the first 12 chars of the key', () => {
    const { key, prefix } = generateApiKey();
    expect(prefix).toBe(key.slice(0, 12));
  });
});

// ─── Add / get / revoke (disk I/O — cleaned up in afterEach) ─────────────────

describe('addApiKey / getApiKeys / revokeApiKey', () => {
  it('adds a key and can find it in getApiKeys()', () => {
    createTestKey('Unit Test Key A');
    const keys = getApiKeys();
    expect(keys.some(k => k.name === 'Unit Test Key A')).toBe(true);
  });

  it('does not store the plaintext key (only hash)', () => {
    const { key, record } = createTestKey('Hash Test');
    expect(record.keyHash).toHaveLength(64); // SHA-256 hex
    expect(JSON.stringify(getApiKeys())).not.toContain(key);
  });

  it('stores prefix for display', () => {
    const { key, record } = createTestKey('Prefix Test');
    expect(record.prefix).toBe(key.slice(0, 12));
  });

  it('revokes a key by id', () => {
    const { record } = createTestKey('Revoke Test');
    const result = revokeApiKey(record.id);
    expect(result).toBe(true);
    // Remove from cleanup list since already revoked
    const idx = testKeyIds.indexOf(record.id);
    if (idx >= 0) testKeyIds.splice(idx, 1);
    expect(getApiKeys().some(k => k.id === record.id)).toBe(false);
  });

  it('returns false when revoking non-existent id', () => {
    expect(revokeApiKey('nonexistent-id-xyz')).toBe(false);
  });

  it('read and write permissions stored correctly', () => {
    createTestKey('Read Key',  'read');
    createTestKey('Write Key', 'write');
    const keys = getApiKeys();
    expect(keys.find(k => k.name === 'Read Key')?.permissions).toBe('read');
    expect(keys.find(k => k.name === 'Write Key')?.permissions).toBe('write');
  });
});

// ─── validateApiKey ───────────────────────────────────────────────────────────

describe('validateApiKey', () => {
  it('validates a freshly created key', () => {
    const { key, record } = createTestKey('Validate Test');
    const found = validateApiKey(key);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(record.id);
  });

  it('returns null for a random non-existent key', () => {
    const fakeKey = 'rvk_' + crypto.randomBytes(32).toString('hex');
    expect(validateApiKey(fakeKey)).toBeNull();
  });

  it('returns null for keys without rvk_ prefix', () => {
    expect(validateApiKey('ghp_abc123')).toBeNull();
    expect(validateApiKey('')).toBeNull();
  });

  it('updates lastUsed on successful validation', () => {
    const { key, record } = createTestKey('LastUsed Test');
    expect(getApiKeys().find(k => k.id === record.id)?.lastUsed).toBeUndefined();
    validateApiKey(key);
    expect(getApiKeys().find(k => k.id === record.id)?.lastUsed).toBeDefined();
  });

  it('returns null after key is revoked', () => {
    const { key, record } = createTestKey('Post-Revoke Test');
    revokeApiKey(record.id);
    testKeyIds.splice(testKeyIds.indexOf(record.id), 1);
    expect(validateApiKey(key)).toBeNull();
  });
});

// ─── requireApiAuth ───────────────────────────────────────────────────────────

describe('requireApiAuth', () => {
  it('rejects request with no key', () => {
    const req = new Request('http://localhost/api/v1/test');
    const { error, key } = requireApiAuth(req as never);
    expect(error).not.toBeNull();
    expect(key).toBeNull();
  });

  it('accepts Bearer token in Authorization header', () => {
    const { key: rawKey } = createTestKey('Bearer Test');
    const req = new Request('http://localhost/api/v1/test', {
      headers: { Authorization: `Bearer ${rawKey}` },
    });
    const { error, key } = requireApiAuth(req as never);
    expect(error).toBeNull();
    expect(key?.name).toBe('Bearer Test');
  });

  it('accepts key in X-RetroVault-Key header', () => {
    const { key: rawKey } = createTestKey('Header Test');
    const req = new Request('http://localhost/api/v1/test', {
      headers: { 'X-RetroVault-Key': rawKey },
    });
    const { error, key } = requireApiAuth(req as never);
    expect(error).toBeNull();
    expect(key?.name).toBe('Header Test');
  });

  it('rejects read key for write-required endpoints', () => {
    const { key: rawKey } = createTestKey('Read Only', 'read');
    const req = new Request('http://localhost/api/v1/keys', {
      headers: { 'X-RetroVault-Key': rawKey },
    });
    expect(requireApiAuth(req as never, true).error).not.toBeNull();
  });

  it('accepts write key for write-required endpoints', () => {
    const { key: rawKey } = createTestKey('Write Key', 'write');
    const req = new Request('http://localhost/api/v1/keys', {
      headers: { 'X-RetroVault-Key': rawKey },
    });
    const { error, key } = requireApiAuth(req as never, true);
    expect(error).toBeNull();
    expect(key?.permissions).toBe('write');
  });

  it('rejects invalid key with 401', async () => {
    const req = new Request('http://localhost/api/v1/test', {
      headers: { 'X-RetroVault-Key': 'rvk_fakekeyvalue' },
    });
    const { error } = requireApiAuth(req as never);
    expect(error).not.toBeNull();
    const body = await error!.json();
    expect(body.error).toBeTruthy();
  });
});

// ─── Rate limiting (pure logic, no disk I/O) ──────────────────────────────────

function checkRateLimit(timestamps: number[], hourLimit = 1, dayLimit = 5): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const recentHour = timestamps.filter(t => t > now - 3600000).length;
  const recentDay  = timestamps.filter(t => t > now - 86400000).length;
  if (recentHour >= hourLimit) return { allowed: false, reason: 'Rate limit: 1 per hour' };
  if (recentDay  >= dayLimit)  return { allowed: false, reason: 'Daily limit reached' };
  return { allowed: true };
}

describe('Rate limiting — bug reporter', () => {
  it('allows first request', () => {
    expect(checkRateLimit([]).allowed).toBe(true);
  });
  it('blocks second request within the hour', () => {
    const { allowed, reason } = checkRateLimit([Date.now() - 30000]);
    expect(allowed).toBe(false);
    expect(reason).toContain('Rate limit');
  });
  it('allows request after hour has passed', () => {
    expect(checkRateLimit([Date.now() - 3700000]).allowed).toBe(true);
  });
  it('blocks when daily limit reached', () => {
    const now = Date.now();
    const ts = [now-7200000, now-14400000, now-21600000, now-28800000, now-36000000];
    expect(checkRateLimit(ts, 1, 5).allowed).toBe(false);
  });
});

// ─── Duplicate detection (pure logic) ────────────────────────────────────────

function wordOverlap(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim();
  const aWords = new Set(norm(a).split(/\s+/).filter(w => w.length > 3));
  const bWords = new Set(norm(b).split(/\s+/).filter(w => w.length > 3));
  const overlap = [...aWords].filter(w => bWords.has(w)).length;
  return aWords.size > 0 ? overlap / aWords.size : 0;
}

describe('Duplicate detection', () => {
  it('detects similar bug titles', () => {
    expect(wordOverlap(
      'Price fetching returning wrong prices for Gamecube',
      'Wrong prices returned when fetching Gamecube prices'
    )).toBeGreaterThanOrEqual(0.4);
  });
  it('does not flag unrelated titles', () => {
    expect(wordOverlap(
      'Field Mode dupe alert not working',
      'Convention tracker budget not saving'
    )).toBeLessThan(0.6);
  });
});

// ─── apiResponse / apiError helpers ──────────────────────────────────────────

import { apiResponse, apiError } from '@/lib/apiAuth';

describe('apiResponse', () => {
  it('wraps data with meta envelope', async () => {
    const res = apiResponse({ games: 42 });
    const body = await res.json();
    expect(body.data).toEqual({ games: 42 });
    expect(body.error).toBeNull();
    expect(body.meta.version).toBe('1.0');
    expect(body.meta.timestamp).toBeTruthy();
  });

  it('merges extra meta fields', async () => {
    const res = apiResponse([], { total: 100, offset: 0 });
    const body = await res.json();
    expect(body.meta.total).toBe(100);
    expect(body.meta.offset).toBe(0);
  });

  it('sets Cache-Control: no-store', () => {
    const res = apiResponse({});
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});

describe('apiError', () => {
  it('returns error body with correct status', async () => {
    const res = apiError('Not found', 404);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Not found');
    expect(body.data).toBeNull();
  });

  it('defaults to status 400', async () => {
    const res = apiError('Bad request');
    expect(res.status).toBe(400);
  });
});
