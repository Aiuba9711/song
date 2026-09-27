-- AlterEnum
ALTER TYPE "OrderItemKind" ADD VALUE 'LETTER_UNLOCK';

-- AlterTable
ALTER TABLE "CoverLetter" ADD COLUMN     "city" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "purchasedAt" TIMESTAMP(3),
ADD COLUMN     "subject" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Download" ADD COLUMN     "letterId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "letterId" TEXT;

-- AlterTable
ALTER TABLE "PaymentSettings" ADD COLUMN     "letterPriceMinor" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "whatsappCountryCode" TEXT NOT NULL DEFAULT '258',
ADD COLUMN     "whatsappLinksEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "OrderItem_letterId_idx" ON "OrderItem"("letterId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_letterId_fkey" FOREIGN KEY ("letterId") REFERENCES "CoverLetter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Download" ADD CONSTRAINT "Download_letterId_fkey" FOREIGN KEY ("letterId") REFERENCES "CoverLetter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
