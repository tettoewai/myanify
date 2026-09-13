-- Add song type signals for personalized recommendations (mood + tags)
ALTER TABLE "Song" ADD COLUMN "mood" TEXT;
ALTER TABLE "Song" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE INDEX "Song_mood_idx" ON "Song"("mood");
