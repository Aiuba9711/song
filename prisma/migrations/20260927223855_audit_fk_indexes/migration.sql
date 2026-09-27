-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "CV_templateId_idx" ON "CV"("templateId");

-- CreateIndex
CREATE INDEX "CV_professionalPhotoId_idx" ON "CV"("professionalPhotoId");

-- CreateIndex
CREATE INDEX "Download_cvId_idx" ON "Download"("cvId");

-- CreateIndex
CREATE INDEX "Download_letterId_idx" ON "Download"("letterId");

-- CreateIndex
CREATE INDEX "Download_photoId_idx" ON "Download"("photoId");

-- CreateIndex
CREATE INDEX "Download_productFileId_idx" ON "Download"("productFileId");

-- CreateIndex
CREATE INDEX "Order_couponId_idx" ON "Order"("couponId");

-- CreateIndex
CREATE INDEX "ProfessionalPhoto_backgroundId_idx" ON "ProfessionalPhoto"("backgroundId");

-- CreateIndex
CREATE INDEX "ProfessionalPhoto_outfitId_idx" ON "ProfessionalPhoto"("outfitId");
