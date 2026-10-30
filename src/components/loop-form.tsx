import type { Loop, Profile } from "@/db/schema";
import type { T } from "@/i18n";
import { SOURCES } from "@/lib/jobs/registry";
import { saveLoopAction } from "@/app/actions/loops";
import { ActionForm, SubmitButton } from "./action-form";
import { Badge, Card, Field, Input, Select } from "./ui";

export function LoopForm({ t, profiles, loop }: { t: T; profiles: Profile[]; loop?: Loop }) {
  const l = loop;
  const defaultSources = SOURCES.filter((s) => s.status() === "active" && !["greenhouse", "lever"].includes(s.id)).map((s) => s.id);
  const selected = new Set(l?.sources ?? defaultSources);
  const join = (a?: string[]) => (a ?? []).join(", ");
  return (
    <ActionForm action={saveLoopAction} className="space-y-6">
      <input type="hidden" name="id" value={l?.id ?? ""} />
      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("loops.name")}>
            <Input name="name" required defaultValue={l?.name ?? ""} placeholder="Frontend Frankfurt" />
          </Field>
          <Field label={t("cv.profile")}>
            <Select name="profileId" defaultValue={l?.profileId ?? profiles[0]?.id}>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                  {p.headline ? ` – ${p.headline}` : ""}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t("loops.titles")} hint={t("loops.titlesHint")}>
          <Input name="jobTitles" required defaultValue={join(l?.jobTitles ?? profiles[0]?.suggestedCategories.slice(0, 2))} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("loops.locations")}>
            <Input name="locations" defaultValue={join(l?.locations)} placeholder="Frankfurt, Berlin" />
          </Field>
          <Field label={t("loops.countries")} hint={t("loops.countriesHint")}>
            <Input name="countries" defaultValue={join(l?.countries ?? ["de"])} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="includeRemote" defaultChecked={l?.includeRemote ?? true} /> {t("loops.includeRemote")}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="remoteOnly" defaultChecked={l?.remoteOnly ?? false} /> {t("loops.remoteOnly")}
          </label>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h3 className="text-sm font-semibold">{t("loops.sources")}</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {SOURCES.map((s) => {
            const st = s.status();
            return (
              <label key={s.id} className="flex items-start gap-3 rounded-lg border border-line p-3 text-sm">
                <input type="checkbox" name="sources" value={s.id} defaultChecked={selected.has(s.id)} disabled={st !== "active"} className="mt-0.5" />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-medium">
                    {s.label} {st !== "active" && <Badge tone="warn">{t(`sources.${st}`)}</Badge>}
                  </span>
                  <span className="block text-xs text-muted">{s.statusHint}</span>
                </span>
              </label>
            );
          })}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("loops.greenhouse")} hint={t("loops.greenhouseHint")}>
            <Input name="greenhouseBoards" defaultValue={join(l?.greenhouseBoards)} />
          </Field>
          <Field label={t("loops.lever")} hint="z. B. plaid, spotify">
            <Input name="leverCompanies" defaultValue={join(l?.leverCompanies)} />
          </Field>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("loops.preferred")}>
            <Input name="preferredCompanies" defaultValue={join(l?.preferredCompanies)} />
          </Field>
          <Field label={t("loops.excluded")}>
            <Input name="excludedCompanies" defaultValue={join(l?.excludedCompanies)} />
          </Field>
          <Field label={t("loops.excludedKeywords")}>
            <Input name="excludedKeywords" defaultValue={join(l?.excludedKeywords ?? ["Praktikum", "Werkstudent"])} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={`${t("loops.minScore")} (0–100)`}>
            <Input name="minScore" type="number" min={0} max={100} defaultValue={l?.minScore ?? 60} />
          </Field>
          <Field label={t("loops.dailyLimit")}>
            <Input name="dailyLimit" type="number" min={1} max={100} defaultValue={l?.dailyLimit ?? 10} />
          </Field>
          <Field label={t("loops.letterLang")}>
            <Select name="coverLetterLanguage" defaultValue={l?.coverLetterLanguage ?? "auto"}>
              <option value="auto">Auto (Sprache der Anzeige)</option>
              <option value="de">Deutsch</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="ar">العربية</option>
            </Select>
          </Field>
        </div>
        <Field label={t("loops.mode")}>
          <div className="space-y-2 text-sm">
            {(["approval", "auto_prepare"] as const).map((m) => (
              <label key={m} className="flex items-center gap-2">
                <input type="radio" name="mode" value={m} defaultChecked={(l?.mode ?? "approval") === m} /> {t(`loops.mode.${m}`)}
              </label>
            ))}
          </div>
        </Field>
      </Card>
      <SubmitButton>{t("common.save")}</SubmitButton>
    </ActionForm>
  );
}
