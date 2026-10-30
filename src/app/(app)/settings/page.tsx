import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/session";
import { getT, LOCALES } from "@/i18n";
import { getUsage, limitFor, PLAN_LIMITS, type Plan } from "@/lib/plans";
import { deleteAccountAction, setLocaleAction, setThemeAction, setTimezoneAction } from "@/app/actions/settings";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button, Card, CardHeader, Field, Input, PageHeader, Select, cn } from "@/components/ui";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const { t, locale } = await getT();
  const theme = (await cookies()).get("theme")?.value ?? "system";
  const plan = user.plan as Plan;
  const [runs, letters, drafts] = await Promise.all([getUsage(user.id, "manual_run"), getUsage(user.id, "cover_letter"), getUsage(user.id, "draft")]);
  const zones = Intl.supportedValuesOf("timeZone");
  const usage = [
    { label: "Manuelle Läufe heute", used: runs, max: limitFor(plan, "manual_run") },
    { label: "KI-Anschreiben diesen Monat", used: letters, max: limitFor(plan, "cover_letter") },
    { label: "Such-Agenten", used: null, max: PLAN_LIMITS[plan].loops },
  ];
  void drafts;

  return (
    <>
      <PageHeader title={t("settings.title")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("settings.language")} />
          <form action={setLocaleAction} className="flex flex-wrap gap-2 p-5">
            {LOCALES.map((l) => (
              <Button key={l.code} name="locale" value={l.code} variant={l.code === locale ? "primary" : "secondary"} size="sm">
                {l.label}
              </Button>
            ))}
          </form>
          <CardHeader title={t("settings.theme")} />
          <form action={setThemeAction} className="flex flex-wrap gap-2 p-5">
            {(["system", "light", "dark"] as const).map((th) => (
              <Button key={th} name="theme" value={th} variant={th === theme ? "primary" : "secondary"} size="sm">
                {t(`settings.theme.${th}`)}
              </Button>
            ))}
          </form>
          <CardHeader title={t("settings.timezone")} />
          <form action={setTimezoneAction} className="flex gap-2 p-5">
            <Select name="timezone" defaultValue={user.timezone}>
              {zones.map((z) => (
                <option key={z}>{z}</option>
              ))}
            </Select>
            <Button variant="secondary">{t("common.save")}</Button>
          </form>
        </Card>

        <Card>
          <CardHeader title={`${t("settings.plan")}: ${plan.toUpperCase()}`} sub="Zahlungen (Stripe) folgen in Phase 2." />
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            {(["free", "pro", "premium"] as const).map((p) => (
              <div key={p} className={cn("rounded-lg border p-3 text-xs", p === plan ? "border-accent bg-accent-soft" : "border-line")}>
                <div className="mb-1 text-sm font-semibold uppercase">{p}</div>
                <div>{PLAN_LIMITS[p].loops} Agent(en)</div>
                <div>{PLAN_LIMITS[p].profiles} Profil(e)</div>
                <div>{PLAN_LIMITS[p].coverLettersPerMonth} Anschreiben/Monat</div>
                <div>{PLAN_LIMITS[p].draftsPerDay} Entwürfe/Tag</div>
                <div>{PLAN_LIMITS[p].scheduledRuns ? "Tägliche Auto-Suche" : "Nur manuelle Suche"}</div>
              </div>
            ))}
          </div>
          <CardHeader title={t("settings.usage")} />
          <ul className="space-y-2 p-5 text-sm">
            {usage.map((u) => (
              <li key={u.label} className="flex justify-between tabular">
                <span className="text-muted">{u.label}</span>
                <span>{u.used === null ? `max. ${u.max}` : `${u.used} / ${u.max}`}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title={t("settings.privacy")} sub="DSGVO Art. 15, 17, 20" />
          <div className="flex flex-wrap items-end justify-between gap-6 p-5">
            <a href="/api/me/export" className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm font-medium hover:bg-surface-2">
              ⬇ {t("settings.export")}
            </a>
            <ActionForm action={deleteAccountAction} className="flex flex-wrap items-end gap-2">
              <Field label={t("settings.deleteConfirm")}>
                <Input name="confirm" autoComplete="off" className="w-48" />
              </Field>
              <SubmitButton variant="danger">{t("settings.delete")}</SubmitButton>
            </ActionForm>
          </div>
        </Card>
      </div>
    </>
  );
}
