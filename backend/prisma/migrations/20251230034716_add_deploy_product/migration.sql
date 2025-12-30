-- CreateTable
CREATE TABLE "deploy_products" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "credit" INTEGER NOT NULL,
    "description" TEXT,
    "features" TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deploy_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deploy_products_is_active_sort_order_idx" ON "deploy_products"("is_active", "sort_order");
