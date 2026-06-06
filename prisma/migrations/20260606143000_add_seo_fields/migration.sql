-- CreateTable
CREATE TABLE IF NOT EXISTS "SeoMetadata" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "keywords" TEXT[],
    "canonicalUrl" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImageUrl" TEXT,
    "twitterTitle" TEXT,
    "twitterDescription" TEXT,
    "twitterImageUrl" TEXT,
    "schemaMarkup" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoMetadata_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add nullable columns first so existing rows can be backfilled
ALTER TABLE "Artist" ADD COLUMN IF NOT EXISTS "englishName" TEXT;
ALTER TABLE "Artist" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Artist" ADD COLUMN IF NOT EXISTS "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Artist" ADD COLUMN IF NOT EXISTS "englishBio" TEXT;
ALTER TABLE "Artist" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "Artist" ADD COLUMN IF NOT EXISTS "seoId" TEXT;

ALTER TABLE "Album" ADD COLUMN IF NOT EXISTS "englishName" TEXT;
ALTER TABLE "Album" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Album" ADD COLUMN IF NOT EXISTS "englishDescription" TEXT;
ALTER TABLE "Album" ADD COLUMN IF NOT EXISTS "seoId" TEXT;

ALTER TABLE "Genre" ADD COLUMN IF NOT EXISTS "englishName" TEXT;
ALTER TABLE "Genre" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Genre" ADD COLUMN IF NOT EXISTS "englishDescription" TEXT;
ALTER TABLE "Genre" ADD COLUMN IF NOT EXISTS "seoId" TEXT;

ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "englishTitle" TEXT;
ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "alternativeTitles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "englishDescription" TEXT;
ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "language" TEXT DEFAULT 'my';
ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "releaseDate" TIMESTAMP(3);
ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "seoId" TEXT;

ALTER TABLE "Playlist" ADD COLUMN IF NOT EXISTS "englishName" TEXT;
ALTER TABLE "Playlist" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Playlist" ADD COLUMN IF NOT EXISTS "seoId" TEXT;

-- Backfill slugs from english names/titles when available, otherwise romanized name/title, otherwise id-based fallback
WITH base AS (
    SELECT
        "id",
        "createdAt",
        COALESCE(
            NULLIF(trim(both '-' from regexp_replace(lower(trim(COALESCE("englishName", ''))), '[^a-z0-9]+', '-', 'g')), ''),
            NULLIF(trim(both '-' from regexp_replace(lower(trim("name")), '[^a-z0-9]+', '-', 'g')), ''),
            'artist-' || "id"
        ) AS base_slug
    FROM "Artist"
    WHERE "slug" IS NULL
),
ranked AS (
    SELECT
        "id",
        CASE
            WHEN row_number() OVER (PARTITION BY base_slug ORDER BY "createdAt", "id") > 1
                THEN base_slug || '-' || row_number() OVER (PARTITION BY base_slug ORDER BY "createdAt", "id")::TEXT
            ELSE base_slug
        END AS slug
    FROM base
)
UPDATE "Artist" a
SET "slug" = r.slug
FROM ranked r
WHERE a."id" = r."id";

WITH base AS (
    SELECT
        "id",
        "createdAt",
        COALESCE(
            NULLIF(trim(both '-' from regexp_replace(lower(trim(COALESCE("englishName", ''))), '[^a-z0-9]+', '-', 'g')), ''),
            NULLIF(trim(both '-' from regexp_replace(lower(trim("name")), '[^a-z0-9]+', '-', 'g')), ''),
            'album-' || "id"
        ) AS base_slug
    FROM "Album"
    WHERE "slug" IS NULL
),
ranked AS (
    SELECT
        "id",
        CASE
            WHEN row_number() OVER (PARTITION BY base_slug ORDER BY "createdAt", "id") > 1
                THEN base_slug || '-' || row_number() OVER (PARTITION BY base_slug ORDER BY "createdAt", "id")::TEXT
            ELSE base_slug
        END AS slug
    FROM base
)
UPDATE "Album" a
SET "slug" = r.slug
FROM ranked r
WHERE a."id" = r."id";

WITH base AS (
    SELECT
        "id",
        "createdAt",
        COALESCE(
            NULLIF(trim(both '-' from regexp_replace(lower(trim(COALESCE("englishName", ''))), '[^a-z0-9]+', '-', 'g')), ''),
            NULLIF(trim(both '-' from regexp_replace(lower(trim("name")), '[^a-z0-9]+', '-', 'g')), ''),
            'genre-' || "id"
        ) AS base_slug
    FROM "Genre"
    WHERE "slug" IS NULL
),
ranked AS (
    SELECT
        "id",
        CASE
            WHEN row_number() OVER (PARTITION BY base_slug ORDER BY "createdAt", "id") > 1
                THEN base_slug || '-' || row_number() OVER (PARTITION BY base_slug ORDER BY "createdAt", "id")::TEXT
            ELSE base_slug
        END AS slug
    FROM base
)
UPDATE "Genre" g
SET "slug" = r.slug
FROM ranked r
WHERE g."id" = r."id";

