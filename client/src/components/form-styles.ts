export const inputClass =
  'mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 font-normal';
export const primaryButtonClass =
  'rounded-full bg-accent px-5 py-2.5 font-semibold text-on-accent disabled:opacity-60';
export const secondaryButtonClass =
  'rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold disabled:opacity-60';
export const dangerButtonClass =
  'rounded-full border border-danger/40 bg-card px-4 py-2 text-sm font-semibold text-danger disabled:opacity-60';

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
