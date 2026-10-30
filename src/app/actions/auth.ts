"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { dummyVerify, hashPassword, verifyPassword } from "@/lib/auth/password";
import { clientIp, createSession, destroySession, getCurrentUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { audit } from "@/lib/audit";
import { getT, getLocale } from "@/i18n";
import type { ActionState } from "@/lib/action-state";

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(10).max(200),
  consent: z.literal("on"),
});

export async function registerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { t } = await getT();
  const ip = await clientIp();
  if (!rateLimit(`register:${ip}`, 10, 60 * 60_000).ok) return { error: t("auth.rateLimited") };
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { error: field === "password" ? t("auth.passwordHint") : field === "consent" ? t("auth.consent") : t("error.generic") };
  }
  const { name, email, password } = parsed.data;
  const db = getDb();
  const locale = await getLocale();
  const inserted = await db
    .insert(schema.users)
    .values({ name, email, passwordHash: await hashPassword(password), locale })
    .onConflictDoNothing({ target: schema.users.email })
    .returning({ id: schema.users.id });
  if (!inserted[0]) return { error: t("auth.exists") };
  await audit(inserted[0].id, "user.register", { ip, meta: { consent: "cv_processing_v1" } });
  await createSession(inserted[0].id);
  redirect("/dashboard");
}

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { t } = await getT();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const ip = await clientIp();
  if (!rateLimit(`login:${email}`, 8, 15 * 60_000).ok || !rateLimit(`login-ip:${ip}`, 30, 15 * 60_000).ok) {
    return { error: t("auth.rateLimited") };
  }
  const [user] = await getDb().select().from(schema.users).where(eq(schema.users.email, email));
  // Constant-ish work even for unknown users to reduce user enumeration via timing.
  const ok = user ? await verifyPassword(password, user.passwordHash) : await dummyVerify(password);
  if (!user || !ok) {
    await audit(user?.id ?? null, "user.login_failed", { ip, meta: { email } });
    return { error: t("auth.invalid") };
  }
  await createSession(user.id);
  await audit(user.id, "user.login", { ip });
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  await destroySession();
  if (user) await audit(user.id, "user.logout");
  redirect("/login");
}
