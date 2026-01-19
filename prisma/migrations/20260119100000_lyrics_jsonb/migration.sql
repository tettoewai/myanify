-- CreateTable
CREATE TABLE "Lyrics" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'my',
    "lines" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lyrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lyrics_songId_language_key" ON "Lyrics"("songId", "language");

-- CreateIndex
CREATE INDEX "Lyrics_songId_idx" ON "Lyrics"("songId");

-- CreateIndex
CREATE INDEX "Lyrics_language_idx" ON "Lyrics"("language");

-- CreateIndex for JSONB search
CREATE INDEX "Lyrics_lines_gin_idx" ON "Lyrics" USING GIN ("lines");

-- AddForeignKey
ALTER TABLE "Lyrics" ADD CONSTRAINT "Lyrics_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate data from LyricLine to Lyrics as JSONB
INSERT INTO "Lyrics" ("id", "songId", "language", "lines", "createdAt")
SELECT
  "songId" || ':my' AS "id",
  "songId",
  'my' AS "language",
  jsonb_agg(
    jsonb_build_object(
      'order', "order",
      'time', "time",
      'text', "text",
      'translation', "translation"
    ) ORDER BY "order"
  ) AS "lines",
  MIN("createdAt") AS "createdAt"
FROM "LyricLine"
GROUP BY "songId";

-- Drop old LyricLine table now that data is migrated
DROP TABLE "LyricLine";

