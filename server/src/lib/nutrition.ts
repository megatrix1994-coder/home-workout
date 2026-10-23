import type { BodyIntent } from './body-composition.js';
import type { TrainingGoal } from './recommend.js';

export const allergens = [
  'milk',
  'egg',
  'peanut',
  'fish',
  'soy',
  'gluten',
  'tree_nut',
] as const;
export type Allergen = (typeof allergens)[number];

export const dietPatterns = ['vegetarian', 'vegan'] as const;
export type DietPattern = (typeof dietPatterns)[number];

export const foodRegions = ['local', 'international'] as const;
export type FoodRegion = (typeof foodRegions)[number];

export const budgetBands = ['low', 'moderate'] as const;
export type BudgetBand = (typeof budgetBands)[number];

export const mealTimings = ['pre', 'post'] as const;
export type MealTiming = (typeof mealTimings)[number];

export const mealEmphases = ['carbohydrate', 'protein', 'mixed'] as const;
export type MealEmphasis = (typeof mealEmphases)[number];

export const nutrientNames = ['energy', 'protein', 'carbohydrate', 'fat'] as const;
export type NutrientName = (typeof nutrientNames)[number];

export const MEAL_GUIDANCE =
  'These meals are general guidance. They are not a medical diet or a guarantee of performance.';

const CUT_SUGGESTION_REASON =
  'A cut lists protein-leaning meals first. The order is general guidance.';
const BULK_PRE_SUGGESTION_REASON =
  'A bulk lists carbohydrate-leaning meals first before training. The order is general guidance.';
const BULK_POST_SUGGESTION_REASON =
  'A bulk lists protein-leaning meals first after training. The order is general guidance.';

export type NutrientRow = {
  nutrient: NutrientName;
  amount: number;
  unit: string;
  sourceName: string;
};

export type MealFoodInput = {
  slug: string;
  name: string;
  region: FoodRegion;
  servingSize: string;
  preparation: string;
  allergens: Allergen[];
  diets: DietPattern[];
  nutrients: NutrientRow[];
};

export type MealInput = {
  slug: string;
  name: string;
  timing: MealTiming;
  region: FoodRegion;
  rationale: string;
  prepMinutes: number;
  budget: BudgetBand;
  emphasis: MealEmphasis;
  foods: MealFoodInput[];
};

export type NutritionQuery = {
  timing?: MealTiming;
  region?: FoodRegion;
  diet?: DietPattern;
  exclude: Allergen[];
  budget?: BudgetBand;
  maxPrepMinutes?: number;
  goal?: TrainingGoal;
  intent?: BodyIntent;
};

export function publishNutrients(rows: NutrientRow[]) {
  return rows
    .filter((row) => row.sourceName.trim().length > 0)
    .map((row) => ({
      nutrient: row.nutrient,
      amount: row.amount,
      unit: row.unit,
      sourceName: row.sourceName,
    }));
}

function emphasisRank(meal: MealInput, query: NutritionQuery) {
  if (query.intent === 'cut') {
    if (meal.emphasis === 'protein') return 0;
    if (meal.emphasis === 'mixed') return 1;
    return 2;
  }
  if (query.intent === 'bulk') {
    if (meal.timing === 'pre') {
      if (meal.emphasis === 'carbohydrate') return 0;
      if (meal.emphasis === 'mixed') return 1;
      return 2;
    }
    if (meal.emphasis === 'protein') return 0;
    if (meal.emphasis === 'mixed') return 1;
    return 2;
  }
  const emphasis = meal.emphasis;
  const preferCarbohydrate = query.goal === 'endurance' && query.timing !== 'post';
  const preferProtein =
    (query.goal === 'strength' || query.goal === 'hypertrophy') &&
    query.timing !== 'pre';
  if (preferCarbohydrate) {
    if (emphasis === 'carbohydrate') return 0;
    if (emphasis === 'mixed') return 1;
    return 2;
  }
  if (preferProtein) {
    if (emphasis === 'protein') return 0;
    if (emphasis === 'mixed') return 1;
    return 2;
  }
  return 0;
}

function matches(meal: MealInput, query: NutritionQuery) {
  if (query.timing && meal.timing !== query.timing) return false;
  if (query.region && meal.region !== query.region) return false;
  if (query.diet) {
    const diet = query.diet;
    if (!meal.foods.every((food) => food.diets.includes(diet))) {
      return false;
    }
  }
  if (
    query.exclude.length > 0 &&
    meal.foods.some((food) =>
      food.allergens.some((allergen) => query.exclude.includes(allergen)),
    )
  ) {
    return false;
  }
  if (query.budget === 'low' && meal.budget !== 'low') return false;
  if (
    query.maxPrepMinutes !== undefined &&
    meal.prepMinutes > query.maxPrepMinutes
  ) {
    return false;
  }
  return true;
}

function publishFood(food: MealFoodInput) {
  return {
    slug: food.slug,
    name: food.name,
    region: food.region,
    servingSize: food.servingSize,
    preparation: food.preparation,
    nutrients: publishNutrients(food.nutrients),
  };
}

type PublishedMeal = {
  slug: string;
  name: string;
  timing: MealTiming;
  emphasis: MealEmphasis;
};

export type MealSuggestionPick = {
  slug: string;
  name: string;
  timing: MealTiming;
  emphasis: MealEmphasis;
  reason: string;
};

function pickMeal(
  meals: PublishedMeal[],
  emphasis: MealEmphasis,
  reason: string,
): MealSuggestionPick | null {
  const meal = meals.find((item) => item.emphasis === emphasis) ?? meals[0];
  if (!meal) return null;
  return {
    slug: meal.slug,
    name: meal.name,
    timing: meal.timing,
    emphasis: meal.emphasis,
    reason,
  };
}

export function suggestMeals(
  meals: PublishedMeal[],
  intent?: BodyIntent,
): MealSuggestionPick[] {
  if (intent === 'cut') {
    const picked = pickMeal(meals, 'protein', CUT_SUGGESTION_REASON);
    return picked ? [picked] : [];
  }
  if (intent === 'bulk') {
    const picks = [
      pickMeal(
        meals.filter((meal) => meal.timing === 'pre'),
        'carbohydrate',
        BULK_PRE_SUGGESTION_REASON,
      ),
      pickMeal(
        meals.filter((meal) => meal.timing === 'post'),
        'protein',
        BULK_POST_SUGGESTION_REASON,
      ),
    ];
    return picks.filter((pick): pick is MealSuggestionPick => pick !== null);
  }
  return [];
}

export function recommendMeals(meals: MealInput[], query: NutritionQuery) {
  const ranked = meals
    .map((meal, index) => ({ meal, index }))
    .filter(({ meal }) => matches(meal, query))
    .sort((left, right) => {
      const rank = emphasisRank(left.meal, query) - emphasisRank(right.meal, query);
      return rank || left.index - right.index;
    });

  const published = ranked.map(({ meal }) => ({
    slug: meal.slug,
    name: meal.name,
    timing: meal.timing,
    region: meal.region,
    rationale: meal.rationale,
    prepMinutes: meal.prepMinutes,
    budget: meal.budget,
    emphasis: meal.emphasis,
    foods: meal.foods.map(publishFood),
  }));

  return {
    guidance: MEAL_GUIDANCE,
    goal: query.goal ?? null,
    intent: query.intent ?? null,
    suggestions: suggestMeals(published, query.intent),
    meals: published,
  };
}
