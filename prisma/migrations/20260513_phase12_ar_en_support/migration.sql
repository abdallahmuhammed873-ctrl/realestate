-- AlterTable
ALTER TABLE "Property"
ADD COLUMN "titleEn" TEXT,
ADD COLUMN "titleAr" TEXT,
ADD COLUMN "descriptionEn" TEXT,
ADD COLUMN "descriptionAr" TEXT;

-- Backfill existing rows so current content has an explicit language column.
UPDATE "Property"
SET
  "titleEn" = COALESCE(NULLIF("titleEn", ''), "title"),
  "descriptionEn" = COALESCE(NULLIF("descriptionEn", ''), "description")
WHERE "titleEn" IS NULL
   OR "titleEn" = ''
   OR "descriptionEn" IS NULL
   OR "descriptionEn" = '';
