-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "soldAt" TIMESTAMP(3);
ALTER TABLE "Listing" ADD COLUMN "soldById" TEXT;
ALTER TABLE "Listing" ADD COLUMN "soldSnapshot" JSONB;

-- CreateIndex
CREATE INDEX "Listing_userId_soldAt_idx" ON "Listing"("userId", "soldAt");

-- CreateIndex
CREATE INDEX "Listing_status_soldAt_updatedAt_idx" ON "Listing"("status", "soldAt", "updatedAt");

-- CreateIndex
CREATE INDEX "Listing_soldAt_idx" ON "Listing"("soldAt");
