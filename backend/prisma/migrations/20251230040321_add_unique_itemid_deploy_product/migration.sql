/*
  Warnings:

  - A unique constraint covering the columns `[item_id]` on the table `deploy_products` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `item_id` to the `deploy_products` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "deploy_products" ADD COLUMN     "item_id" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "deploy_products_item_id_key" ON "deploy_products"("item_id");
