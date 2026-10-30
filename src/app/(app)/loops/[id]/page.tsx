import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/i18n";
import { isUuid } from "@/lib/text";
import { listMatches, recentRuns } from "@/lib/queries";
import { deleteLoopAction, runLoopNowAction, toggleLoopAction } from "@/app/actions/loops";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { MatchList } from "@/components/match-list";
import { RunList } from "@/components/run-list";
import { Badge, Button, ButtonLink, Card, CardHeader, Empty, PageHeader } from "@/components/ui";

export default async function LoopDetail({ params }: PageProps<"/loops/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const user = await requireUser();
  const { t, locale } = await getT();
  const [loop] = await getDb().select().from(schema.loops).where(and(eq(schema.loops.id, id), eq(schema.loops.userId, user.id)));
  if (!loop) notFound();
  const [matches, runs] = await Promise.all([listMatches(user.id, { loopId: id, limit: 60 }), recentRuns(user.id, 10, id)]);

  return (
    <>
      <PageHeader
        title={loop.name}
        sub={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={loop.active ? "accent" : "neutral"}>{loop.active ? t("loops.active") : t("loops.paused")}</Badge>
            {loop.jobTitles.join(" · ")} — {[...loop.locations, ...loop.countries.map((c) => c.toUpperCase())].join(", ") || "–"} · Min. {loop.minScore}% ·{" "}
            {t(`loops.mode.${loop.mode}`)}
          </span>
        }
        action={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/loops/${id}/edit`} variant="secondary" size="sm">
              {t("common.edit")}
            </ButtonLink>
            <form action={toggleLoopAction}>
              <input type="hidden" name="id" value={id} />
              <Button variant="secondary" size="sm">
                {loop.active ? t("loops.paused") : t("loops.active")}
              </Button>
            </form>
            <form action={deleteLoopAction}>
              <input type="hidden" name="id" value={id} />
              <Button variant="ghost" size="sm" className="text-danger">
                {t("common.delete")}
              </Button>
            </form>
          </div>
        }
      />
      <Card className="mb-6 p-5">
        <ActionForm action={runLoopNowAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="id" value={id} />
          <SubmitButton pendingText="Suche läuft …">▶ {t("loops.runNow")}</SubmitButton>
          <span className="text-xs text-muted">Sources: {loop.sources.join(", ") || "–"}</span>
        </ActionForm>
      </Card>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader title={`${t("loops.results")} (${matches.length})`} />
          {matches.length ? <MatchList rows={matches} t={t} locale={locale} /> : <Empty>{t("matches.empty")}</Empty>}
        </Card>
        <Card>
          <CardHeader title={t("loops.runs")} />
          <RunList runs={runs} t={t} locale={locale} />
        </Card>
      </div>
    </>
  );
}
