import Link from "next/link";
import type { T } from "@/i18n";
import { Badge, formatDate } from "./ui";

type Run = Awaited<ReturnType<typeof import("@/lib/queries").recentRuns>>[number];

export function RunList({ runs, t, locale }: { runs: Run[]; t: T; locale: string }) {
  if (!runs.length) return <p className="px-5 py-8 text-center text-sm text-muted">{t("dash.noActivity")}</p>;
  return (
    <ul className="divide-y divide-line">
      {runs.map((r) => {
        const s = r.stats;
        const failed = r.sourceResults?.filter((x) => !x.ok) ?? [];
        return (
          <li key={r.id} className="px-5 py-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <Link href={r.loopId ? `/loops/${r.loopId}` : "/loops"} className="truncate font-medium hover:underline">
                {r.loopName ?? "–"}
              </Link>
              <Badge tone={r.status === "succeeded" ? "accent" : r.status === "partial" ? "warn" : r.status === "failed" ? "danger" : "info"}>{r.status}</Badge>
            </div>
            <div className="mt-1 text-xs text-muted tabular">
              {formatDate(r.startedAt, locale, true)} · {r.trigger}
              {s && ` · ${t("run.summary", { fetched: s.fetched, fresh: s.newJobs, matched: s.matched, drafts: s.drafts })}`}
            </div>
            {failed.length > 0 && (
              <div className="mt-1 text-xs text-danger">
                {failed.map((f) => `${f.source}: ${f.error}`).join(" · ")}
              </div>
            )}
            {r.error && <div className="mt-1 text-xs text-danger">{r.error}</div>}
          </li>
        );
      })}
    </ul>
  );
}
