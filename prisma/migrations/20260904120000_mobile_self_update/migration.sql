-- Mobile self-update (no Play Store): releases table + telemetry
-- CreateTable
CREATE TABLE "MobileRelease" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "versionCode" INTEGER NOT NULL,
    "apkUrl" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "sha256" TEXT,
    "md5" TEXT,
    "fileSize" INTEGER,
    "minVersionCode" INTEGER,
    "rollout" INTEGER,
    "certSha256" TEXT,
    "previousVersion" TEXT,
    "previousVersionCode" INTEGER,
    "previousApkUrl" TEXT,
    "signature" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MobileRelease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MobileRelease_versionCode_key" ON "MobileRelease"("versionCode");

-- CreateIndex
CREATE INDEX "MobileRelease_isActive_versionCode_idx" ON "MobileRelease"("isActive", "versionCode");

-- CreateTable
CREATE TABLE "MobileUpdateEvent" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'android',
    "currentVersionCode" INTEGER,
    "latestVersionCode" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileUpdateEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MobileUpdateEvent_event_createdAt_idx" ON "MobileUpdateEvent"("event", "createdAt");

-- CreateIndex
CREATE INDEX "MobileUpdateEvent_latestVersionCode_idx" ON "MobileUpdateEvent"("latestVersionCode");
