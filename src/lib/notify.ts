import { getDb, schema } from "@/db";

export async function notify(
  userId: string,
  n: { type: string; title: string; body?: string; link?: string },
): Promise<void> {
  await getDb().insert(schema.notifications).values({ userId, ...n });
}
