-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "gameId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "notes" TEXT,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "foundAt" DATETIME
);

-- CreateTable
CREATE TABLE "WishlistShare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'My Wishlist',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "WishlistItem_priority_idx" ON "WishlistItem"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistShare_token_key" ON "WishlistShare"("token");
