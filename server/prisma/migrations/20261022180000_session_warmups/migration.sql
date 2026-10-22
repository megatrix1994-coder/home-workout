-- CreateEnum
CREATE TYPE "StretchPurpose" AS ENUM ('warmup');

-- AlterTable
ALTER TABLE "Stretch" ADD COLUMN "purpose" "StretchPurpose" NOT NULL DEFAULT 'warmup';

-- AlterTable
ALTER TABLE "WorkoutPlan" ADD COLUMN "estimatedMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "rounds" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "WorkoutWarmup" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "stretchId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,

    CONSTRAINT "WorkoutWarmup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkoutWarmup_stretchId_idx" ON "WorkoutWarmup"("stretchId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutWarmup_workoutId_order_key" ON "WorkoutWarmup"("workoutId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutWarmup_workoutId_stretchId_key" ON "WorkoutWarmup"("workoutId", "stretchId");

-- AddForeignKey
ALTER TABLE "WorkoutWarmup" ADD CONSTRAINT "WorkoutWarmup_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "WorkoutPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutWarmup" ADD CONSTRAINT "WorkoutWarmup_stretchId_fkey" FOREIGN KEY ("stretchId") REFERENCES "Stretch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
