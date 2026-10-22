-- AlterEnum
ALTER TYPE "StretchPurpose" ADD VALUE 'cooldown';

-- CreateEnum
CREATE TYPE "CooldownStatus" AS ENUM ('pending', 'completed', 'skipped');

-- CreateTable
CREATE TABLE "WorkoutCooldown" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "stretchId" TEXT NOT NULL,
    "muscleId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "status" "CooldownStatus" NOT NULL DEFAULT 'pending',

    CONSTRAINT "WorkoutCooldown_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkoutCooldown_stretchId_idx" ON "WorkoutCooldown"("stretchId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutCooldown_workoutId_order_key" ON "WorkoutCooldown"("workoutId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutCooldown_workoutId_muscleId_key" ON "WorkoutCooldown"("workoutId", "muscleId");

-- AddForeignKey
ALTER TABLE "WorkoutCooldown" ADD CONSTRAINT "WorkoutCooldown_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "WorkoutPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutCooldown" ADD CONSTRAINT "WorkoutCooldown_stretchId_fkey" FOREIGN KEY ("stretchId") REFERENCES "Stretch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutCooldown" ADD CONSTRAINT "WorkoutCooldown_muscleId_fkey" FOREIGN KEY ("muscleId") REFERENCES "MuscleGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
