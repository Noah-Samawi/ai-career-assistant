import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/i18n";
import { listMatches } from "@/lib/queries";
import { MatchList } from "@/components/match-list";
import { Card, Empty, PageHeader, cn } from "@/components/ui";

export const metadata = { title: "Matches" };

const FILTERS = [
  { key: "new", min: 0 },
  { key: "new60", min: 60 },
  { key: "all", min: 0 },
] as const;

export default async function MatchesPage({ searchParams }: PageProps<"/matches">) {
  const user = await requireUser();
  const { t, locale } = await getT();
  const sp = await searchParams;
  const f = FILTERS.find((x) => x.key === sp.f) ?? FILTERS[0];
  const rows = await listMatches(user.id, { status: f.key === "all" ? undefined : "new", minScore: f.min, limit: 150 });
  const labels = { new: t("match.new"), new60: `${t("match.new")} · ≥ 60 %`, all: t("apps.filter.all") };
  return (
    <>
      <PageHeader
        title={t("matches.title")}
        action={
          <div className="flex gap-1 rounded-lg border border-line bg-surface p-1">
            {FILTERS.map((x) => (
              <Link key={x.key} href={`/matches?f=${x.key}`} className={cn("rounded-md px-3 py-1.5 text-sm", x.key === f.key ? "bg-surface-2 font-medium" : "text-muted")}>
                {labels[x.key]}
              </Link>
            ))}
          </div>
        }
      />
      <Card>{rows.length ? <MatchList rows={rows} t={t} locale={locale} /> : <Empty>{t("matches.empty")}</Empty>}</Card>
    </>
  );
}
