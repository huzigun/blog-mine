/*
  Warnings:

  - Added the required column `blogger_name` to the `keyword_trackings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "keyword_trackings" ADD COLUMN     "blogger_name" TEXT NOT NULL,
ADD COLUMN     "title" TEXT;
