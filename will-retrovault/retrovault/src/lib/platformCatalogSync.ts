import { readDataFile, writeDataFile } from '@/lib/data'
import prisma from '@/lib/prisma'

export type PlatformSyncMode = 'enable' | 'disable'

export type PlatformSyncOptions = {
  platform: string
  enabledPlatforms: string[]
  autoPopulate?: boolean
  previewOnly?: boolean
}

export type PlatformSyncResult = {
  platform: string
  mode: PlatformSyncMode
  enabledPlatforms: string[]
  catalogFound: boolean
  populated: {
    attempted: boolean
    added: number
    skipped: number
    totalTitlesDiscovered: number
  }
  pruned: {
    attempted: boolean
    removed: number
    preservedOwned: number
    preservedWatchlist: number
    preservedWishlist: number
  }
}

type InventoryItem = {
  id: string
  title: string
  platform: string
  status?: string
  notes?: string
  copies?: Array<unknown>
}

type WatchlistItem = {
  title?: string
  platform?: string
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
}

const PLATFORM_SLUGS = [
  { name: 'NES', slug: 'nintendo-nes' },
  { name: 'SNES', slug: 'super-nintendo' },
  { name: 'Nintendo 64', slug: 'nintendo-64' },
  { name: 'Gamecube', slug: 'gamecube' },
  { name: 'Wii', slug: 'wii' },
  { name: 'Wii U', slug: 'wii-u' },
  { name: 'Switch', slug: 'nintendo-switch' },
  { name: 'Switch 2', slug: 'nintendo-switch-2' },
  { name: 'Game Boy', slug: 'gameboy' },
  { name: 'Game Boy Color', slug: 'gameboy-color' },
  { name: 'Virtual Boy', slug: 'virtual-boy' },
  { name: 'Game Boy Advance', slug: 'gameboy-advance' },
  { name: 'Nintendo DS', slug: 'nintendo-ds' },
  { name: 'Nintendo 3DS', slug: 'nintendo-3ds' },
  { name: 'PS1', slug: 'playstation' },
  { name: 'PS2', slug: 'playstation-2' },
  { name: 'PS3', slug: 'playstation-3' },
  { name: 'PS4', slug: 'playstation-4' },
  { name: 'PS5', slug: 'playstation-5' },
  { name: 'PSP', slug: 'psp' },
  { name: 'PS Vita', slug: 'playstation-vita' },
  { name: 'Sega Genesis', slug: 'sega-genesis' },
  { name: 'Sega CD', slug: 'sega-cd' },
  { name: 'Sega 32X', slug: 'sega-32x' },
  { name: 'Sega Saturn', slug: 'sega-saturn' },
  { name: 'Dreamcast', slug: 'sega-dreamcast' },
  { name: 'Game Gear', slug: 'sega-game-gear' },
  { name: 'Sega Master System', slug: 'sega-master-system' },
  { name: 'Xbox', slug: 'xbox' },
  { name: 'Xbox 360', slug: 'xbox-360' },
  { name: 'Xbox One', slug: 'xbox-one' },
  { name: 'Xbox Series X', slug: 'xbox-series-x' },
  { name: 'Atari 2600', slug: 'atari-2600' },
  { name: 'TurboGrafx-16', slug: 'turbografx-16' },
  { name: 'Neo Geo', slug: 'neo-geo-aes' },
  { name: 'Atari Jaguar', slug: 'atari-jaguar' },
] as const

function makeId(title: string, platform: string) {
  return `${platform}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function normalizeText(value?: string | null) {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function hasOwnedCopies(item: InventoryItem) {
  return Array.isArray(item.copies) && item.copies.length > 0
}

function htmlDecode(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
}

async function scrapePlatformPage(slug: string, offset = 0) {
  const url = `https://www.pricecharting.com/console/${slug}?sort=title&status=&id=&offset=${offset}`
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) return { titles: [] as string[], hasMore: false }

  const html = await res.text()
  const titles: string[] = []
  const titlePattern = /<td[^>]*class="[^"]*title[^"]*"[^>]*>[\s\S]*?<a[^>]*href="\/game\/[^"]*"[^>]*>([^<]+)<\/a>/gi

  let match: RegExpExecArray | null
  while ((match = titlePattern.exec(html)) !== null) {
    const title = htmlDecode(match[1].trim())
    if (title) titles.push(title)
  }

  const hasMore = html.includes('class="next"') || html.includes('>Next<') || html.includes('rel="next"')
  return { titles, hasMore }
}

