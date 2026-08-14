import { NextResponse } from 'next/server'
import fs from 'fs'
import { getConfigPath } from '@/lib/runtimeDataPaths'
import { syncPlatformCatalog } from '@/lib/platformCatalogSync'

export const dynamic = 'force-dynamic'

const DEFAULTS = {
  appName: 'RetroVault',
  tagline: 'Your Retro Gaming Collection Engine',
  ownerName: '',
  contactEmail: '',
  contactPhone: '',
  shareContact: false,
  themeColor: 'green',
  currency: '$',
  dateFormat: 'US',
  publicUrl: '',
  standaloneMode: true,
  auth: { enabled: false, passwordHash: '' },
  plex: { url: 'https://YYY.YYY.YYY.YYY:PPPPP', token: '' },
  fetchScheduleHour: 0,
  priceDataSource: 'pricecharting',
  platforms: [],
}

function getConfig() {
  const filePath = getConfigPath()
  if (!fs.existsSync(filePath)) return DEFAULTS
  return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(filePath, 'utf8')) }
}

function saveConfig(data: unknown) {
  fs.writeFileSync(getConfigPath(), JSON.stringify(data, null, 2))
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const platform = typeof body.platform === 'string' ? body.platform.trim() : ''
    const enabled = Boolean(body.enabled)
    const autoPopulate = body.autoPopulate !== false
    const previewOnly = body.previewOnly === true

    if (!platform) {
      return NextResponse.json({ error: 'platform is required' }, { status: 400 })
    }

    const config = getConfig()
    const currentPlatforms: string[] = Array.isArray(config.platforms) ? config.platforms : []
    const platformSet = new Set(currentPlatforms)
    if (enabled) platformSet.add(platform)
    else platformSet.delete(platform)

    const updatedPlatforms = [...platformSet]
    const updatedConfig = { ...config, platforms: updatedPlatforms }

    const sync = await syncPlatformCatalog({
      platform,
      enabledPlatforms: updatedPlatforms,
      autoPopulate,
      previewOnly,
    })

    if (!previewOnly) {
      saveConfig(updatedConfig)
    }

    return NextResponse.json({
      ok: true,
      previewOnly,
      nextPlatforms: updatedPlatforms,
      sync,
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to sync platform' }, { status: 500 })
  }
}
