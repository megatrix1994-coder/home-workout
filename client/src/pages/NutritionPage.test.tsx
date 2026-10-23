import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NutritionPage } from './NutritionPage';

const guidance =
  'These meals are general guidance. They are not a medical diet or a guarantee of performance.';

const meal = {
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
      slug: 'banana',
      name: 'Banana',
      region: 'local',
      servingSize: '1 medium banana',
      preparation: 'Eat it ripe.',
      nutrients: [
        {
          nutrient: 'energy',
          amount: 89,
          unit: 'kcal',
          sourceName: 'USDA FoodData Central, Bananas, raw, FDC 173944, per 100 g',
        },
      ],
    },
    {
      slug: 'uji',
      name: 'Uji',
      region: 'local',
      servingSize: '1 cup',
      preparation: 'Cook the porridge.',
      nutrients: [],
    },
    {
      slug: 'unsourced',
      name: 'Unsourced food',
      region: 'local',
      servingSize: '1 bowl',
      preparation: 'Cook it.',
      nutrients: [{ nutrient: 'energy', amount: 999, unit: 'kcal', sourceName: '' }],
    },
  ],
};

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

describe('NutritionPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows guidance, a sourced number, and no unsourced number', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('exclude=milk')) {
        return jsonResponse({
          data: { guidance, goal: null, meals: [] },
        });
      }
      return jsonResponse({
        data: { guidance, goal: null, meals: [meal] },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter initialEntries={['/nutrition']}>
        <Routes>
          <Route path="/nutrition" element={<NutritionPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(guidance)).toBeInTheDocument();
    expect(
      screen.getByText(
        '89 kcal, approximate, USDA FoodData Central, Bananas, raw, FDC 173944, per 100 g',
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText('No sourced nutrient estimate for this food.')).toHaveLength(
      2,
    );
    expect(screen.queryByText(/999/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Milk' }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([input]) => String(input).includes('exclude=milk')),
      ).toBe(true);
    });
    expect(await screen.findByText('No meals match')).toBeInTheDocument();
    expect(screen.getByText(guidance)).toBeInTheDocument();
  });

  it('sends a cut intent and keeps the guidance sentence', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse({
        data: { guidance, goal: null, intent: 'cut', meals: [meal] },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter initialEntries={['/nutrition']}>
        <Routes>
          <Route path="/nutrition" element={<NutritionPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.selectOptions(await screen.findByLabelText('Aim'), 'cut');

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([input]) => String(input).includes('intent=cut')),
      ).toBe(true);
    });
    expect(
      await screen.findByText(/Cut lists protein-leaning meals first/),
    ).toBeInTheDocument();
    expect(screen.getByText(guidance)).toBeInTheDocument();
  });

  it('marks the suggested cut meal and keeps the other meals', async () => {
    const reason =
      'A cut lists protein-leaning meals first. The order is general guidance.';
    const eggs = {
      ...meal,
      slug: 'eggs',
      name: 'Eggs with potatoes',
      timing: 'post',
      emphasis: 'protein',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          data: {
            guidance,
            goal: null,
            intent: 'cut',
            suggestions: [
              {
                slug: 'eggs',
                name: 'Eggs with potatoes',
                timing: 'post',
                emphasis: 'protein',
                reason,
              },
            ],
            meals: [eggs, meal],
          },
        }),
      ),
    );

    render(
      <MemoryRouter initialEntries={['/nutrition?intent=cut']}>
        <Routes>
          <Route path="/nutrition" element={<NutritionPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(reason)).toBeInTheDocument();
    expect(screen.getByText(guidance)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Eggs with potatoes' }).closest('li')).toHaveTextContent(
      'Suggested',
    );
    expect(
      screen.getByRole('heading', { name: 'Banana and milk' }).closest('li'),
    ).not.toHaveTextContent('Suggested');
  });
});