async function scrapePlatformTitles(platform: string) {
  const match = PLATFORM_SLUGS.find(entry => entry.name.toLowerCase() === platform.toLowerCase())
  if (!match) return { catalogFound: false, titles: [] as string[] }

  const allTitles = new Set<string>()
  let offset = 0

  while (true) {
    const { titles, hasMore } = await scrapePlatformPage(match.slug, offset)
    titles.forEach(title => allTitles.add(title))
    if (!hasMore || titles.length === 0) break
    offset += 25
  }

  return { catalogFound: true, titles: [...allTitles] }
}

export async function syncPlatformCatalog({ platform, enabledPlatforms, autoPopulate = true, previewOnly = false }: PlatformSyncOptions): Promise<PlatformSyncResult> {
  const inventory = readDataFile<InventoryItem[]>('inventory.json', [])
  const watchlist = readDataFile<WatchlistItem[]>('watchlist.json', [])
  const platformNormalized = normalizeText(platform)
  const enabledSet = new Set(enabledPlatforms)
  const mode: PlatformSyncMode = enabledSet.has(platform) ? 'enable' : 'disable'

  const result: PlatformSyncResult = {
    platform,
    mode,
    enabledPlatforms: [...enabledSet],
    catalogFound: false,
    populated: {
      attempted: false,
      added: 0,
      skipped: 0,
      totalTitlesDiscovered: 0,
    },
    pruned: {
      attempted: false,
      removed: 0,
      preservedOwned: 0,
      preservedWatchlist: 0,
      preservedWishlist: 0,
    },
  }

  if (mode === 'enable') {
    if (!autoPopulate) {
      return result
    }

    result.populated.attempted = true
    const { catalogFound, titles } = await scrapePlatformTitles(platform)
    result.catalogFound = catalogFound
    result.populated.totalTitlesDiscovered = titles.length

    if (!catalogFound || titles.length === 0) {
      return result
    }

    const existingIds = new Set(inventory.map(item => makeId(item.title, item.platform)))
    const nextInventory = [...inventory]

    for (const title of titles) {
      const id = makeId(title, platform)
      if (existingIds.has(id)) {
        result.populated.skipped += 1
        continue
      }

      nextInventory.push({
        id,
        title,
        platform,
        status: 'unowned',
        notes: '',
        copies: [],
      })
      existingIds.add(id)
      result.populated.added += 1
    }

    if (!previewOnly && result.populated.added > 0) {
      writeDataFile('inventory.json', nextInventory)
    }

    return result
  }

  result.pruned.attempted = true

  const watchlistKeys = new Set(
    watchlist
      .filter(item => normalizeText(item.platform) === platformNormalized)
      .map(item => `${normalizeText(item.title)}::${normalizeText(item.platform)}`)
  )

  const wishlistItems = await prisma.wishlistItem.findMany({
    where: { platform: platform },
    select: { title: true, platform: true },
  })

  const wishlistKeys = new Set(
    wishlistItems.map(item => `${normalizeText(item.title)}::${normalizeText(item.platform)}`)
  )

  const nextInventory: InventoryItem[] = []
  for (const item of inventory) {
    if (normalizeText(item.platform) !== platformNormalized) {
      nextInventory.push(item)
      continue
    }

    const lookupKey = `${normalizeText(item.title)}::${normalizeText(item.platform)}`
    const preserveOwned = hasOwnedCopies(item)
    const preserveWatchlist = watchlistKeys.has(lookupKey)
    const preserveWishlist = wishlistKeys.has(lookupKey)

    if (preserveOwned || preserveWatchlist || preserveWishlist) {
      if (preserveOwned) result.pruned.preservedOwned += 1
      if (preserveWatchlist) result.pruned.preservedWatchlist += 1
      if (preserveWishlist) result.pruned.preservedWishlist += 1
      nextInventory.push(item)
      continue
    }

    result.pruned.removed += 1
  }

  if (!previewOnly && result.pruned.removed > 0) {
    writeDataFile('inventory.json', nextInventory)
  }

  return result
}
