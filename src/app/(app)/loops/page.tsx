import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/i18n";
import { Badge, ButtonLink, Card, Empty, PageHeader, formatDate } from "@/components/ui";

export const metadata = { title: "Loops" };

export default async function LoopsPage() {
  const user = await requireUser();
  const { t, locale } = await getT();
  const loops = await getDb().select().from(schema.loops).where(eq(schema.loops.userId, user.id)).orderBy(desc(schema.loops.createdAt));
  return (
    <>
      <PageHeader title={t("loops.title")} action={<ButtonLink href="/loops/new">+ {t("loops.new")}</ButtonLink>} />
      {loops.length === 0 ? (
        <Card>
          <Empty action={<ButtonLink href="/loops/new">{t("loops.new")}</ButtonLink>}>{t("loops.empty")}</Empty>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {loops.map((l) => (
            <Link key={l.id} href={`/loops/${l.id}`} className="rounded-xl border border-line bg-surface p-5 transition hover:border-accent/50">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">{l.name}</h2>
                <Badge tone={l.active ? "accent" : "neutral"}>{l.active ? t("loops.active") : t("loops.paused")}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted">{l.jobTitles.join(" · ")}</p>
              <p className="mt-1 text-xs text-muted">
                {[l.locations.join(", "), l.countries.map((c) => c.toUpperCase()).join(", "), l.remoteOnly ? t("loops.remoteOnly") : null].filter(Boolean).join(" · ")}
              </p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span>Min. {l.minScore}%</span>
                <span>{t(`loops.mode.${l.mode}`)}</span>
                <span>
                  {t("loops.lastRun")}: {l.lastRunAt ? formatDate(l.lastRunAt, locale, true) : t("loops.never")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
