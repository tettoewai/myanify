-- Admin-configurable app settings (download limits, VIP gating)
-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- Seed defaults: 100 songs max, VIP required
INSERT INTO "AppSetting" ("key", "value") VALUES
    ('download_max_songs', '100'),
    ('download_require_vip', 'true')
ON CONFLICT ("key") DO NOTHING;
