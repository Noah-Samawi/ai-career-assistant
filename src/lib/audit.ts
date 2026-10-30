import { getDb, schema } from "@/db";

export async function audit(
  userId: string | null,
  action: string,
  opts: { entityType?: string; entityId?: string; meta?: Record<string, unknown>; ip?: string | null } = {},
): Promise<void> {
  try {
    await getDb().insert(schema.auditLogs).values({
      userId,
      action,
      entityType: opts.entityType,
      entityId: opts.entityId,
      meta: opts.meta,
      ip: opts.ip ?? null,
    });
  } catch (err) {
    // Audit failures must never break the user flow, but must be visible in logs.
    console.error("[audit] failed to write audit log", action, err);
  }
}
