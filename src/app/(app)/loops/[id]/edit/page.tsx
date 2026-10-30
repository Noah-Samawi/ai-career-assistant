import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/i18n";
import { isUuid } from "@/lib/text";
import { LoopForm } from "@/components/loop-form";
import { PageHeader } from "@/components/ui";

export default async function EditLoopPage({ params }: PageProps<"/loops/[id]/edit">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const user = await requireUser();
  const { t } = await getT();
  const db = getDb();
  const [loop] = await db.select().from(schema.loops).where(and(eq(schema.loops.id, id), eq(schema.loops.userId, user.id)));
  if (!loop) notFound();
  const profiles = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, user.id));
  return (
    <>
      <PageHeader title={`${t("common.edit")}: ${loop.name}`} />
      <LoopForm t={t} profiles={profiles} loop={loop} />
    </>
  );
}
