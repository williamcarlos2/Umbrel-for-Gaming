import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import fs from 'fs';
import crypto from 'crypto';
import { getConfigPath } from '@/lib/runtimeDataPaths';

export const dynamic = 'force-dynamic';

const CONFIG_PATH = getConfigPath();
const SESSION_COOKIE = 'rv-session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'retrovault-local-secret-change-me';
const SESSION_TTL_HOURS = 72;

function getConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function sha256(str: string) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function makeSessionToken(passwordHash: string) {
  const expires = Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000;
  const payload = `${expires}:${passwordHash}`;
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${expires}:${sig}`;
}

export function validateSessionToken(token: string, passwordHash: string): boolean {
  if (!token) return false;
  const [expiresStr, sig] = token.split(':');
  const expires = parseInt(expiresStr);
  if (isNaN(expires) || Date.now() > expires) return false;
  const payload = `${expiresStr}:${passwordHash}`;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig || ''), Buffer.from(expected));
}

// POST /api/auth — login with password
export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const config = getConfig();

  if (!config?.auth?.enabled) {
    // Auth disabled — return a no-op success
    return NextResponse.json({ ok: true, authDisabled: true });
  }

  const inputHash = sha256(password || '');
  if (inputHash !== config.auth.passwordHash) {
    return NextResponse.json({ ok: false, error: 'Incorrect password' }, { status: 401 });
  }

  const token = makeSessionToken(config.auth.passwordHash);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_TTL_HOURS * 60 * 60,
    path: '/',
  });
  return res;
}

// DELETE /api/auth — logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}

// GET /api/auth — check session status
export async function GET(req: NextRequest) {
  const config = getConfig();
  if (!config?.auth?.enabled) {
    return NextResponse.json({ authenticated: true, authEnabled: false });
  }
  const token = req.cookies.get(SESSION_COOKIE)?.value || '';
  const valid = validateSessionToken(token, config.auth.passwordHash);
  return NextResponse.json({ authenticated: valid, authEnabled: true });
}
