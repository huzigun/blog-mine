/*
  Warnings:

  - You are about to drop the column `additional_info` on the `personas` table. All the data in the column will be lost.
  - You are about to drop the column `age` on the `personas` table. All the data in the column will be lost.
  - You are about to drop the column `has_children` on the `personas` table. All the data in the column will be lost.
  - You are about to drop the column `is_married` on the `personas` table. All the data in the column will be lost.
  - You are about to drop the column `occupation` on the `personas` table. All the data in the column will be lost.
  - Added the required column `blog_topic` to the `personas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "personas" DROP COLUMN "additional_info",
DROP COLUMN "age",
DROP COLUMN "has_children",
DROP COLUMN "is_married",
DROP COLUMN "occupation",
ADD COLUMN     "blog_topic" TEXT NOT NULL,
ADD COLUMN     "characteristics" TEXT;
