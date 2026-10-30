import Link from "next/link";
import type { T } from "@/i18n";
import type { Job, Match } from "@/db/schema";
import { dismissMatchAction, draftFromMatchAction } from "@/app/actions/applications";
import { Badge, Button, ScoreBadge, formatDate } from "./ui";
import { SubmitButton } from "./action-form";

export function MatchList({ rows, t, locale }: { rows: { match: Match; job: Job; applicationId: string | null }[]; t: T; locale: string }) {
  return (
    <ul className="divide-y divide-line">
      {rows.map(({ match: m, job: j, applicationId }) => {
        const b = m.breakdown;
        return (
          <li key={m.id} className={`px-5 py-4 ${m.status === "excluded" || m.status === "dismissed" ? "opacity-60" : ""}`}>
            <div className="flex items-start gap-4">
              <ScoreBadge score={m.score} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <a href={j.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-accent hover:underline">
                    {j.title}
                  </a>
                  {m.status !== "new" && <Badge tone={m.status === "excluded" ? "danger" : "neutral"}>{t(`match.${m.status}`)}</Badge>}
                </div>
                <div className="mt-0.5 text-sm text-muted">
                  {j.company} · {j.remote ? `${t("common.remote")}${j.location ? ` (${j.location})` : ""}` : (j.location ?? "–")} · {j.source}
                  {j.postedAt && ` · ${formatDate(j.postedAt, locale)}`}
                </div>
                {m.exclusionReason && <div className="mt-1 text-xs text-danger">{m.exclusionReason}</div>}
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-muted hover:text-ink">
                    Skills {b.skills} · Titel {b.title} · Ort {b.location} · Sprache {b.language}
                    {b.seniorityPenalty ? ` · −${b.seniorityPenalty}` : ""}
                  </summary>
                  <div className="mt-2 space-y-1.5">
                    {b.matchedSkills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="me-1 text-muted">{t("matches.matched")}:</span>
                        {b.matchedSkills.map((s) => (
                          <Badge key={s} tone="accent">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {b.missingSkills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="me-1 text-muted">{t("matches.missing")}:</span>
                        {b.missingSkills.map((s) => (
                          <Badge key={s} tone="warn">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {b.notes.map((n) => (
                      <div key={n} className="text-muted">
                        • {n}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                {applicationId ? (
                  <Link href={`/applications/${applicationId}`} className="text-sm text-accent hover:underline">
                    {t("nav.applications")} →
                  </Link>
                ) : m.status === "new" ? (
                  <>
                    <form action={draftFromMatchAction}>
                      <input type="hidden" name="matchId" value={m.id} />
                      <SubmitButton size="sm" pendingText="…">
                        {t("matches.createDraft")}
                      </SubmitButton>
                    </form>
                    <form action={dismissMatchAction}>
                      <input type="hidden" name="matchId" value={m.id} />
                      <Button size="sm" variant="ghost">
                        {t("matches.dismiss")}
                      </Button>
                    </form>
                  </>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
