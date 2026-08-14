/**
 * Prisma Client — lazy singleton
 *
 * IMPORTANT: We use a lazy getter pattern rather than eager initialization.
 * During `npm run build`, Next.js imports all modules across 3+ parallel workers.
 * If the DB connection is opened at module evaluation time, all workers race to
 * open the same SQLite file → SQLITE_BUSY.
 *
 * Solution: defer DB connection until the first actual query.
 */

import { PrismaClient } from '@prisma/client'
import { getDatabasePath, getDatabaseUrl } from './runtimeDataPaths'

declare global {
  var __prisma: PrismaClient | undefined
}

function createClient(): PrismaClient {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3')
  const dbUrl = getDatabaseUrl()
  const dbPath = getDatabasePath()
  const sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('synchronous = NORMAL')
  const adapter = new PrismaBetterSqlite3({ url: dbUrl })
  return new PrismaClient({ adapter })
}

// Lazy singleton — connection deferred until first use
let _prisma: PrismaClient | undefined

export function getPrisma(): PrismaClient {
  if (!_prisma) {
    _prisma = globalThis.__prisma ?? createClient()
    if (process.env.NODE_ENV !== 'production') {
      globalThis.__prisma = _prisma
    }
  }
  return _prisma
}

// Proxy that looks like a PrismaClient but only connects on first property access
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrisma() as unknown as Record<string | symbol, unknown>)[prop]
  }
})

export default prisma
