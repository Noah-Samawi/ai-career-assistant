import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/i18n";
import { LoopForm } from "@/components/loop-form";
import { Alert, ButtonLink, PageHeader } from "@/components/ui";

export const metadata = { title: "New loop" };

export default async function NewLoopPage() {
  const user = await requireUser();
  const { t } = await getT();
  const profiles = await getDb().select().from(schema.profiles).where(eq(schema.profiles.userId, user.id));
  return (
    <>
      <PageHeader title={t("loops.new")} />
      {profiles.length === 0 ? (
        <Alert tone="warn">
          {t("loops.needProfile")}{" "}
          <ButtonLink href="/cv" size="sm" variant="secondary" className="ms-2">
            {t("cv.upload")}
          </ButtonLink>
        </Alert>
      ) : (
        <LoopForm t={t} profiles={profiles} />
      )}
    </>
  );
}
