/**
 * API Key Authentication — RetroVault v1 REST API
 *
 * Keys are stored as SHA-256 hashes in data/app.config.json (never plaintext).
 * Two permission levels: 'read' (default) and 'write' (required for key management).
 *
 * Client usage:
 *   Authorization: Bearer rvk_<key>       (standard)
 *   X-RetroVault-Key: rvk_<key>           (alternative for clients that don't support Authorization)
 *
 * Key format: rvk_<64 hex chars>  (prefix 'rvk_' + 32 random bytes)
 * Storage: SHA-256(key + salt) — timing-safe comparison via hash equality
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import { getConfigPath } from './runtimeDataPaths';

const CONFIG_FILE = getConfigPath();

type ApiConfig = {
  apiKeys?: ApiKey[];
  [key: string]: unknown;
};

export type ApiKey = {
  id: string;
  name: string;
  keyHash: string;
  prefix: string; // first 8 chars for display
  permissions: 'read' | 'write';
  createdAt: string;
  lastUsed?: string;
};

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return {};
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

function saveConfig(cfg: ApiConfig) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

/** SHA-256 hash with a static salt. Not bcrypt, but keys are long random strings so brute force isn't practical. */
function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key + 'retrovault-api-salt').digest('hex');
}

/** Generate a new cryptographically random API key. Returns the plaintext key (shown once) and its display prefix. */
export function generateApiKey(): { key: string; prefix: string } {
  const key = 'rvk_' + crypto.randomBytes(32).toString('hex');
  return { key, prefix: key.slice(0, 12) };
}

export function getApiKeys(): ApiKey[] {
  const cfg = loadConfig();
  return cfg.apiKeys || [];
}

/**
 * Create a new API key and persist it. Returns the plaintext key — this is the ONLY time it’s available.
 * Subsequent calls only have access to the hash and prefix.
 */
export function addApiKey(name: string, permissions: 'read' | 'write' = 'read'): { key: string; record: ApiKey } {
  const { key, prefix } = generateApiKey();
  const record: ApiKey = {
    id: crypto.randomUUID(),
    name,
    keyHash: hashKey(key),
    prefix,
    permissions,
    createdAt: new Date().toISOString(),
  };
  const cfg = loadConfig();
  cfg.apiKeys = [...(cfg.apiKeys || []), record];
  saveConfig(cfg);
  return { key, record };
}

export function revokeApiKey(id: string): boolean {
  const cfg = loadConfig();
  const before = (cfg.apiKeys || []).length;
  cfg.apiKeys = (cfg.apiKeys || []).filter((k: ApiKey) => k.id !== id);
  saveConfig(cfg);
  return cfg.apiKeys.length < before;
}

export function validateApiKey(key: string): ApiKey | null {
  if (!key || !key.startsWith('rvk_')) return null;
  const hash = hashKey(key);
  const keys = getApiKeys();
  const found = keys.find(k => k.keyHash === hash);
  if (found) {
    // Update last used (best effort, non-blocking)
    try {
      const cfg = loadConfig();
      const idx = (cfg.apiKeys || []).findIndex((k: ApiKey) => k.id === found.id);
      if (idx >= 0) {
        cfg.apiKeys[idx].lastUsed = new Date().toISOString();
        saveConfig(cfg);
      }
    } catch { /* ignore */ }
  }
  return found || null;
}

/**
 * Middleware guard for API v1 routes. Call at the top of every protected route handler:
 *
 *   const { error } = requireApiAuth(req);
 *   if (error) return error;
 *
 * Pass requireWrite=true for endpoints that mutate data (e.g. key management).
 */
export function requireApiAuth(req: NextRequest, requireWrite = false): { error: NextResponse | null; key: ApiKey | null } {
  const authHeader = req.headers.get('authorization') || '';
  const xKey = req.headers.get('x-retrovault-key') || '';
  
  // Accept: Authorization: Bearer rvk_... OR X-RetroVault-Key: rvk_...
  const rawKey = xKey || (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '');

  if (!rawKey) {
    return {
      error: NextResponse.json({
        error: 'Unauthorized',
        message: 'API key required. Pass X-RetroVault-Key header or Authorization: Bearer <key>.',
        docs: '/api/v1'
      }, { status: 401 }),
      key: null
    };
  }

  const keyRecord = validateApiKey(rawKey);
  if (!keyRecord) {
    return {
      error: NextResponse.json({ error: 'Invalid API key.' }, { status: 401 }),
      key: null
    };
  }

  if (requireWrite && keyRecord.permissions !== 'write') {
    return {
      error: NextResponse.json({ error: 'This endpoint requires a write-permission API key.' }, { status: 403 }),
      key: null
    };
  }

  return { error: null, key: keyRecord };
}

export function apiResponse<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0',
      ...meta,
    },
    error: null,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ data: null, error: message }, { status });
}
