import Link from "next/link";
import { and, count, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/i18n";
import { logoutAction } from "@/app/actions/auth";
import { NavLinks, type NavItem } from "@/components/nav-links";

const APP = process.env.NEXT_PUBLIC_APP_NAME ?? "Noavio Career";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const { t } = await getT();
  const db = getDb();
  const [[unread], [pending]] = await Promise.all([
    db.select({ n: count() }).from(schema.notifications).where(and(eq(schema.notifications.userId, user.id), isNull(schema.notifications.readAt))),
    db.select({ n: count() }).from(schema.applications).where(and(eq(schema.applications.userId, user.id), eq(schema.applications.status, "pending_approval"))),
  ]);

  const items: NavItem[] = [
    { href: "/dashboard", label: t("nav.dashboard"), icon: "dashboard" },
    { href: "/cv", label: t("nav.cv"), icon: "cv" },
    { href: "/loops", label: t("nav.loops"), icon: "loops" },
    { href: "/matches", label: t("nav.matches"), icon: "matches" },
    { href: "/applications", label: t("nav.applications"), icon: "applications", badge: pending?.n },
    { href: "/notifications", label: t("nav.notifications"), icon: "notifications", badge: unread?.n },
    { href: "/sources", label: t("nav.sources"), icon: "sources" },
    { href: "/settings", label: t("nav.settings"), icon: "settings" },
  ];

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden border-e border-line bg-surface lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-dvh">
        <Link href="/dashboard" className="flex items-center gap-2 px-5 py-5 font-semibold tracking-tight">
          <Logo /> {APP}
        </Link>
        <div className="flex-1 overflow-y-auto px-3">
          <NavLinks items={items} />
        </div>
        <div className="border-t border-line p-3">
          <div className="px-3 pb-2 text-xs text-muted">
            <div className="truncate font-medium text-ink">{user.name ?? user.email}</div>
            <div className="truncate">{user.email} · {user.plan.toUpperCase()}</div>
          </div>
          <form action={logoutAction}>
            <button className="w-full rounded-lg px-3 py-2 text-start text-sm text-muted hover:bg-surface-2 hover:text-ink">{t("nav.logout")}</button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <Logo /> {APP}
            </Link>
            <form action={logoutAction}>
              <button className="text-sm text-muted">{t("nav.logout")}</button>
            </form>
          </div>
          <div className="px-2 pb-2">
            <NavLinks items={items} orientation="horizontal" />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <span className="grid size-7 place-items-center rounded-lg bg-accent text-accent-ink" aria-hidden>
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}
