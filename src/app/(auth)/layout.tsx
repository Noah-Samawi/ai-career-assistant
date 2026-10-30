import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getT } from "@/i18n";
import { LocaleSwitcher } from "@/components/locale-switcher";

const APP = process.env.NEXT_PUBLIC_APP_NAME ?? "Noavio Career";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { locale, t } = await getT();
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 block text-center text-lg font-semibold">
          {APP}
        </Link>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">{children}</div>
        <p className="mt-4 text-center text-xs text-muted">{t("app.tagline")}</p>
        <div className="mt-3 flex justify-center">
          <LocaleSwitcher current={locale} />
        </div>
      </div>
    </div>
  );
}
