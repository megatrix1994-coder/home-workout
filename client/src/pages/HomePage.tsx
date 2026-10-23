import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PoseSlideshow } from '../components/PoseSlideshow';
import { PageIntro } from '../components/Status';
import { readWorkoutLinks } from '../storage';
import type { BodyIntent, MealSuggestionPick } from '../types';

function SuggestedMeals({
  intent,
  suggestions,
}: {
  intent: BodyIntent;
  suggestions: MealSuggestionPick[];
}) {
  if (suggestions.length === 0) return null;
  return (
    <div className="mt-4">
      <h4 className="font-semibold">Suggestions</h4>
      <ul className="mt-2 space-y-2">
        {suggestions.map((suggestion) => (
          <li key={suggestion.slug}>
            <Link to={`/nutrition?intent=${intent}`} className="font-semibold">
              {suggestion.name}
            </Link>
            <p className="text-sm leading-6">{suggestion.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HomePage() {
  const [links, setLinks] = useState<{ draftId: string | null; startedId: string | null }>({
    draftId: null,
    startedId: null,
  });
  const [cutSuggestions, setCutSuggestions] = useState<MealSuggestionPick[]>([]);
  const [bulkSuggestions, setBulkSuggestions] = useState<MealSuggestionPick[]>([]);

  useEffect(() => {
    setLinks(readWorkoutLinks());
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load(intent: BodyIntent) {
      const response = await fetch(
        `/api/v1/nutrition/recommendations?intent=${intent}`,
        { signal: controller.signal },
      );
      if (!response.ok) return [];
      const body = (await response.json().catch(() => null)) as {
        data?: { suggestions?: MealSuggestionPick[] };
      } | null;
      return body?.data?.suggestions ?? [];
    }

    load('cut')
      .then((suggestions) => {
        if (active) setCutSuggestions(suggestions);
        return load('bulk');
      })
      .then((suggestions) => {
        if (active) setBulkSuggestions(suggestions);
      })
      .catch((error: unknown) => {
        if (
          !active ||
          (error instanceof DOMException && error.name === 'AbortError')
        ) {
          return;
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return (
    <>
      <PoseSlideshow />
      <PageIntro
        eyebrow="Home Workout"
        title="Train a muscle. Know the movement."
      >
        <p>
          Choose a muscle and the equipment you have. The builder picks
          exercises, sets, repetitions, and rest, and tells you why.
        </p>
      </PageIntro>
      <div className="flex flex-wrap gap-3">
        <Link
          to="/workouts/new"
          className="rounded-full bg-accent px-5 py-2.5 font-semibold text-on-accent"
        >
          Build a workout
        </Link>
        {links.startedId ? (
          <Link
            to={`/workouts/${links.startedId}`}
            className="rounded-full border border-line bg-card px-5 py-2.5 font-semibold"
          >
            Continue workout
          </Link>
        ) : null}
        {links.draftId && links.draftId !== links.startedId ? (
          <Link
            to={`/workouts/${links.draftId}`}
            className="rounded-full border border-line bg-card px-5 py-2.5 font-semibold"
          >
            Open saved draft
          </Link>
        ) : null}
        <Link
          to="/muscles"
          className="rounded-full border border-line bg-card px-5 py-2.5 font-semibold"
        >
          Browse muscles
        </Link>
        <Link
          to="/exercises"
          className="rounded-full border border-line bg-card px-5 py-2.5 font-semibold"
        >
          All exercises
        </Link>
        <Link
          to="/nutrition"
          className="rounded-full border border-line bg-card px-5 py-2.5 font-semibold"
        >
          Meal ideas
        </Link>
      </div>
      <section className="mt-10">
        <h2 className="font-display text-3xl font-semibold">Cut or bulk</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-line bg-card p-5">
            <h3 className="font-display text-2xl font-semibold">Cut</h3>
            <p className="mt-2 leading-7">
              Use the strength goal and a standard session. Your experience sets
              the difficulty. Protein-leaning meals are listed first.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/workouts/new?intent=cut" className="font-semibold">
                Build a cut workout
              </Link>
              <Link to="/nutrition?intent=cut" className="font-semibold">
                Cut meal ideas
              </Link>
            </div>
            <SuggestedMeals intent="cut" suggestions={cutSuggestions} />
          </article>
          <article className="rounded-2xl border border-line bg-card p-5">
            <h3 className="font-display text-2xl font-semibold">Bulk</h3>
            <p className="mt-2 leading-7">
              Use the muscle-growth goal and a full session. Your experience sets
              the difficulty. Carbohydrate-leaning meals come first before training,
              and protein-leaning meals come first after.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/workouts/new?intent=bulk" className="font-semibold">
                Build a bulk workout
              </Link>
              <Link to="/nutrition?intent=bulk" className="font-semibold">
                Bulk meal ideas
              </Link>
            </div>
            <SuggestedMeals intent="bulk" suggestions={bulkSuggestions} />
          </article>
        </div>
      </section>
      <ul className="mt-10 grid gap-4 sm:grid-cols-3">
        <li className="rounded-2xl border border-line bg-card p-5">
          <h2 className="font-display text-2xl font-semibold">Free weights</h2>
          <p className="mt-2 text-muted">
            Dumbbells and barbells for presses, rows, hinges, and curls.
          </p>
        </li>
        <li className="rounded-2xl border border-line bg-card p-5">
          <h2 className="font-display text-2xl font-semibold">Machines</h2>
          <p className="mt-2 text-muted">
            Guided presses, pulls, and curls when a machine is available.
          </p>
        </li>
        <li className="rounded-2xl border border-line bg-card p-5">
          <h2 className="font-display text-2xl font-semibold">Bodyweight</h2>
          <p className="mt-2 text-muted">
            Squats, push-ups, planks, and bridges that need no extra kit.
          </p>
        </li>
      </ul>
    </>
  );
}
