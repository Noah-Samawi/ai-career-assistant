import "server-only";
import { cookies } from "next/headers";
import { en, type MessageKey, type Messages } from "./en";
import { de } from "./de";
import { fr } from "./fr";
import { es } from "./es";
import { ar } from "./ar";
import { getCurrentUser } from "@/lib/auth/session";

export const LOCALES = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "ar", label: "العربية" },
] as const;
export type Locale = (typeof LOCALES)[number]["code"];
export const RTL: Locale[] = ["ar"];

// To add a language: create src/i18n/<code>.ts (Partial<Messages>) and register it here.
const CATALOGS: Record<Locale, Partial<Messages>> = { de, en, fr, es, ar };

export function isLocale(v: string | undefined | null): v is Locale {
  return !!v && v in CATALOGS;
}

export async function getLocale(): Promise<Locale> {
  const user = await getCurrentUser();
  if (user && isLocale(user.locale)) return user.locale;
  const c = (await cookies()).get("locale")?.value;
  return isLocale(c) ? c : "de";
}

export type T = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function translator(locale: Locale): T {
  const cat = CATALOGS[locale];
  return (key, vars) => {
    let s = cat[key] ?? en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}

export async function getT(): Promise<{ t: T; locale: Locale; dir: "rtl" | "ltr" }> {
  const locale = await getLocale();
  return { t: translator(locale), locale, dir: RTL.includes(locale) ? "rtl" : "ltr" };
}
