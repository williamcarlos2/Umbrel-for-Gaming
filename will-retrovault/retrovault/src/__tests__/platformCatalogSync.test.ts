import { beforeEach, describe, expect, it, vi } from 'vitest'

const readDataFile = vi.fn()
const writeDataFile = vi.fn()
const findMany = vi.fn()

vi.mock('@/lib/data', () => ({
  readDataFile,
  writeDataFile,
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    wishlistItem: { findMany },
  },
}))

describe('platformCatalogSync', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('adds missing catalog titles when enabling a platform', async () => {
    readDataFile.mockImplementation((filename: string) => {
      if (filename === 'inventory.json') {
        return [{ id: 'wii-existing-game', title: 'Existing Game', platform: 'Wii', copies: [] }]
      }
      if (filename === 'watchlist.json') return []
      return []
    })
    findMany.mockResolvedValue([])
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '<tr><td class="title" title="1">\n  <a href="/game/wii/existing-game">Existing Game</a>\n</td></tr><tr><td class="title" title="2">\n  <a href="/game/wii/super-mario-galaxy">Super Mario Galaxy</a>\n</td></tr>'
      }))

    const { syncPlatformCatalog } = await import('@/lib/platformCatalogSync')
    const result = await syncPlatformCatalog({ platform: 'Wii', enabledPlatforms: ['Wii'], autoPopulate: true })

    expect(result.mode).toBe('enable')
    expect(result.populated.added).toBe(1)
    expect(result.populated.skipped).toBe(1)
    expect(writeDataFile).toHaveBeenCalledTimes(1)
    const [, savedInventory] = writeDataFile.mock.calls[0]
    expect(savedInventory).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Existing Game', platform: 'Wii' }),
      expect.objectContaining({ title: 'Super Mario Galaxy', platform: 'Wii', status: 'unowned' }),
    ]))
  })

  it('uses console pages for catalog scraping so Virtual Boy can bootstrap from PriceCharting', async () => {
    readDataFile.mockImplementation((filename: string) => {
      if (filename === 'inventory.json') return []
      if (filename === 'watchlist.json') return []
      return []
    })
    findMany.mockResolvedValue([])
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<tr><td class="title" title="20121">\n  <a href="/game/virtual-boy/virtual-boy-system">Virtual Boy System</a>\n</td></tr>'
    })
    vi.stubGlobal('fetch', fetchMock)

    const { syncPlatformCatalog } = await import('@/lib/platformCatalogSync')
    const result = await syncPlatformCatalog({ platform: 'Virtual Boy', enabledPlatforms: ['Virtual Boy'], autoPopulate: true })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('https://www.pricecharting.com/console/virtual-boy'),
      expect.any(Object)
    )
    expect(result.catalogFound).toBe(true)
    expect(result.populated.totalTitlesDiscovered).toBe(1)
    expect(result.populated.added).toBe(1)
  })

  it('does not write inventory during preview-only prune runs', async () => {
    readDataFile.mockImplementation((filename: string) => {
      if (filename === 'inventory.json') {
        return [
          { id: 'wii-prune', title: 'Prune Me', platform: 'Wii', copies: [] },
          { id: 'snes-keep', title: 'Other Platform', platform: 'SNES', copies: [] },
        ]
      }
      if (filename === 'watchlist.json') return []
      return []
    })
    findMany.mockResolvedValue([])

    const { syncPlatformCatalog } = await import('@/lib/platformCatalogSync')
    const result = await syncPlatformCatalog({ platform: 'Wii', enabledPlatforms: ['SNES'], autoPopulate: true, previewOnly: true })

    expect(result.mode).toBe('disable')
    expect(result.pruned.removed).toBe(1)
    expect(writeDataFile).not.toHaveBeenCalled()
  })

  it('prunes only untracked games when disabling a platform', async () => {
    readDataFile.mockImplementation((filename: string) => {
      if (filename === 'inventory.json') {
        return [
          { id: 'wii-owned', title: 'Owned Game', platform: 'Wii', copies: [{ id: 'copy-1' }] },
          { id: 'wii-watch', title: 'Watch Game', platform: 'Wii', copies: [] },
          { id: 'wii-wish', title: 'Wish Game', platform: 'Wii', copies: [] },
          { id: 'wii-prune', title: 'Prune Me', platform: 'Wii', copies: [] },
          { id: 'snes-keep', title: 'Other Platform', platform: 'SNES', copies: [] },
        ]
      }
      if (filename === 'watchlist.json') {
        return [{ title: 'Watch Game', platform: 'Wii' }]
      }
      return []
    })
    findMany.mockResolvedValue([{ title: 'Wish Game', platform: 'Wii' }])

    const { syncPlatformCatalog } = await import('@/lib/platformCatalogSync')
    const result = await syncPlatformCatalog({ platform: 'Wii', enabledPlatforms: ['SNES'], autoPopulate: true })

    expect(result.mode).toBe('disable')
    expect(result.pruned.removed).toBe(1)
    expect(result.pruned.preservedOwned).toBe(1)
    expect(result.pruned.preservedWatchlist).toBe(1)
    expect(result.pruned.preservedWishlist).toBe(1)
    expect(writeDataFile).toHaveBeenCalledTimes(1)
    const [, savedInventory] = writeDataFile.mock.calls[0]
    expect(savedInventory).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Owned Game', platform: 'Wii' }),
      expect.objectContaining({ title: 'Watch Game', platform: 'Wii' }),
      expect.objectContaining({ title: 'Wish Game', platform: 'Wii' }),
      expect.objectContaining({ title: 'Other Platform', platform: 'SNES' }),
    ]))
    expect(savedInventory).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Prune Me', platform: 'Wii' }),
    ]))
  })
})
