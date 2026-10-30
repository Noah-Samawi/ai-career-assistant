import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getT } from "@/i18n";
import { ButtonLink } from "@/components/ui";
import { LocaleSwitcher } from "@/components/locale-switcher";

const APP = process.env.NEXT_PUBLIC_APP_NAME ?? "Noavio Career";

export default async function Home() {
  if (await getCurrentUser()) redirect("/dashboard");
  const { t, locale } = await getT();
  const steps = [
    { n: "01", title: t("landing.f1.title"), body: t("landing.f1.body") },
    { n: "02", title: t("landing.f2.title"), body: t("landing.f2.body") },
    { n: "03", title: t("landing.f3.title"), body: t("landing.f3.body") },
  ];
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
        <span className="font-semibold tracking-tight">{APP}</span>
        <div className="flex items-center gap-3">
          <LocaleSwitcher current={locale} />
          <ButtonLink href="/login" variant="ghost" size="sm">
            {t("auth.login")}
          </ButtonLink>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6">
        <section className="grid gap-10 py-16 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:py-24">
          <div>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">{t("landing.headline")}</h1>
            <p className="mt-5 max-w-xl text-lg text-muted">{t("landing.sub")}</p>
            <div className="mt-8 flex gap-3">
              <ButtonLink href="/register">{t("landing.cta")} →</ButtonLink>
              <ButtonLink href="/login" variant="secondary">
                {t("auth.login")}
              </ButtonLink>
            </div>
          </div>
          {/* Product preview built from real UI primitives – illustrative, clearly not live data */}
          <div aria-hidden className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between text-xs text-muted">
              <span>{t("nav.matches")}</span>
              <span className="rounded bg-surface-2 px-1.5 py-0.5">Preview</span>
            </div>
            {[
              ["Full Stack Developer", "Frankfurt", 86],
              ["Backend Engineer (Node.js)", "Remote · EU", 74],
              ["IT Support Engineer", "Offenbach", 58],
            ].map(([title, loc, s]) => (
              <div key={String(title)} className="flex items-center justify-between border-t border-line py-3 first:border-0">
                <div>
                  <div className="text-sm font-medium">{title}</div>
                  <div className="text-xs text-muted">{loc}</div>
                </div>
                <span className={`tabular rounded-md px-2 py-1 text-sm font-semibold ${Number(s) >= 75 ? "bg-accent-soft text-accent" : "bg-warn-soft text-warn"}`}>{s}%</span>
              </div>
            ))}
          </div>
        </section>
        <section className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="bg-surface p-6">
              <div className="font-mono text-xs text-accent">{s.n}</div>
              <h3 className="mt-2 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </section>
        <footer className="py-12 text-xs text-muted">{t("app.tagline")}</footer>
      </main>
    </div>
  );
}
