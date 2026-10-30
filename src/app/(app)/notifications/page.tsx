import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/i18n";
import { markAllReadAction } from "@/app/actions/settings";
import { Button, Card, Empty, PageHeader, formatDate } from "@/components/ui";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const { t, locale } = await getT();
  const items = await getDb().select().from(schema.notifications).where(eq(schema.notifications.userId, user.id)).orderBy(desc(schema.notifications.createdAt)).limit(100);
  return (
    <>
      <PageHeader
        title={t("notif.title")}
        action={
          <form action={markAllReadAction}>
            <Button variant="secondary" size="sm">{t("notif.markAll")}</Button>
          </form>
        }
      />
      <Card>
        {items.length === 0 ? (
          <Empty>{t("notif.empty")}</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((n) => (
              <li key={n.id} className="flex gap-3 px-5 py-4">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt ? "bg-line" : "bg-accent"}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{n.link ? <Link href={n.link} className="hover:underline">{n.title}</Link> : n.title}</div>
                  {n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted">{formatDate(n.createdAt, locale, true)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
