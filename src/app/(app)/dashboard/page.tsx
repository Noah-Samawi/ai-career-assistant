import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/i18n";
import { dashboardStats, listApplications, recentRuns } from "@/lib/queries";
import { ApplicationTable } from "@/components/application-table";
import { RunList } from "@/components/run-list";
import { ButtonLink, Card, CardHeader, Empty, PageHeader, cn } from "@/components/ui";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const user = await requireUser();
  const { t, locale } = await getT();
  const [s, apps, runs] = await Promise.all([dashboardStats(user.id), listApplications(user.id, { limit: 8 }), recentRuns(user.id, 6)]);
  const today = new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: user.timezone }).format(new Date());
  const onboarding = [
    { done: s.hasProfile, label: t("onboarding.step1"), href: "/cv" },
    { done: s.hasProfile, label: t("onboarding.step2"), href: "/cv" },
    { done: s.activeLoops > 0, label: t("onboarding.step3"), href: "/loops/new" },
  ];
  const kpis = [
    { label: t("dash.kpi.jobsToday"), value: s.jobsToday, href: "/matches" },
    { label: t("dash.kpi.pending"), value: s.pending, href: "/applications?status=pending_approval", highlight: s.pending > 0 },
    { label: t("dash.kpi.sent"), value: s.sent, href: "/applications?status=sent" },
    { label: t("dash.kpi.interviews"), value: s.interviews, href: "/applications?status=interview" },
    { label: t("dash.kpi.matches"), value: s.matchesTotal, href: "/matches" },
    { label: t("dash.kpi.rejections"), value: s.rejections, href: "/applications?status=rejected" },
    { label: t("dash.kpi.activeLoops"), value: s.activeLoops, href: "/loops" },
    { label: t("dash.kpi.responseRate"), value: s.responseRate === null ? "–" : `${s.responseRate}%`, href: "/applications" },
  ];

  return (
    <>
      <PageHeader title={t("dash.hello", { name: user.name?.split(" ")[0] ?? "" })} sub={t("dash.today", { date: today })} />

      {onboarding.some((o) => !o.done) && (
        <Card className="mb-6">
          <CardHeader title={t("onboarding.title")} />
          <ol className="grid gap-px bg-line sm:grid-cols-3">
            {onboarding.map((o, i) => (
              <li key={i} className="flex items-center justify-between gap-3 bg-surface px-5 py-4">
                <span className="flex items-center gap-3 text-sm">
                  <span className={cn("grid size-6 place-items-center rounded-full text-xs font-semibold", o.done ? "bg-accent text-accent-ink" : "bg-surface-2 text-muted")}>
                    {o.done ? "✓" : i + 1}
                  </span>
                  {o.label}
                </span>
                {!o.done && (
                  <ButtonLink href={o.href} size="sm" variant="secondary">
                    {t("onboarding.go")}
                  </ButtonLink>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className={cn("rounded-xl border bg-surface p-4 transition hover:border-accent/50", k.highlight ? "border-warn/50" : "border-line")}>
            <div className="text-xs text-muted">{k.label}</div>
            <div className={cn("mt-2 text-2xl font-semibold tabular", k.highlight && "text-warn")}>{k.value}</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader
            title={t("dash.recent")}
            action={
              <Link href="/applications" className="text-xs text-accent hover:underline">
                {t("common.viewAll")}
              </Link>
            }
          />
          {apps.length ? <ApplicationTable rows={apps} t={t} locale={locale} /> : <Empty>{t("dash.noApplications")}</Empty>}
        </Card>
        <Card>
          <CardHeader title={t("dash.activity")} />
          <RunList runs={runs} t={t} locale={locale} />
        </Card>
      </div>
    </>
  );
}
