-- CreateEnum
CREATE TYPE "FoodRegion" AS ENUM ('local', 'international');

-- CreateEnum
CREATE TYPE "BudgetBand" AS ENUM ('low', 'moderate');

-- CreateEnum
CREATE TYPE "MealTiming" AS ENUM ('pre', 'post');

-- CreateEnum
CREATE TYPE "DietPattern" AS ENUM ('vegetarian', 'vegan');

-- CreateEnum
CREATE TYPE "NutrientName" AS ENUM ('energy', 'protein', 'carbohydrate', 'fat');

-- CreateEnum
CREATE TYPE "MealEmphasis" AS ENUM ('carbohydrate', 'protein', 'mixed');

-- CreateEnum
CREATE TYPE "Allergen" AS ENUM ('milk', 'egg', 'peanut', 'fish', 'soy', 'gluten', 'tree_nut');

-- CreateTable
CREATE TABLE "Food" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" "FoodRegion" NOT NULL,
    "servingSize" TEXT NOT NULL,
    "preparation" TEXT NOT NULL,
    "allergens" "Allergen"[] NOT NULL DEFAULT ARRAY[]::"Allergen"[],
    "diets" "DietPattern"[] NOT NULL DEFAULT ARRAY[]::"DietPattern"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Food_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodNutrient" (
    "id" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "nutrient" "NutrientName" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,

    CONSTRAINT "FoodNutrient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timing" "MealTiming" NOT NULL,
    "region" "FoodRegion" NOT NULL,
    "rationale" TEXT NOT NULL,
    "prepMinutes" INTEGER NOT NULL,
    "budget" "BudgetBand" NOT NULL,
    "emphasis" "MealEmphasis" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealFood" (
    "mealId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "MealFood_pkey" PRIMARY KEY ("mealId","foodId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Food_slug_key" ON "Food"("slug");

-- CreateIndex
CREATE INDEX "FoodNutrient_foodId_idx" ON "FoodNutrient"("foodId");

-- CreateIndex
CREATE UNIQUE INDEX "FoodNutrient_foodId_nutrient_key" ON "FoodNutrient"("foodId", "nutrient");

-- CreateIndex
CREATE UNIQUE INDEX "Meal_slug_key" ON "Meal"("slug");

-- CreateIndex
CREATE INDEX "Meal_timing_idx" ON "Meal"("timing");

-- CreateIndex
CREATE INDEX "Meal_region_idx" ON "Meal"("region");

-- CreateIndex
CREATE UNIQUE INDEX "MealFood_mealId_order_key" ON "MealFood"("mealId", "order");

-- AddForeignKey
ALTER TABLE "FoodNutrient" ADD CONSTRAINT "FoodNutrient_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealFood" ADD CONSTRAINT "MealFood_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealFood" ADD CONSTRAINT "MealFood_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;
