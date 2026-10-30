import Link from "next/link";
import { getT } from "@/i18n";
import { registerAction } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Input } from "@/components/ui";

export const metadata = { title: "Register" };

export default async function RegisterPage() {
  const { t } = await getT();
  return (
    <>
      <h1 className="mb-5 text-xl font-semibold">{t("auth.register")}</h1>
      <ActionForm action={registerAction} className="space-y-4">
        <Field label={t("auth.name")} htmlFor="name">
          <Input id="name" name="name" autoComplete="name" required maxLength={100} />
        </Field>
        <Field label={t("auth.email")} htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label={t("auth.password")} hint={t("auth.passwordHint")} htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
        </Field>
        <label className="flex gap-2 text-xs text-muted">
          <input type="checkbox" name="consent" required className="mt-0.5 accent-[var(--accent)]" />
          <span>{t("auth.consent")}</span>
        </label>
        <SubmitButton className="w-full">{t("auth.register")}</SubmitButton>
      </ActionForm>
      <p className="mt-5 text-sm text-muted">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-accent">
          {t("auth.login")}
        </Link>
      </p>
    </>
  );
}
