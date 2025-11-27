-- CreateEnum
CREATE TYPE "ContactCategory" AS ENUM ('GENERAL', 'TECHNICAL', 'BILLING', 'FEATURE', 'BUG', 'PARTNERSHIP', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "contacts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" "ContactCategory" NOT NULL DEFAULT 'GENERAL',
    "status" "ContactStatus" NOT NULL DEFAULT 'PENDING',
    "admin_note" TEXT,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "contacts"("email");

-- CreateIndex
CREATE INDEX "contacts_status_created_at_idx" ON "contacts"("status", "created_at");

-- CreateIndex
CREATE INDEX "contacts_category_idx" ON "contacts"("category");
