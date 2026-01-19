-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DownloadStatus" AS ENUM ('PENDING', 'DOWNLOADING', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('MOBILE', 'WEB');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('BANK', 'MOBILE_MONEY', 'E_WALLET', 'OTHER');

-- CreateTable
CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentMethodId" TEXT,
    "planType" "PlanType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "proofImageUrl" TEXT,
    "notes" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfflineDownload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "encryptedFilePath" TEXT,
    "downloadStatus" "DownloadStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "fileSize" INTEGER,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfflineDownload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceLicense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT,
    "deviceType" "DeviceType" NOT NULL,
    "licenseKey" TEXT NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "lastValidatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "accountName" TEXT,
    "accountNumber" TEXT,
    "qrCodeUrl" TEXT,
    "instructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentRequest_userId_idx" ON "PaymentRequest"("userId");

-- CreateIndex
CREATE INDEX "PaymentRequest_status_idx" ON "PaymentRequest"("status");

-- CreateIndex
CREATE INDEX "PaymentRequest_referenceNumber_idx" ON "PaymentRequest"("referenceNumber");

-- CreateIndex
CREATE INDEX "PaymentRequest_createdAt_idx" ON "PaymentRequest"("createdAt");

-- CreateIndex
CREATE INDEX "PaymentRequest_paymentMethodId_idx" ON "PaymentRequest"("paymentMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_referenceNumber_key" ON "PaymentRequest"("referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OfflineDownload_userId_songId_key" ON "OfflineDownload"("userId", "songId");

-- CreateIndex
CREATE INDEX "OfflineDownload_userId_idx" ON "OfflineDownload"("userId");

-- CreateIndex
CREATE INDEX "OfflineDownload_songId_idx" ON "OfflineDownload"("songId");

-- CreateIndex
CREATE INDEX "OfflineDownload_downloadStatus_idx" ON "OfflineDownload"("downloadStatus");

-- CreateIndex
CREATE INDEX "OfflineDownload_expiresAt_idx" ON "OfflineDownload"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceLicense_userId_deviceId_key" ON "DeviceLicense"("userId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceLicense_licenseKey_key" ON "DeviceLicense"("licenseKey");

-- CreateIndex
CREATE INDEX "DeviceLicense_userId_idx" ON "DeviceLicense"("userId");

-- CreateIndex
CREATE INDEX "DeviceLicense_deviceId_idx" ON "DeviceLicense"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceLicense_licenseKey_idx" ON "DeviceLicense"("licenseKey");

-- CreateIndex
CREATE INDEX "DeviceLicense_isValid_idx" ON "DeviceLicense"("isValid");

-- CreateIndex
CREATE INDEX "PaymentMethod_isActive_idx" ON "PaymentMethod"("isActive");

-- CreateIndex
CREATE INDEX "PaymentMethod_displayOrder_idx" ON "PaymentMethod"("displayOrder");

-- CreateIndex
CREATE INDEX "PaymentMethod_createdById_idx" ON "PaymentMethod"("createdById");

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineDownload" ADD CONSTRAINT "OfflineDownload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineDownload" ADD CONSTRAINT "OfflineDownload_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceLicense" ADD CONSTRAINT "DeviceLicense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

