-- CreateTable
CREATE TABLE "CollectionShare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'My Collection',
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "CollectionShare_token_key" ON "CollectionShare"("token");
