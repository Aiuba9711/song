-- AlterTable
ALTER TABLE "CV" ADD COLUMN     "objective" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aiConsentAt" TIMESTAMP(3);
