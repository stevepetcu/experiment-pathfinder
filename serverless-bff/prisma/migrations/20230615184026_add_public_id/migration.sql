-- AlterTable
ALTER TABLE "HighScore" ADD COLUMN     "publicId" STRING NOT NULL DEFAULT gen_random_uuid();
