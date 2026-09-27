-- CreateEnum
CREATE TYPE "PhotoFormat" AS ENUM ('PASSE', 'CV', 'QUADRADA', 'PERSONALIZADA');

-- CreateEnum
CREATE TYPE "BackgroundCategory" AS ENUM ('NEUTRO', 'CORPORATIVO', 'GRADIENTE');

-- CreateEnum
CREATE TYPE "BackgroundKind" AS ENUM ('SOLID', 'GRADIENT', 'PATTERN', 'IMAGE');

-- CreateEnum
CREATE TYPE "OutfitGender" AS ENUM ('MASCULINO', 'FEMININO');

-- CreateEnum
CREATE TYPE "OutfitGarment" AS ENUM ('BLAZER', 'FATO', 'CAMISA', 'BLUSA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DownloadKind" ADD VALUE 'PHOTO_JPG';
ALTER TYPE "DownloadKind" ADD VALUE 'PHOTO_PNG';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderItemKind" ADD VALUE 'PHOTO_UNLOCK';
ALTER TYPE "OrderItemKind" ADD VALUE 'CV_PHOTO_BUNDLE';

-- AlterTable
ALTER TABLE "CV" ADD COLUMN     "professionalPhotoId" TEXT;

-- AlterTable
ALTER TABLE "Download" ADD COLUMN     "photoId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "photoId" TEXT;

-- AlterTable
ALTER TABLE "PaymentSettings" ADD COLUMN     "photoBundlePriceMinor" INTEGER,
ADD COLUMN     "photoPriceMinor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "photoPromoEndsAt" TIMESTAMP(3),
ADD COLUMN     "photoPromoPriceMinor" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "imageAiConsentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProfessionalPhoto" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalKey" TEXT NOT NULL,
    "resultKey" TEXT,
    "thumbKey" TEXT,
    "format" "PhotoFormat" NOT NULL DEFAULT 'CV',
    "width" INTEGER,
    "height" INTEGER,
    "settings" JSONB,
    "backgroundId" TEXT,
    "outfitId" TEXT,
    "styleLabel" TEXT NOT NULL DEFAULT '',
    "purchasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoBackground" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "BackgroundCategory" NOT NULL,
    "kind" "BackgroundKind" NOT NULL,
    "color1" TEXT NOT NULL DEFAULT '#ffffff',
    "color2" TEXT,
    "pattern" TEXT,
    "imageKey" TEXT,
    "passport" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhotoBackground_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoOutfit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "OutfitGender" NOT NULL,
    "garment" "OutfitGarment" NOT NULL,
    "jacketColor" TEXT,
    "shirtColor" TEXT NOT NULL,
    "tieColor" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhotoOutfit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfessionalPhoto_userId_createdAt_idx" ON "ProfessionalPhoto"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PhotoBackground_isActive_sortOrder_idx" ON "PhotoBackground"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "PhotoOutfit_isActive_sortOrder_idx" ON "PhotoOutfit"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "OrderItem_photoId_idx" ON "OrderItem"("photoId");

-- AddForeignKey
ALTER TABLE "CV" ADD CONSTRAINT "CV_professionalPhotoId_fkey" FOREIGN KEY ("professionalPhotoId") REFERENCES "ProfessionalPhoto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "ProfessionalPhoto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Download" ADD CONSTRAINT "Download_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "ProfessionalPhoto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalPhoto" ADD CONSTRAINT "ProfessionalPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalPhoto" ADD CONSTRAINT "ProfessionalPhoto_backgroundId_fkey" FOREIGN KEY ("backgroundId") REFERENCES "PhotoBackground"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalPhoto" ADD CONSTRAINT "ProfessionalPhoto_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "PhotoOutfit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
