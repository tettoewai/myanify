-- CreateTable
CREATE TABLE "LikedArtist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "likedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LikedArtist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LikedArtist_userId_idx" ON "LikedArtist"("userId");

-- CreateIndex
CREATE INDEX "LikedArtist_artistId_idx" ON "LikedArtist"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "LikedArtist_userId_artistId_key" ON "LikedArtist"("userId", "artistId");

-- AddForeignKey
ALTER TABLE "LikedArtist" ADD CONSTRAINT "LikedArtist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikedArtist" ADD CONSTRAINT "LikedArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

