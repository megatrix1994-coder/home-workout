import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MEAL_GUIDANCE } from './lib/nutrition.js';

const { findManyMeals, findUniqueSession } = vi.hoisted(() => ({
  findManyMeals: vi.fn(),
  findUniqueSession: vi.fn(),
}));

vi.mock('./db', () => ({
  prisma: {
    session: { findUnique: findUniqueSession, update: vi.fn(), deleteMany: vi.fn() },
    meal: { findMany: findManyMeals },
  },
}));

import { createApp } from './app.js';
import { sessionFor, TEST_COOKIE } from './test/session.js';

const app = createApp();
const api = request.agent(app).set('Cookie', TEST_COOKIE).set('Sec-Fetch-Site', 'same-origin');

beforeEach(() => {
  findUniqueSession.mockResolvedValue(sessionFor());
});

const bananaAndMilk = {
  slug: 'banana-and-milk',
  name: 'Banana and milk',
  timing: 'pre',
  region: 'local',
  rationale: 'A familiar option before training.',
  prepMinutes: 5,
  budget: 'low',
  emphasis: 'carbohydrate',
  foods: [
    {
      order: 0,
      food: {
        slug: 'banana',
        name: 'Banana',
        region: 'local',
        servingSize: '1 medium banana',
        preparation: 'Eat it ripe.',
        allergens: [],
        diets: ['vegetarian', 'vegan'],
        nutrients: [
          {
            nutrient: 'energy',
            amount: 89,
            unit: 'kcal',
            sourceName: 'USDA FoodData Central, Bananas, raw, FDC 173944, per 100 g',
          },
        ],
      },
    },
    {
      order: 1,
      food: {
        slug: 'uji',
        name: 'Uji',
        region: 'local',
        servingSize: '1 cup',
        preparation: 'Cook the porridge.',
        allergens: [],
        diets: ['vegetarian', 'vegan'],
        nutrients: [
          {
            nutrient: 'energy',
            amount: 999,
            unit: 'kcal',
            sourceName: '',
          },
        ],
      },
    },
  ],
};

describe('nutrition API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findManyMeals.mockResolvedValue([bananaAndMilk]);
  });

  it('publishes a nutrient number only with its source and always includes guidance', async () => {
    const response = await api.get('/api/v1/nutrition/recommendations');

    expect(response.status).toBe(200);
    expect(response.body.data.guidance).toBe(MEAL_GUIDANCE);
    expect(response.body.data.goal).toBeNull();
    expect(response.body.data.meals[0].foods[0].nutrients).toEqual([
      {
        nutrient: 'energy',
        amount: 89,
        unit: 'kcal',
        sourceName: 'USDA FoodData Central, Bananas, raw, FDC 173944, per 100 g',
      },
    ]);
    expect(response.body.data.meals[0].foods[1].nutrients).toEqual([]);
    expect(JSON.stringify(response.body)).not.toContain('999');
  });

  it('accepts a cut intent', async () => {
    const response = await api.get('/api/v1/nutrition/recommendations?intent=cut');

    expect(response.status).toBe(200);
    expect(response.body.data.intent).toBe('cut');
    expect(response.body.data.guidance).toBe(MEAL_GUIDANCE);
    expect(response.body.data.suggestions).toEqual([
      {
        slug: 'banana-and-milk',
        name: 'Banana and milk',
        timing: 'pre',
        emphasis: 'carbohydrate',
        reason:
          'A cut lists protein-leaning meals first. The order is general guidance.',
      },
    ]);
  });

  it('rejects an unknown intent', async () => {
    const response = await api.get(
      '/api/v1/nutrition/recommendations?intent=deficit',
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an unknown allergy', async () => {
    const response = await api.get(
      '/api/v1/nutrition/recommendations?exclude=shellfish',
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
