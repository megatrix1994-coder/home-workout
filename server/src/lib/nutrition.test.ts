import { describe, expect, it } from 'vitest';
import { foods, meals } from '../nutrition.js';
import {
  MEAL_GUIDANCE,
  publishNutrients,
  recommendMeals,
  type MealFoodInput,
  type MealInput,
  type NutritionQuery,
} from './nutrition.js';

const baseQuery: NutritionQuery = { exclude: [] };

function food(
  overrides: Partial<MealFoodInput> & Pick<MealFoodInput, 'slug'>,
): MealFoodInput {
  return {
    name: overrides.slug,
    region: 'local',
    servingSize: '1 portion',
    preparation: 'Cook it.',
    allergens: [],
    diets: ['vegetarian', 'vegan'],
    nutrients: [],
    ...overrides,
  };
}

function meal(overrides: Partial<MealInput> & Pick<MealInput, 'slug'>): MealInput {
  return {
    name: overrides.slug,
    timing: 'pre',
    region: 'local',
    rationale: 'A familiar plate.',
    prepMinutes: 10,
    budget: 'low',
    emphasis: 'mixed',
    foods: [food({ slug: 'banana' })],
    ...overrides,
  };
}

describe('publishNutrients', () => {
  it('keeps a number only when the source is named', () => {
    const published = publishNutrients([
      {
        nutrient: 'protein',
        amount: 12,
        unit: 'g',
        sourceName: 'USDA FoodData Central, example, per 100 g',
      },
      { nutrient: 'energy', amount: 400, unit: 'kcal', sourceName: '   ' },
      { nutrient: 'fat', amount: 9, unit: 'g', sourceName: '' },
    ]);

    expect(published).toEqual([
      {
        nutrient: 'protein',
        amount: 12,
        unit: 'g',
        sourceName: 'USDA FoodData Central, example, per 100 g',
      },
    ]);
  });
});

