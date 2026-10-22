-- AlterEnum
ALTER TYPE "WorkoutStatus" ADD VALUE 'completed';

-- AlterTable
ALTER TABLE "WorkoutPlan" ADD COLUMN "completedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WorkoutSetLog" (
    "id" TEXT NOT NULL,
    "workoutExerciseId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "repsCompleted" INTEGER NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutSetLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkoutSetLog_workoutExerciseId_idx" ON "WorkoutSetLog"("workoutExerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutSetLog_workoutExerciseId_round_setNumber_key" ON "WorkoutSetLog"("workoutExerciseId", "round", "setNumber");

-- AddForeignKey
ALTER TABLE "WorkoutSetLog" ADD CONSTRAINT "WorkoutSetLog_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
