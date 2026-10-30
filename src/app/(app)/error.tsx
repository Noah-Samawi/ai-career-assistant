"use client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-8 text-center">
      <h2 className="text-lg font-semibold">Etwas ist schiefgelaufen / Something went wrong</h2>
      <p className="mt-2 text-sm text-muted">{error.message || "Unexpected error"}</p>
      {error.digest && <p className="mt-1 font-mono text-xs text-muted">Ref: {error.digest}</p>}
      <button onClick={reset} className="mt-5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink">
        Retry
      </button>
    </div>
  );
}
