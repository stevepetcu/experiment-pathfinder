/*
  Warnings:

  - Changed the type of `timeToComplete` on the `HighScore` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "HighScore" DROP COLUMN "timeToComplete";
ALTER TABLE "HighScore" ADD COLUMN     "timeToComplete" INT2 NOT NULL;
