-- CreateEnum (idempotent — enum may exist from a prior partial run)
DO $$ BEGIN
  CREATE TYPE "AlbumType" AS ENUM ('SINGLE', 'EP', 'ALBUM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- DropIndex (idempotent)
DROP INDEX IF EXISTS "Lyrics_lines_gin_idx";

-- AlterTable
ALTER TABLE "Album" ADD COLUMN IF NOT EXISTS "type" "AlbumType" NOT NULL DEFAULT 'ALBUM';

-- AlterTable
ALTER TABLE "PaymentRequest" ADD COLUMN IF NOT EXISTS "planId" TEXT;

-- AlterTable
ALTER TABLE "PremiumSubscription" ADD COLUMN IF NOT EXISTS "planId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "type" "PlanType" NOT NULL DEFAULT 'MONTHLY',
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Plan_isActive_idx" ON "Plan"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentRequest_planId_idx" ON "PaymentRequest"("planId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PremiumSubscription_planId_idx" ON "PremiumSubscription"("planId");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  ALTER TABLE "PremiumSubscription" ADD CONSTRAINT "PremiumSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
