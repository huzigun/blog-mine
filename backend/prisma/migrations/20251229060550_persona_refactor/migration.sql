/*
  Warnings:

  - You are about to drop the column `blog_style` on the `personas` table. All the data in the column will be lost.
  - You are about to drop the column `blog_tone` on the `personas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "personas" DROP COLUMN "blog_style",
DROP COLUMN "blog_tone";
