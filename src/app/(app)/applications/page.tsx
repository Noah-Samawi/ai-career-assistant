import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/i18n";
import { listApplications } from "@/lib/queries";
import { SENT_STATUSES } from "@/lib/applications/state";
import { ApplicationTable } from "@/components/application-table";
import { Card, Empty, PageHeader, cn } from "@/components/ui";

export const metadata = { title: "Applications" };

export default async function ApplicationsPage({ searchParams }: PageProps<"/applications">) {
  const user = await requireUser();
  const { t, locale } = await getT();
  const status = String((await searchParams).status ?? "");
  const tabs: { key: string; label: string; statuses?: string[] }[] = [
    { key: "", label: t("apps.filter.all") },
    { key: "pending_approval", label: t("status.pending_approval"), statuses: ["pending_approval", "draft"] },
    { key: "approved", label: t("status.approved"), statuses: ["approved"] },
    { key: "sent", label: t("dash.kpi.sent"), statuses: SENT_STATUSES },
    { key: "interview", label: t("status.interview"), statuses: ["interview", "offer"] },
    { key: "rejected", label: t("status.rejected"), statuses: ["rejected"] },
  ];
  const tab = tabs.find((x) => x.key === status) ?? tabs[0]!;
  const rows = await listApplications(user.id, { statuses: tab.statuses });
  return (
    <>
      <PageHeader title={t("apps.title")} />
      <div className="mb-4 flex gap-1 overflow-x-auto">
        {tabs.map((x) => (
          <Link
            key={x.key}
            href={x.key ? `/applications?status=${x.key}` : "/applications"}
            className={cn("whitespace-nowrap rounded-lg px-3 py-1.5 text-sm", x.key === tab.key ? "bg-surface font-medium shadow-sm ring-1 ring-line" : "text-muted hover:text-ink")}
          >
            {x.label}
          </Link>
        ))}
      </div>
      <Card>{rows.length ? <ApplicationTable rows={rows} t={t} locale={locale} /> : <Empty>{t("apps.empty")}</Empty>}</Card>
    </>
  );
}