describe('recommendMeals', () => {
  const milk = food({
    slug: 'milk',
    allergens: ['milk'],
    diets: ['vegetarian'],
    nutrients: [
      { nutrient: 'energy', amount: 50, unit: 'kcal', sourceName: '' },
      {
        nutrient: 'protein',
        amount: 3.3,
        unit: 'g',
        sourceName: 'USDA FoodData Central, milk, per 100 g',
      },
    ],
  });
  const banana = food({ slug: 'banana' });
  const chicken = food({ slug: 'chicken', diets: [], region: 'international' });

  const catalogue = [
    meal({
      slug: 'banana-milk',
      foods: [banana, milk],
      emphasis: 'carbohydrate',
      prepMinutes: 5,
    }),
    meal({
      slug: 'oats',
      region: 'international',
      emphasis: 'carbohydrate',
      prepMinutes: 10,
      foods: [food({ slug: 'oats', region: 'international' })],
    }),
    meal({
      slug: 'yogurt',
      timing: 'post',
      region: 'international',
      budget: 'moderate',
      emphasis: 'protein',
      prepMinutes: 40,
      foods: [food({ slug: 'yogurt', allergens: ['milk'], diets: ['vegetarian'] })],
    }),
    meal({
      slug: 'rice-chicken',
      timing: 'post',
      region: 'international',
      emphasis: 'mixed',
      prepMinutes: 30,
      foods: [food({ slug: 'rice', region: 'international' }), chicken],
    }),
  ];

  it('returns the guidance sentence and drops unsourced numbers', () => {
    const result = recommendMeals(catalogue, baseQuery);
    const bananaMilk = result.meals.find((item) => item.slug === 'banana-milk');

    expect(result.guidance).toBe(MEAL_GUIDANCE);
    expect(result.goal).toBeNull();
    expect(result.intent).toBeNull();
    expect(result.suggestions).toEqual([]);
    expect(bananaMilk?.foods[1].nutrients).toEqual([
      {
        nutrient: 'protein',
        amount: 3.3,
        unit: 'g',
        sourceName: 'USDA FoodData Central, milk, per 100 g',
      },
    ]);
  });

  it('filters region, diet, allergies, budget, and prep time', () => {
    expect(
      recommendMeals(catalogue, { ...baseQuery, region: 'local' }).meals.map(
        (item) => item.slug,
      ),
    ).toEqual(['banana-milk']);

    expect(
      recommendMeals(catalogue, { ...baseQuery, diet: 'vegan' }).meals.map(
        (item) => item.slug,
      ),
    ).toEqual(['oats']);

    expect(
      recommendMeals(catalogue, { ...baseQuery, diet: 'vegetarian' }).meals.map(
        (item) => item.slug,
      ),
    ).toEqual(['banana-milk', 'oats', 'yogurt']);

    expect(
      recommendMeals(catalogue, { ...baseQuery, exclude: ['milk'] }).meals.map(
        (item) => item.slug,
      ),
    ).toEqual(['oats', 'rice-chicken']);

    expect(
      recommendMeals(catalogue, { ...baseQuery, budget: 'low' }).meals.map(
        (item) => item.slug,
      ),
    ).toEqual(['banana-milk', 'oats', 'rice-chicken']);

    expect(
      recommendMeals(catalogue, { ...baseQuery, budget: 'moderate' }).meals.map(
        (item) => item.slug,
      ),
    ).toEqual(['banana-milk', 'oats', 'yogurt', 'rice-chicken']);

    expect(
      recommendMeals(catalogue, { ...baseQuery, maxPrepMinutes: 10 }).meals.map(
        (item) => item.slug,
      ),
    ).toEqual(['banana-milk', 'oats']);
  });

  it('sorts carbohydrate meals first before endurance and protein meals first after strength', () => {
    const ordered = [
      meal({ slug: 'mixed', timing: 'post', emphasis: 'mixed' }),
      meal({ slug: 'carb', timing: 'post', emphasis: 'carbohydrate' }),
      meal({ slug: 'protein', timing: 'post', emphasis: 'protein' }),
    ];

    expect(
      recommendMeals(ordered, {
        ...baseQuery,
        timing: 'post',
        goal: 'hypertrophy',
      }).meals.map((item) => item.slug),
    ).toEqual(['protein', 'mixed', 'carb']);

    expect(
      recommendMeals(ordered, {
        ...baseQuery,
        timing: 'pre',
        goal: 'endurance',
      }).meals.map((item) => item.slug),
    ).toEqual([]);

    const before = ordered.map((item) => ({ ...item, timing: 'pre' as const }));
    expect(
      recommendMeals(before, {
        ...baseQuery,
        timing: 'pre',
        goal: 'endurance',
      }).meals.map((item) => item.slug),
    ).toEqual(['carb', 'mixed', 'protein']);

    expect(
      recommendMeals(ordered, {
        ...baseQuery,
        timing: 'post',
        goal: 'endurance',
      }).meals.map((item) => item.slug),
    ).toEqual(['mixed', 'carb', 'protein']);
  });

  it('lets a cut or bulk intent decide the order', () => {
    const ordered = [
      meal({ slug: 'mixed', timing: 'pre', emphasis: 'mixed' }),
      meal({ slug: 'carb', timing: 'pre', emphasis: 'carbohydrate' }),
      meal({ slug: 'protein', timing: 'post', emphasis: 'protein' }),
    ];

    expect(
      recommendMeals(ordered, { ...baseQuery, intent: 'cut', goal: 'endurance' }).meals.map(
        (item) => item.slug,
      ),
    ).toEqual(['protein', 'mixed', 'carb']);

    expect(
      recommendMeals(ordered, { ...baseQuery, intent: 'bulk', timing: 'pre' }).meals.map(
        (item) => item.slug,
      ),
    ).toEqual(['carb', 'mixed']);

    expect(
      recommendMeals(ordered, { ...baseQuery, intent: 'bulk', timing: 'post' }).meals.map(
        (item) => item.slug,
      ),
    ).toEqual(['protein']);
  });

  it('suggests a protein meal for a cut and timed meals for a bulk', () => {
    const ordered = [
      meal({ slug: 'mixed', timing: 'pre', emphasis: 'mixed' }),
      meal({ slug: 'carb', timing: 'pre', emphasis: 'carbohydrate' }),
      meal({ slug: 'protein', timing: 'post', emphasis: 'protein' }),
    ];

    expect(
      recommendMeals(ordered, { ...baseQuery, intent: 'cut' }).suggestions,
    ).toEqual([
      {
        slug: 'protein',
        name: 'protein',
        timing: 'post',
        emphasis: 'protein',
        reason:
          'A cut lists protein-leaning meals first. The order is general guidance.',
      },
    ]);

    expect(
      recommendMeals(ordered, { ...baseQuery, intent: 'bulk' }).suggestions,
    ).toEqual([
      {
        slug: 'carb',
        name: 'carb',
        timing: 'pre',
        emphasis: 'carbohydrate',
        reason:
          'A bulk lists carbohydrate-leaning meals first before training. The order is general guidance.',
      },
      {
        slug: 'protein',
        name: 'protein',
        timing: 'post',
        emphasis: 'protein',
        reason:
          'A bulk lists protein-leaning meals first after training. The order is general guidance.',
      },
    ]);

    expect(
      recommendMeals(
        [
          meal({ slug: 'mixed-pre', timing: 'pre', emphasis: 'mixed' }),
          meal({ slug: 'mixed-post', timing: 'post', emphasis: 'mixed' }),
        ],
        { ...baseQuery, intent: 'bulk' },
      ).suggestions.map((item) => item.slug),
    ).toEqual(['mixed-pre', 'mixed-post']);

    expect(
      recommendMeals(ordered, { ...baseQuery, intent: 'bulk', timing: 'pre' }).suggestions.map(
        (item) => item.slug,
      ),
    ).toEqual(['carb']);

    expect(
      recommendMeals(
        [
          meal({
            slug: 'banana-milk',
            emphasis: 'carbohydrate',
            foods: [food({ slug: 'milk', allergens: ['milk'] })],
          }),
          meal({ slug: 'eggs', timing: 'post', emphasis: 'protein' }),
        ],
        { ...baseQuery, intent: 'cut', exclude: ['milk'] },
      ).suggestions[0]?.slug,
    ).toBe('eggs');

    expect(
      recommendMeals(catalogue, {
        ...baseQuery,
        intent: 'cut',
        region: 'local',
        diet: 'vegan',
      }).suggestions,
    ).toEqual([]);
  });
});

describe('nutrition catalogue', () => {
  it('stores a nutrient number only with a named source', () => {
    expect(foods.some((item) => item.nutrients.length > 0)).toBe(true);
    expect(foods.some((item) => item.nutrients.length === 0)).toBe(true);
    for (const item of foods) {
      expect(publishNutrients(item.nutrients)).toEqual(item.nutrients);
      for (const row of item.nutrients) {
        expect(row.sourceName).toContain('USDA FoodData Central');
      }
    }
  });

  it('covers local and international meals before and after training', () => {
    const slugs = new Set(foods.map((item) => item.slug));
    expect(meals.some((item) => item.region === 'local' && item.timing === 'pre')).toBe(
      true,
    );
    expect(meals.some((item) => item.region === 'local' && item.timing === 'post')).toBe(
      true,
    );
    expect(
      meals.some((item) => item.region === 'international' && item.timing === 'pre'),
    ).toBe(true);
    expect(
      meals.some((item) => item.region === 'international' && item.timing === 'post'),
    ).toBe(true);
    for (const item of meals) {
      expect(item.foods.length).toBeGreaterThan(0);
      for (const slug of item.foods) {
        expect(slugs.has(slug)).toBe(true);
      }
    }
  });
});
