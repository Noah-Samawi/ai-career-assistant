"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { destroySession, getCurrentUser, requireUser } from "@/lib/auth/session";
import { removePrefix } from "@/lib/storage";
import { audit } from "@/lib/audit";
import { getT, isLocale } from "@/i18n";
import type { ActionState } from "@/lib/action-state";

const YEAR = 60 * 60 * 24 * 365;

export async function setLocaleAction(fd: FormData): Promise<void> {
  const locale = String(fd.get("locale"));
  if (!isLocale(locale)) return;
  (await cookies()).set("locale", locale, { path: "/", maxAge: YEAR, sameSite: "lax" });
  const user = await getCurrentUser();
  if (user) await getDb().update(schema.users).set({ locale }).where(eq(schema.users.id, user.id));
  revalidatePath("/", "layout");
}

export async function setThemeAction(fd: FormData): Promise<void> {
  const theme = String(fd.get("theme"));
  if (!["light", "dark", "system"].includes(theme)) return;
  (await cookies()).set("theme", theme, { path: "/", maxAge: YEAR, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function setTimezoneAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const tz = String(fd.get("timezone"));
  if (!Intl.supportedValuesOf("timeZone").includes(tz)) return;
  await getDb().update(schema.users).set({ timezone: tz }).where(eq(schema.users.id, user.id));
  revalidatePath("/settings");
}

export async function markAllReadAction(): Promise<void> {
  const user = await requireUser();
  await getDb()
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(and(eq(schema.notifications.userId, user.id), isNull(schema.notifications.readAt)));
  revalidatePath("/", "layout");
}

/** GDPR Art. 17 – deletes the account, all rows (FK cascade) and all stored files. */
export async function deleteAccountAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { t } = await getT();
  const confirm = String(fd.get("confirm") ?? "").trim().toUpperCase();
  if (confirm !== "DELETE" && confirm !== "LÖSCHEN") return { error: t("settings.deleteConfirm") };
  await removePrefix(`cv/${user.id}`);
  await audit(null, "user.deleted", { meta: { userIdHash: user.id.slice(0, 8) } });
  await getDb().delete(schema.users).where(eq(schema.users.id, user.id));
  await destroySession();
  redirect("/");
}
