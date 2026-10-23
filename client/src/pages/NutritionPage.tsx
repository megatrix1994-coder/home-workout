import { useSearchParams } from 'react-router-dom';
import { useApi } from '../api';
import { PageNav } from '../components/PageNav';
import { EmptyState, ErrorState, LoadingState, PageIntro } from '../components/Status';
import type {
  BodyIntent,
  BudgetBand,
  FoodRegion,
  ItemResponse,
  MealFood,
  MealTiming,
  NutritionRecommendation,
  TrainingGoal,
} from '../types';

const timings: { value: '' | MealTiming; label: string }[] = [
  { value: '', label: 'Before and after' },
  { value: 'pre', label: 'Before training' },
  { value: 'post', label: 'After training' },
];

const regions: { value: '' | FoodRegion; label: string }[] = [
  { value: '', label: 'Local and international' },
  { value: 'local', label: 'Kenyan and East African' },
  { value: 'international', label: 'International' },
];

const diets: { value: '' | 'vegetarian' | 'vegan'; label: string }[] = [
  { value: '', label: 'Any diet' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
];

const budgets: { value: '' | BudgetBand; label: string }[] = [
  { value: '', label: 'Any budget' },
  { value: 'low', label: 'Low cost' },
  { value: 'moderate', label: 'Low or moderate cost' },
];

const prepLimits: { value: string; label: string }[] = [
  { value: '', label: 'Any prep time' },
  { value: '10', label: '10 minutes or less' },
  { value: '20', label: '20 minutes or less' },
  { value: '30', label: '30 minutes or less' },
  { value: '45', label: '45 minutes or less' },
];

const goals: { value: '' | TrainingGoal; label: string }[] = [
  { value: '', label: 'Any goal' },
  { value: 'strength', label: 'Strength' },
  { value: 'hypertrophy', label: 'Muscle growth' },
  { value: 'general_fitness', label: 'General fitness' },
  { value: 'endurance', label: 'Endurance' },
];

const intents: { value: '' | BodyIntent; label: string }[] = [
  { value: '', label: 'Either' },
  { value: 'cut', label: 'Cut' },
  { value: 'bulk', label: 'Bulk' },
];

const allergens: { value: string; label: string }[] = [
  { value: 'milk', label: 'Milk' },
  { value: 'egg', label: 'Egg' },
  { value: 'peanut', label: 'Peanut' },
  { value: 'fish', label: 'Fish' },
  { value: 'soy', label: 'Soy' },
  { value: 'gluten', label: 'Gluten' },
  { value: 'tree_nut', label: 'Tree nut' },
];

const selectClass =
  'mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 font-normal';

function sourcedNutrients(food: MealFood) {
  return food.nutrients.filter((nutrient) => nutrient.sourceName.trim().length > 0);
}

function timingLabel(timing: MealTiming) {
  return timing === 'pre' ? 'Before training' : 'After training';
}

function regionLabel(region: FoodRegion) {
  return region === 'local' ? 'Kenyan and East African' : 'International';
}

function budgetLabel(budget: BudgetBand) {
  return budget === 'low' ? 'Low cost' : 'Moderate cost';
}

export function NutritionPage() {
  const [params, setParams] = useSearchParams();
  const timing = params.get('timing') ?? '';
  const region = params.get('region') ?? '';
  const diet = params.get('diet') ?? '';
  const budget = params.get('budget') ?? '';
  const maxPrepMinutes = params.get('maxPrepMinutes') ?? '';
  const goal = params.get('goal') ?? '';
  const intent = params.get('intent') ?? '';
  const excluded = (params.get('exclude') ?? '').split(',').filter(Boolean);

  const query = new URLSearchParams();
  if (timing) query.set('timing', timing);
  if (region) query.set('region', region);
  if (diet) query.set('diet', diet);
  if (budget) query.set('budget', budget);
  if (maxPrepMinutes) query.set('maxPrepMinutes', maxPrepMinutes);
  if (goal) query.set('goal', goal);
  if (intent === 'cut' || intent === 'bulk') query.set('intent', intent);
  if (excluded.length > 0) query.set('exclude', excluded.join(','));
  const queryString = query.toString();
  const path = `/api/v1/nutrition/recommendations${queryString ? `?${queryString}` : ''}`;
  const meals = useApi<ItemResponse<NutritionRecommendation>>(path);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setParams(next);
  }

  function toggleAllergen(allergen: string) {
    const nextValues = new Set(excluded);
    if (nextValues.has(allergen)) {
      nextValues.delete(allergen);
    } else {
      nextValues.add(allergen);
    }
    updateParam('exclude', [...nextValues].sort().join(','));
  }

  const recommendation = meals.status === 'ready' ? meals.data.data : null;

  return (
    <>
      <PageNav
        fallbackTo="/"
        links={[
          { to: '/workouts/new', label: 'Build a workout' },
          { to: '/muscles', label: 'Muscle groups' },
        ]}
      />
      <PageIntro eyebrow="Nutrition" title="Meals around training">
        <p>
          Pre- and post-workout ideas from ordinary foods. Choose a timing, a
          region, and anything you need to leave out.
        </p>
      </PageIntro>
      <form className="mb-8 grid gap-3 rounded-2xl border border-line bg-card p-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="block text-sm font-semibold">
          Timing
          <select
            value={timing}
            onChange={(event) => updateParam('timing', event.target.value)}
            className={selectClass}
          >
            {timings.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Foods
          <select
            value={region}
            onChange={(event) => updateParam('region', event.target.value)}
            className={selectClass}
          >
            {regions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Diet
          <select
            value={diet}
            onChange={(event) => updateParam('diet', event.target.value)}
            className={selectClass}
          >
            {diets.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Budget
          <select
            value={budget}
            onChange={(event) => updateParam('budget', event.target.value)}
            className={selectClass}
          >
            {budgets.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Prep time
          <select
            value={maxPrepMinutes}
            onChange={(event) => updateParam('maxPrepMinutes', event.target.value)}
            className={selectClass}
          >
            {prepLimits.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Aim
          <select
            value={intent === 'cut' || intent === 'bulk' ? intent : ''}
            onChange={(event) => updateParam('intent', event.target.value)}
            className={selectClass}
          >
            {intents.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Goal
          <select
            value={goal}
            onChange={(event) => updateParam('goal', event.target.value)}
            className={selectClass}
          >
            {goals.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="md:col-span-2 xl:col-span-3">
          <legend className="text-sm font-semibold">Leave out</legend>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            {allergens.map((allergen) => (
              <label key={allergen.value} className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={excluded.includes(allergen.value)}
                  onChange={() => toggleAllergen(allergen.value)}
                />
                {allergen.label}
              </label>
            ))}
          </div>
        </fieldset>
      </form>
      {meals.status === 'loading' ? <LoadingState label="Loading meals…" /> : null}
      {meals.status === 'error' ? (
        <ErrorState
          title="Could not load meals"
          message={meals.message}
          onRetry={meals.retry}
        />
      ) : null}
      {recommendation ? (
        <>
          {(recommendation.suggestions ?? []).length === 0 && intent === 'cut' ? (
            <p className="mb-4 max-w-3xl">
              Cut lists protein-leaning meals first. The order is general guidance.
            </p>
          ) : null}
          {(recommendation.suggestions ?? []).length === 0 && intent === 'bulk' ? (
            <p className="mb-4 max-w-3xl">
              Bulk lists carbohydrate-leaning meals first before training and
              protein-leaning meals first after. The order is general guidance.
            </p>
          ) : null}
          {(recommendation.suggestions ?? []).map((suggestion) => (
            <p key={suggestion.slug} className="mb-4 max-w-3xl">
              {suggestion.reason}
            </p>
          ))}
          <p className="mb-6 max-w-3xl text-lg">{recommendation.guidance}</p>
          {recommendation.meals.length === 0 ? (
            <EmptyState
              title="No meals match"
              body="Try a wider timing, region, diet, or allergy filter."
            />
          ) : (
            <ul className="grid gap-4">
              {recommendation.meals.map((meal) => {
                const suggested = (recommendation.suggestions ?? []).some(
                  (suggestion) => suggestion.slug === meal.slug,
                );
                return (
                <li key={meal.slug} className="rounded-2xl border border-line bg-card p-5">
                  {suggested ? <p className="text-sm font-semibold">Suggested</p> : null}
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
                    {timingLabel(meal.timing)} · {regionLabel(meal.region)}
                  </p>
                  <h2 className="mt-2 font-display text-3xl font-semibold">{meal.name}</h2>
                  <p className="mt-2 text-sm text-muted">
                    About {meal.prepMinutes} minutes · {budgetLabel(meal.budget)}
                  </p>
                  <p className="mt-3 leading-7">{meal.rationale}</p>
                  <ul className="mt-4 grid gap-4">
                    {meal.foods.map((item) => {
                      const nutrients = sourcedNutrients(item);
                      return (
                        <li key={item.slug}>
                          <h3 className="font-semibold">{item.name}</h3>
                          <p className="text-sm text-muted">Serving: {item.servingSize}</p>
                          <p className="text-sm text-muted">{item.preparation}</p>
                          {nutrients.length === 0 ? (
                            <p className="mt-1 text-sm">
                              No sourced nutrient estimate for this food.
                            </p>
                          ) : (
                            <ul className="mt-1 list-disc pl-5 text-sm">
                              {nutrients.map((nutrient) => (
                                <li key={nutrient.nutrient}>
                                  {nutrient.amount} {nutrient.unit}, approximate,{' '}
                                  {nutrient.sourceName}
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
                );
              })}
            </ul>
          )}
        </>
      ) : null}
    </>
  );
}
