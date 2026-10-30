import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { runScheduledLoops } from "@/lib/agent/scheduler";

export const maxDuration = 300;

/** For hosted cron (e.g. Vercel Cron, GitHub Actions). Alternative: `npm run worker`. */
export async function POST(req: Request) {
  const secret = env().CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json(await runScheduledLoops());
}
