import { requireUser } from "@/lib/auth/session";
import { getT } from "@/i18n";
import { SOURCES, UNAVAILABLE_PLATFORMS } from "@/lib/jobs/registry";
import { activeProvider } from "@/lib/ai";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";

export const metadata = { title: "Sources" };

export default async function SourcesPage() {
  await requireUser();
  const { t } = await getT();
  const ai = activeProvider();
  return (
    <>
      <PageHeader title={t("sources.title")} sub={t("sources.intro")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("sources.active")} />
          <ul className="divide-y divide-line">
            {SOURCES.map((s) => {
              const st = s.status();
              return (
                <li key={s.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                  <div>
                    <div className="font-medium">{s.label}</div>
                    <div className="text-xs text-muted">{s.statusHint}</div>
                  </div>
                  <Badge tone={st === "active" ? "accent" : "warn"}>{t(`sources.${st}`)}</Badge>
                </li>
              );
            })}
            <li className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
              <div>
                <div className="font-medium">{t("sources.ai")}</div>
                <div className="text-xs text-muted">{ai ? t("sources.aiActive", { provider: ai }) : t("sources.aiNone")}</div>
              </div>
              <Badge tone={ai ? "accent" : "warn"}>{ai ? t("sources.active") : t("sources.needs_config")}</Badge>
            </li>
          </ul>
        </Card>
        <Card>
          <CardHeader title={t("sources.unavailable")} sub="Keine offizielle Schnittstelle – wir umgehen keine Plattform-Regeln." />
          <ul className="divide-y divide-line">
            {UNAVAILABLE_PLATFORMS.map((p) => (
              <li key={p.name} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted">{p.reason}</div>
                </div>
                <Badge>{t("sources.unavailable")}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
