-- CreateEnum
CREATE TYPE "SchedulerTaskStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL');

-- CreateTable
CREATE TABLE "scheduler_logs" (
    "id" SERIAL NOT NULL,
    "task_name" TEXT NOT NULL,
    "status" "SchedulerTaskStatus" NOT NULL DEFAULT 'RUNNING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "duration" INTEGER,
    "total_items" INTEGER,
    "processed_items" INTEGER DEFAULT 0,
    "success_items" INTEGER DEFAULT 0,
    "failed_items" INTEGER DEFAULT 0,
    "message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduler_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduler_logs_task_name_started_at_idx" ON "scheduler_logs"("task_name", "started_at");

-- CreateIndex
CREATE INDEX "scheduler_logs_status_started_at_idx" ON "scheduler_logs"("status", "started_at");

-- CreateIndex
CREATE INDEX "scheduler_logs_started_at_idx" ON "scheduler_logs"("started_at");