WITH base AS (
    SELECT
        "id",
        "createdAt",
        COALESCE(
            NULLIF(trim(both '-' from regexp_replace(lower(trim(COALESCE("englishTitle", ''))), '[^a-z0-9]+', '-', 'g')), ''),
            NULLIF(trim(both '-' from regexp_replace(lower(trim("title")), '[^a-z0-9]+', '-', 'g')), ''),
            'song-' || "id"
        ) AS base_slug
    FROM "Song"
    WHERE "slug" IS NULL
),
ranked AS (
    SELECT
        "id",
        CASE
            WHEN row_number() OVER (PARTITION BY base_slug ORDER BY "createdAt", "id") > 1
                THEN base_slug || '-' || row_number() OVER (PARTITION BY base_slug ORDER BY "createdAt", "id")::TEXT
            ELSE base_slug
        END AS slug
    FROM base
)
UPDATE "Song" s
SET "slug" = r.slug
FROM ranked r
WHERE s."id" = r."id";

WITH base AS (
    SELECT
        "id",
        "createdAt",
        COALESCE(
            NULLIF(trim(both '-' from regexp_replace(lower(trim(COALESCE("englishName", ''))), '[^a-z0-9]+', '-', 'g')), ''),
            NULLIF(trim(both '-' from regexp_replace(lower(trim("name")), '[^a-z0-9]+', '-', 'g')), ''),
            'playlist-' || "id"
        ) AS base_slug
    FROM "Playlist"
    WHERE "slug" IS NULL
),
ranked AS (
    SELECT
        "id",
        CASE
            WHEN row_number() OVER (PARTITION BY base_slug ORDER BY "createdAt", "id") > 1
                THEN base_slug || '-' || row_number() OVER (PARTITION BY base_slug ORDER BY "createdAt", "id")::TEXT
            ELSE base_slug
        END AS slug
    FROM base
)
UPDATE "Playlist" p
SET "slug" = r.slug
FROM ranked r
WHERE p."id" = r."id";

-- Enforce required slugs
ALTER TABLE "Artist" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Album" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Genre" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Song" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Playlist" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Album_slug_key" ON "Album"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Album_seoId_key" ON "Album"("seoId");
CREATE INDEX IF NOT EXISTS "Album_englishName_idx" ON "Album"("englishName");
CREATE INDEX IF NOT EXISTS "Album_slug_idx" ON "Album"("slug");

CREATE UNIQUE INDEX IF NOT EXISTS "Artist_slug_key" ON "Artist"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Artist_seoId_key" ON "Artist"("seoId");
CREATE INDEX IF NOT EXISTS "Artist_englishName_idx" ON "Artist"("englishName");
CREATE INDEX IF NOT EXISTS "Artist_slug_idx" ON "Artist"("slug");

CREATE UNIQUE INDEX IF NOT EXISTS "Genre_slug_key" ON "Genre"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Genre_seoId_key" ON "Genre"("seoId");
CREATE INDEX IF NOT EXISTS "Genre_slug_idx" ON "Genre"("slug");

CREATE UNIQUE INDEX IF NOT EXISTS "Playlist_slug_key" ON "Playlist"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Playlist_seoId_key" ON "Playlist"("seoId");
CREATE INDEX IF NOT EXISTS "Playlist_slug_idx" ON "Playlist"("slug");

CREATE UNIQUE INDEX IF NOT EXISTS "Song_slug_key" ON "Song"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Song_seoId_key" ON "Song"("seoId");
CREATE INDEX IF NOT EXISTS "Song_englishTitle_idx" ON "Song"("englishTitle");
CREATE INDEX IF NOT EXISTS "Song_slug_idx" ON "Song"("slug");
CREATE INDEX IF NOT EXISTS "Song_releaseDate_idx" ON "Song"("releaseDate");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Artist" ADD CONSTRAINT "Artist_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "SeoMetadata"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Genre" ADD CONSTRAINT "Genre_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "SeoMetadata"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Album" ADD CONSTRAINT "Album_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "SeoMetadata"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Song" ADD CONSTRAINT "Song_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "SeoMetadata"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Playlist" ADD CONSTRAINT "Playlist_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "SeoMetadata"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
