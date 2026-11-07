import { Router } from 'express';
import { prisma } from '../db.js';
import { foods, meals } from '../nutrition.js';
import { isMissingCatalogueTable } from '../lib/catalogue-fallback.js';
import { nutritionQuerySchema } from '../lib/nutrition-query.js';
import {
  recommendMeals,
  type MealFoodInput,
  type MealInput,
} from '../lib/nutrition.js';
import { asyncHandler } from '../middleware/error-handler.js';

const mealInclude = {
  foods: {
    orderBy: { order: 'asc' as const },
    include: { food: { include: { nutrients: true } } },
  },
} as const;

type StoredMeal = {
  slug: string;
  name: string;
  timing: MealInput['timing'];
  region: MealInput['region'];
  rationale: string;
  prepMinutes: number;
  budget: MealInput['budget'];
  emphasis: MealInput['emphasis'];
  foods: Array<{
    order: number;
    food: MealFoodInput & { nutrients: MealFoodInput['nutrients'] };
  }>;
};

function toMeals(rows: StoredMeal[]): MealInput[] {
  return rows.map((meal) => ({
    slug: meal.slug,
    name: meal.name,
    timing: meal.timing,
    region: meal.region,
    rationale: meal.rationale,
    prepMinutes: meal.prepMinutes,
    budget: meal.budget,
    emphasis: meal.emphasis,
    foods: [...meal.foods]
      .sort((left, right) => left.order - right.order)
      .map((link) => ({
        slug: link.food.slug,
        name: link.food.name,
        region: link.food.region,
        servingSize: link.food.servingSize,
        preparation: link.food.preparation,
        allergens: link.food.allergens,
        diets: link.food.diets,
        nutrients: link.food.nutrients,
      })),
  }));
}

function builtinMeals(): StoredMeal[] {
  const foodBySlug = new Map(foods.map((food) => [food.slug, food]));
  return meals.map((meal) => ({
    slug: meal.slug,
    name: meal.name,
    timing: meal.timing,
    region: meal.region,
    rationale: meal.rationale,
    prepMinutes: meal.prepMinutes,
    budget: meal.budget,
    emphasis: meal.emphasis,
    foods: meal.foods.map((slug, order) => {
      const food = foodBySlug.get(slug);
      if (!food) {
        throw new Error(`Unknown food slug: ${slug}`);
      }
      return { order, food };
    }),
  }));
}

export const nutritionRouter = Router();

nutritionRouter.get(
  '/recommendations',
  asyncHandler(async (req, res) => {
    const query = nutritionQuerySchema.parse(req.query);
    let rows: StoredMeal[] = [];
    try {
      rows = (await prisma.meal.findMany({
        include: mealInclude,
        orderBy: { name: 'asc' },
      })) as StoredMeal[];
    } catch (error) {
      if (!isMissingCatalogueTable(error)) {
        throw error;
      }
    }
    res.json({
      data: recommendMeals(toMeals(rows.length > 0 ? rows : builtinMeals()), query),
    });
  }),
);
