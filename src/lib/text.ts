const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

/** Decodes common HTML entities (also double-escaped content, as Greenhouse returns). */
export function decodeEntities(s: string): string {
  let out = s;
  for (let i = 0; i < 2; i++) {
    out = out
      .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m)
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
  }
  return out;
}

export function htmlToText(html: string): string {
  return decodeEntities(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

/** Lowercase, strip accents & punctuation – for comparisons. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9+#.\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set([
  "m", "w", "d", "f", "x", "mwd", "fmd", "all", "genders", "gn", "in", "und", "and", "the", "der", "die", "das", "for", "fur", "of", "a", "an", "mit", "with", "im", "bei",
]);

export function tokens(s: string): string[] {
  return normalize(s)
    .split(/[\s/,-]+/)
    .map((t) => t.replace(/^[.]+|[.]+$/g, ""))
    .filter((t) => t.length > 1 && !STOP.has(t));
}

const LANG_HINTS: Record<string, string[]> = {
  de: ["und", "der", "die", "das", "wir", "sie", "mit", "fur", "ihre", "unsere", "kenntnisse", "erfahrung", "aufgaben", "bieten", "sind", "eine"],
  en: ["and", "the", "you", "we", "with", "for", "our", "your", "experience", "skills", "are", "will", "team", "about"],
  fr: ["et", "les", "des", "nous", "vous", "avec", "pour", "une", "est", "votre", "notre", "experience", "poste"],
  es: ["y", "los", "las", "con", "para", "una", "nuestro", "experiencia", "equipo", "puesto", "somos", "ofrecemos"],
  ar: [],
};

/** Very small stop-word based language detector (de/en/fr/es/ar). Returns null if unsure. */
export function detectLanguage(text: string): "de" | "en" | "fr" | "es" | "ar" | null {
  if (!text) return null;
  const arabic = (text.match(/[؀-ۿ]/g) ?? []).length;
  if (arabic > 40) return "ar";
  const words = normalize(text).split(" ").slice(0, 600);
  let best: string | null = null;
  let bestScore = 0;
  for (const [lang, hints] of Object.entries(LANG_HINTS)) {
    const set = new Set(hints);
    const score = words.filter((w) => set.has(w)).length;
    if (score > bestScore) {
      best = lang;
      bestScore = score;
    }
  }
  return bestScore >= 3 ? (best as "de" | "en" | "fr" | "es") : null;
}

export function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function splitList(input: string | null | undefined): string[] {
  return uniq(
    (input ?? "")
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  ).slice(0, 50);
}

export function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
