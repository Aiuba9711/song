-- CreateEnum
CREATE TYPE "OrderItemKind" AS ENUM ('PRODUCT', 'CV_UNLOCK');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('MANUAL', 'API');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'PENDING_VERIFICATION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'PENDING_VERIFICATION';
ALTER TYPE "PaymentStatus" ADD VALUE 'RESUBMISSION_REQUESTED';
ALTER TYPE "PaymentStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancelledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "cvId" TEXT,
ADD COLUMN     "kind" "OrderItemKind" NOT NULL DEFAULT 'PRODUCT';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "mode" "PaymentMode" NOT NULL DEFAULT 'API',
ADD COLUMN     "payeeNumber" TEXT,
ADD COLUMN     "payerName" TEXT,
ADD COLUMN     "proofKey" TEXT,
ADD COLUMN     "proofMime" TEXT,
ADD COLUMN     "reportedPaidAt" TIMESTAMP(3),
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "transactionId" TEXT;

-- CreateTable
CREATE TABLE "PaymentSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "mpesaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mpesaNumber" TEXT,
    "emolaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emolaNumber" TEXT,
    "mkeshEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mkeshNumber" TEXT,
    "accountHolderName" TEXT,
    "instructions" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'MZN',
    "defaultPriceMinor" INTEGER NOT NULL DEFAULT 19900,
    "cvPaywallEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cardEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderItem_cvId_idx" ON "OrderItem"("cvId");

-- CreateIndex
CREATE INDEX "Payment_status_submittedAt_idx" ON "Payment"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "Payment_provider_transactionId_idx" ON "Payment"("provider", "transactionId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "CV"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
