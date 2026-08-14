import { NextResponse } from 'next/server';
import fs from 'fs';
import crypto from 'crypto';
import { getConfigPath, getRuntimeLabel } from '@/lib/runtimeDataPaths';

export const dynamic = 'force-dynamic';

const filePath = getConfigPath();

const DEFAULTS = {
  appName: "RetroVault",
  tagline: "Your Retro Gaming Collection Engine",
  ownerName: "",
  contactEmail: "",
  contactPhone: "",
  shareContact: false,
  themeColor: "green",
  currency: "$",
  dateFormat: "US",
  publicUrl: "",
  standaloneMode: true,
  auth: { enabled: false, passwordHash: "" },
  plex: { url: "https://YYY.YYY.YYY.YYY:PPPPP", token: "" },
  fetchScheduleHour: 0,
  priceDataSource: "pricecharting",
  autoSatisfyWishlistOnVaultAdd: true
};

function getConfig() {
  if (!fs.existsSync(filePath)) return DEFAULTS;
  return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(filePath, 'utf8')) };
}

function saveConfig(data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export async function GET() {
  const config = getConfig();
  // Only expose the client-safe subset needed by the app shell and settings UI.
  // Secrets like API key hashes and Plex tokens must stay server-side.
  const safe = {
    appName: config.appName,
    tagline: config.tagline,
    ownerName: config.ownerName,
    contactEmail: config.contactEmail,
    contactPhone: config.contactPhone,
    shareContact: config.shareContact,
    themeColor: config.themeColor,
    currency: config.currency,
    dateFormat: config.dateFormat,
    publicUrl: config.publicUrl,
    standaloneMode: config.standaloneMode,
    fetchScheduleHour: config.fetchScheduleHour,
    priceDataSource: config.priceDataSource,
    autoSatisfyWishlistOnVaultAdd: config.autoSatisfyWishlistOnVaultAdd !== false,
    features: config.features,
    platforms: config.platforms,
    region: config.region,
    githubRepo: config.githubRepo,
    setupWizardMode: config.setupWizardMode,
    setupWizardVersion: config.setupWizardVersion,
    setupSuggestAuth: config.setupSuggestAuth,
    runtimeEnv: getRuntimeLabel(),
    auth: {
      enabled: !!config.auth?.enabled,
      passwordHash: config.auth?.passwordHash ? '(set)' : ''
    },
    plex: {
      url: config.plex?.url || '',
      token: config.plex?.token ? '(set)' : ''
    },
  };
  return NextResponse.json(safe, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const body = await req.json();
  const config = getConfig();

  // Handle password update specially
  if (body.newPassword !== undefined) {
    if (body.newPassword === '') {
      config.auth.passwordHash = '';
    } else {
      config.auth.passwordHash = crypto.createHash('sha256').update(body.newPassword).digest('hex');
    }
    delete body.newPassword;
  }

  const updated = { ...config, ...body };
  // Merge nested objects
  if (body.auth) updated.auth = { ...config.auth, ...body.auth };
  if (body.plex) updated.plex = { ...config.plex, ...body.plex };

  saveConfig(updated);
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  const { password } = await req.json();
  const config = getConfig();
  if (!config.auth?.enabled) return NextResponse.json({ valid: true });
  if (!password) return NextResponse.json({ valid: false }, { status: 401 });
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  const valid = hash === config.auth.passwordHash;
  return NextResponse.json({ valid }, { status: valid ? 200 : 401 });
}
