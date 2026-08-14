ALTER TABLE "WishlistItem" ADD COLUMN "playerId" TEXT;

CREATE INDEX "WishlistItem_playerId_idx" ON "WishlistItem"("playerId");
