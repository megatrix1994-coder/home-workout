import { useId, type InputHTMLAttributes } from 'react';
import { inputClass } from './form-styles';

export function TextField({
  label,
  hint,
  ...input
}: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className="text-sm font-semibold">
      <label htmlFor={id} className="block">
        {label}
      </label>
      <input
        {...input}
        id={id}
        aria-describedby={hint ? hintId : undefined}
        className={inputClass}
      />
      {hint ? (
        <p id={hintId} className="mt-1 font-normal text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm font-semibold text-danger">
      {message}
    </p>
  );
}
