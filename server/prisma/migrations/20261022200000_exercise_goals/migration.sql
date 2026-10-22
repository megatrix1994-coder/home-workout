-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN "goals" "TrainingGoal"[] NOT NULL DEFAULT ARRAY[]::"TrainingGoal"[];
