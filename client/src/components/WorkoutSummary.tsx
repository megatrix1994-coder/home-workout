import { labelEquipmentCategory, labelRegion } from '../labels';
import type { WarmupStretch, WorkoutSlot } from '../types';
import { replaceExercise, updatePrescription } from '../workout';

function loadLine(slot: {
  progression?: { suggestedWeightKg: number | null; earned: boolean | null };
}) {
  const weight = slot.progression?.suggestedWeightKg;
  if (weight == null) {
    return null;
  }
  const text = slot.progression?.earned
    ? `Use ${weight} kg this time.`
    : `Repeat ${weight} kg. The last session did not finish every set clean.`;
  return <p className="mt-3 text-sm font-semibold">{text}</p>;
}

export function WorkoutSummary({
  rationale,
  estimatedMinutes,
  rounds,
  warmups,
  slots,
  editable,
  highlighted = null,
  onChange,
}: {
  rationale: string;
  estimatedMinutes: number;
  rounds: number;
  warmups: WarmupStretch[];
  slots: Array<
    WorkoutSlot & {
      progression?: { suggestedWeightKg: number | null; earned: boolean | null };
    }
  >;
  editable: boolean;
  highlighted?: { kind: 'warmup' | 'exercise'; index: number } | null;
  onChange?: (slots: WorkoutSlot[]) => void;
}) {
  const roundLabel = rounds === 1 ? 'round' : 'rounds';
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="font-display text-2xl font-semibold">
          Why these exercises
        </h2>
        <p className="mt-3 leading-7">{rationale}</p>
        <p className="mt-3 text-sm font-semibold">
          About {estimatedMinutes} minutes. Repeat this list for {rounds}{' '}
          {roundLabel}.
        </p>
        <p className="mt-3 text-sm text-muted">
          Stop if a movement causes pain. This is general fitness education, not
          a medical assessment.
        </p>
      </section>
      {warmups.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-2xl font-semibold">Warm up</h2>
            <p className="mt-2 text-sm text-muted">
              These movements prepare the session. Move slowly and stay short of
              pain. This warm-up does not prevent injury.
            </p>
          </div>
          <ol className="space-y-4">
            {warmups.map((stretch, index) => {
              const active =
                highlighted?.kind === 'warmup' && highlighted.index === index;
              return (
                <li
                  key={stretch.id}
                  className={`rounded-2xl border bg-card p-5 ${active ? 'border-accent' : 'border-line'}`}
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
                    Warm-up {index + 1}
                    {active ? ' · Now' : ''}
                  </p>
                  <h3 className="mt-2 font-display text-3xl font-semibold">
                    {stretch.name}
                  </h3>
                  <p className="mt-3 text-sm font-semibold">
                    {stretch.durationSeconds} seconds
                  </p>
                  <p className="mt-2 whitespace-pre-line leading-7">
                    {stretch.instructions}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
      <ol className="space-y-4">
        {slots.map((slot, index) => {
          const highlightedExercise =
            highlighted?.kind === 'exercise' && highlighted.index === index;
          return (
            <li
              key={slot.exercise.id}
              className={`rounded-2xl border bg-card p-5 ${highlightedExercise ? 'border-accent' : 'border-line'}`}
            >
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
                Exercise {index + 1}
                {highlightedExercise ? ' · Now' : ''}
              </p>
              <h3 className="mt-2 font-display text-3xl font-semibold">
                {slot.exercise.name}
              </h3>
              {slot.exercise.region ? (
                <p className="mt-1 text-sm font-semibold">
                  {labelRegion(slot.exercise.region)}
                </p>
              ) : null}
              <p className="mt-3 text-sm">{slot.reason}</p>
              {loadLine(slot)}
              <p className="mt-3 text-sm">
                <span className="font-semibold">Equipment: </span>
                {slot.exercise.equipment
                  .map(
                    (item) =>
                      `${item.name} (${labelEquipmentCategory(item.category)})`,
                  )
                  .join(', ')}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="block text-sm font-semibold">
                  Sets
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={slot.sets}
                    disabled={!editable}
                    aria-label={`Sets for ${slot.exercise.name}`}
                    onChange={(event) =>
                      onChange?.(
                        updatePrescription(slots, index, {
                          sets: Number(event.target.value),
                        }),
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 font-normal disabled:opacity-70"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Reps
                  <input
                    value={slot.reps}
                    disabled={!editable}
                    aria-label={`Reps for ${slot.exercise.name}`}
                    onChange={(event) =>
                      onChange?.(
                        updatePrescription(slots, index, {
                          reps: event.target.value,
                        }),
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 font-normal disabled:opacity-70"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Rest (seconds)
                  <input
                    type="number"
                    min={15}
                    max={300}
                    value={slot.restSeconds}
                    disabled={!editable}
                    aria-label={`Rest for ${slot.exercise.name}`}
                    onChange={(event) =>
                      onChange?.(
                        updatePrescription(slots, index, {
                          restSeconds: Number(event.target.value),
                        }),
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 font-normal disabled:opacity-70"
                  />
                </label>
              </div>
              {editable && slot.alternatives.length === 0 ? (
                <p className="mt-4 text-sm text-muted">
                  No other exercise matches this equipment.
                </p>
              ) : null}
              {editable && slot.alternatives.length > 0 ? (
                <label className="mt-4 block text-sm font-semibold">
                  Replace
                  <select
                    value=""
                    aria-label={`Replace ${slot.exercise.name}`}
                    onChange={(event) => {
                      if (event.target.value) {
                        onChange?.(
                          replaceExercise(slots, index, event.target.value),
                        );
                      }
                    }}
                    className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 font-normal"
                  >
                    <option value="">Keep {slot.exercise.name}</option>
                    {slot.alternatives.map((alternative) => (
                      <option
                        key={alternative.exercise.id}
                        value={alternative.exercise.id}
                      >
                        {alternative.exercise.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <h4 className="mt-5 font-display text-2xl font-semibold">
                Instructions
              </h4>
              <p className="mt-2 whitespace-pre-line leading-7">
                {slot.exercise.instructions}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
