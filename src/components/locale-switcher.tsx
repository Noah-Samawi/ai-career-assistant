import { setLocaleAction } from "@/app/actions/settings";
import { LOCALES } from "@/i18n";
import { cn } from "./ui";

export function LocaleSwitcher({ current }: { current: string }) {
  return (
    <form action={setLocaleAction} className="flex flex-wrap gap-1">
      {LOCALES.map((l) => (
        <button
          key={l.code}
          name="locale"
          value={l.code}
          className={cn("rounded-md px-2 py-1 text-xs", l.code === current ? "bg-surface-2 font-semibold text-ink" : "text-muted hover:text-ink")}
        >
          {l.label}
        </button>
      ))}
    </form>
  );
}
