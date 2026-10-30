import Link from "next/link";
import type { T } from "@/i18n";
import { Badge, ScoreBadge, STATUS_TONE, formatDate } from "./ui";

type Row = Awaited<ReturnType<typeof import("@/lib/queries").listApplications>>[number];

export function ApplicationTable({ rows, t, locale }: { rows: Row[]; t: T; locale: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-start text-xs text-muted">
            <th className="px-5 py-2.5 text-start font-medium">{t("common.company")}</th>
            <th className="px-3 py-2.5 text-start font-medium">{t("common.position")}</th>
            <th className="hidden px-3 py-2.5 text-start font-medium md:table-cell">{t("common.location")}</th>
            <th className="px-3 py-2.5 text-start font-medium">{t("common.score")}</th>
            <th className="hidden px-3 py-2.5 text-start font-medium sm:table-cell">{t("common.date")}</th>
            <th className="px-5 py-2.5 text-start font-medium">{t("common.status")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line last:border-0 hover:bg-surface-2/60">
              <td className="max-w-40 truncate px-5 py-3 font-medium">{r.company}</td>
              <td className="max-w-64 px-3 py-3">
                <Link href={`/applications/${r.id}`} className="line-clamp-2 hover:text-accent hover:underline">
                  {r.title}
                </Link>
              </td>
              <td className="hidden max-w-40 truncate px-3 py-3 text-muted md:table-cell">{r.remote ? `${t("common.remote")}${r.location ? ` · ${r.location}` : ""}` : (r.location ?? "–")}</td>
              <td className="px-3 py-3">{r.score !== null ? <ScoreBadge score={r.score} /> : "–"}</td>
              <td className="hidden px-3 py-3 text-muted sm:table-cell tabular">{formatDate(r.appliedAt ?? r.createdAt, locale)}</td>
              <td className="px-5 py-3">
                <Badge tone={STATUS_TONE[r.status]}>{t(`status.${r.status}` as never)}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
