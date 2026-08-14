-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unowned',
    "notes" TEXT NOT NULL DEFAULT '',
    "isDigital" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "purchaseDate" TEXT,
    "lastFetched" DATETIME,
    "marketLoose" REAL,
    "marketCib" REAL,
    "marketNew" REAL,
    "marketGraded" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GameCopy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "condition" TEXT NOT NULL DEFAULT 'Loose',
    "hasBox" BOOLEAN NOT NULL DEFAULT false,
    "hasManual" BOOLEAN NOT NULL DEFAULT false,
    "priceAcquired" REAL NOT NULL DEFAULT 0,
    "purchaseDate" TEXT,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameCopy_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "loose" REAL,
    "cib" REAL,
    "new" REAL,
    "graded" REAL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceHistory_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    CONSTRAINT "Favorite_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Regret" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    CONSTRAINT "Regret_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "entityType" TEXT NOT NULL DEFAULT 'game',
    CONSTRAINT "GameTag_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Mention" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "toPersonId" TEXT NOT NULL,
    "fromPerson" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT NOT NULL DEFAULT 'game',
    "entityName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Mention_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Mention_toPersonId_fkey" FOREIGN KEY ("toPersonId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT,
    "gameTitle" TEXT NOT NULL,
    "platform" TEXT,
    "salePrice" REAL NOT NULL,
    "saleDate" TEXT NOT NULL,
    "condition" TEXT,
    "notes" TEXT,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Acquisition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT,
    "gameTitle" TEXT NOT NULL,
    "platform" TEXT,
    "cost" REAL NOT NULL,
    "purchaseDate" TEXT NOT NULL,
    "source" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "alertPrice" REAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Grail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "platform" TEXT,
    "notes" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "acquiredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PlayLogEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rating" INTEGER,
    "notes" TEXT,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CollectionGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "targetCount" INTEGER,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "dateRaw" TEXT NOT NULL,
    "date" TEXT,
    "location" TEXT NOT NULL DEFAULT '',
    "venue" TEXT,
    "url" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "description" TEXT,
    "attending" BOOLEAN NOT NULL DEFAULT false,
    "interested" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "scrapedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WhatnotSeller" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "specialty" TEXT NOT NULL DEFAULT '',
    "twitterUrl" TEXT,
    "instagramUrl" TEXT,
    "notes" TEXT,
    "notifyBefore" INTEGER NOT NULL DEFAULT 30,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WhatnotStream" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seller" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" DATETIME,
    "scheduledText" TEXT,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "attending" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ValueSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "totalValue" REAL NOT NULL,
    "totalCib" REAL NOT NULL,
    "totalPaid" REAL NOT NULL,
    "gameCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Game_platform_idx" ON "Game"("platform");

-- CreateIndex
CREATE INDEX "Game_lastFetched_idx" ON "Game"("lastFetched");

-- CreateIndex
CREATE INDEX "Game_marketLoose_idx" ON "Game"("marketLoose");

-- CreateIndex
CREATE INDEX "GameCopy_gameId_idx" ON "GameCopy"("gameId");

-- CreateIndex
CREATE INDEX "PriceHistory_gameId_idx" ON "PriceHistory"("gameId");

-- CreateIndex
CREATE INDEX "PriceHistory_date_idx" ON "PriceHistory"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PriceHistory_gameId_date_key" ON "PriceHistory"("gameId", "date");

-- CreateIndex
CREATE INDEX "Favorite_gameId_idx" ON "Favorite"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_personId_gameId_key" ON "Favorite"("personId", "gameId");

-- CreateIndex
CREATE INDEX "Regret_gameId_idx" ON "Regret"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "Regret_personId_gameId_key" ON "Regret"("personId", "gameId");

-- CreateIndex
CREATE INDEX "GameTag_tag_idx" ON "GameTag"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "GameTag_gameId_tag_key" ON "GameTag"("gameId", "tag");

-- CreateIndex
CREATE INDEX "Mention_toPersonId_idx" ON "Mention"("toPersonId");

-- CreateIndex
CREATE INDEX "Mention_gameId_idx" ON "Mention"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionGoal_platform_key" ON "CollectionGoal"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "WhatnotSeller_username_key" ON "WhatnotSeller"("username");

-- CreateIndex
CREATE UNIQUE INDEX "ValueSnapshot_date_key" ON "ValueSnapshot"("date");
