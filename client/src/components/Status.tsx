import type { CSSProperties, ReactNode } from 'react';

export function LoadingState({ label }: { label: string }) {
  return (
    <p role="status" className="text-muted">
      {label}
    </p>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-10">
      <h2 className="font-display text-3xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-xl text-muted">{body}</p>
    </div>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="rounded-2xl border border-danger/30 bg-card px-6 py-10">
      <h2 className="font-display text-3xl font-semibold text-danger">{title}</h2>
      <p className="mt-2 max-w-xl text-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent"
      >
        Try again
      </button>
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  children,
  className,
  style,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <header className={`mb-8 max-w-3xl ${className ?? ''}`} style={style}>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">{eyebrow}</p>
      <h1 className="mt-2 font-display text-5xl font-semibold leading-none">{title}</h1>
      {children ? <div className="mt-4 text-lg text-muted">{children}</div> : null}
    </header>
  );
}
