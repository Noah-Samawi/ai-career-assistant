import { eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

/** GDPR Art. 15/20 – machine-readable export of all personal data. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const db = getDb();
  const uid = user.id;
  const [profiles, documents, loops, matches, applications, notifications, auditLogs] = await Promise.all([
    db.select().from(schema.profiles).where(eq(schema.profiles.userId, uid)),
    db
      .select({ id: schema.cvDocuments.id, fileName: schema.cvDocuments.fileName, createdAt: schema.cvDocuments.createdAt, extractedText: schema.cvDocuments.extractedText, parseMethod: schema.cvDocuments.parseMethod })
      .from(schema.cvDocuments)
      .where(eq(schema.cvDocuments.userId, uid)),
    db.select().from(schema.loops).where(eq(schema.loops.userId, uid)),
    db.select().from(schema.matches).where(eq(schema.matches.userId, uid)),
    db.select().from(schema.applications).where(eq(schema.applications.userId, uid)),
    db.select().from(schema.notifications).where(eq(schema.notifications.userId, uid)),
    db.select().from(schema.auditLogs).where(eq(schema.auditLogs.userId, uid)),
  ]);
  const appIds = applications.map((a) => a.id);
  const events = appIds.length ? await db.select().from(schema.applicationEvents).where(inArray(schema.applicationEvents.applicationId, appIds)) : [];
  const jobIds = [...new Set([...matches.map((m) => m.jobId), ...applications.map((a) => a.jobId)])];
  const jobs = jobIds.length ? await db.select().from(schema.jobs).where(inArray(schema.jobs.id, jobIds)) : [];
  await audit(uid, "user.export");
  const account = Object.fromEntries(Object.entries(user).filter(([k]) => k !== "passwordHash"));
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), account, profiles, documents, loops, jobs, matches, applications, applicationEvents: events, notifications, auditLogs }, null, 2);
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="my-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
