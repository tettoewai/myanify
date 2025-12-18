-- CreateTable: SongArtist junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS "SongArtist" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SongArtist_pkey" PRIMARY KEY ("id")
);

-- Migrate existing data from Song.artistId to SongArtist
-- Using a combination of songId and artistId with a random component to create unique IDs
-- Only insert if the data doesn't already exist
INSERT INTO "SongArtist" ("id", "songId", "artistId", "createdAt")
SELECT 
    CONCAT('songartist_', "id", '_', "artistId", '_', REPLACE(gen_random_uuid()::text, '-', '')) as "id",
    "id" as "songId",
    "artistId",
    "createdAt"
FROM "Song"
WHERE "artistId" IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM "SongArtist" sa 
    WHERE sa."songId" = "Song"."id" AND sa."artistId" = "Song"."artistId"
);

-- CreateIndex
CREATE INDEX "SongArtist_songId_idx" ON "SongArtist"("songId");

-- CreateIndex
CREATE INDEX "SongArtist_artistId_idx" ON "SongArtist"("artistId");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "SongArtist_songId_artistId_key" ON "SongArtist"("songId", "artistId");

-- AddForeignKey
ALTER TABLE "SongArtist" ADD CONSTRAINT "SongArtist_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongArtist" ADD CONSTRAINT "SongArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey (remove the old foreign key constraint)
ALTER TABLE "Song" DROP CONSTRAINT IF EXISTS "Song_artistId_fkey";

-- DropIndex (remove the old index)
DROP INDEX IF EXISTS "Song_artistId_idx";

-- AlterTable (remove the artistId column)
ALTER TABLE "Song" DROP COLUMN "artistId";

