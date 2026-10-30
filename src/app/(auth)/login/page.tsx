import Link from "next/link";
import { getT } from "@/i18n";
import { loginAction } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Input } from "@/components/ui";

export const metadata = { title: "Login" };

export default async function LoginPage() {
  const { t } = await getT();
  return (
    <>
      <h1 className="mb-5 text-xl font-semibold">{t("auth.login")}</h1>
      <ActionForm action={loginAction} className="space-y-4">
        <Field label={t("auth.email")} htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label={t("auth.password")} htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <SubmitButton className="w-full">{t("auth.login")}</SubmitButton>
      </ActionForm>
      <p className="mt-5 text-sm text-muted">
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="font-medium text-accent">
          {t("auth.register")}
        </Link>
      </p>
    </>
  );
}
