-- DropIndex (idempotent — index may not exist depending on migration order)
DROP INDEX IF EXISTS "Lyrics_lines_gin_idx";
