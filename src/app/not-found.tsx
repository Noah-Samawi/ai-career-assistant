import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="font-mono text-sm text-muted">404</p>
        <h1 className="mt-2 text-xl font-semibold">Seite nicht gefunden / Page not found</h1>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-accent hover:underline">
          → Dashboard
        </Link>
      </div>
    </div>
  );
}
