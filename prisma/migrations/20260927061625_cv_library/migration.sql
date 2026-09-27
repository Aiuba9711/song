-- CreateEnum
CREATE TYPE "CourseKind" AS ENUM ('COURSE', 'CERTIFICATION');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TemplateCategory" ADD VALUE 'RECEM_FORMADO';
ALTER TYPE "TemplateCategory" ADD VALUE 'ENFERMAGEM';
ALTER TYPE "TemplateCategory" ADD VALUE 'OPTOMETRIA';
ALTER TYPE "TemplateCategory" ADD VALUE 'MARKETING';
ALTER TYPE "TemplateCategory" ADD VALUE 'VENDAS';
ALTER TYPE "TemplateCategory" ADD VALUE 'ATENDIMENTO_CLIENTE';
ALTER TYPE "TemplateCategory" ADD VALUE 'GESTAO';
ALTER TYPE "TemplateCategory" ADD VALUE 'FINANCAS';
ALTER TYPE "TemplateCategory" ADD VALUE 'CONSTRUCAO';
ALTER TYPE "TemplateCategory" ADD VALUE 'LOGISTICA';
ALTER TYPE "TemplateCategory" ADD VALUE 'HOTELARIA';
ALTER TYPE "TemplateCategory" ADD VALUE 'MOTORISTA';
ALTER TYPE "TemplateCategory" ADD VALUE 'TECNICO_PROFISSIONAL';

-- AlterTable
ALTER TABLE "CV" ADD COLUMN     "photoOffsetX" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "photoOffsetY" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "photoPosition" TEXT,
ADD COLUMN     "photoZoom" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "purchasedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CVCourse" ADD COLUMN     "kind" "CourseKind" NOT NULL DEFAULT 'COURSE';

-- AlterTable
ALTER TABLE "CVTemplate" ADD COLUMN     "design" JSONB,
ADD COLUMN     "isAtsFriendly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "previewImageKey" TEXT,
ADD COLUMN     "previewImageUrl" TEXT,
ADD COLUMN     "priceMinor" INTEGER,
ADD COLUMN     "style" TEXT NOT NULL DEFAULT 'Profissional';

-- AlterTable
ALTER TABLE "PaymentSettings" ALTER COLUMN "cvPaywallEnabled" SET DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currentCvTemplateId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_currentCvTemplateId_fkey" FOREIGN KEY ("currentCvTemplateId") REFERENCES "CVTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Dados: Vendas/Marketing passa a ser Vendas; download pago ativo (cada CV profissional = 199 MT).
UPDATE "CVTemplate" SET "category" = 'VENDAS' WHERE "category" = 'VENDAS_MARKETING';
UPDATE "PaymentSettings" SET "cvPaywallEnabled" = true;
