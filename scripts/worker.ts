/**
 * Background worker: schedules the daily agent run via pg-boss (queue lives in Postgres).
 * Run: npm run worker   (keep it running next to `npm start`)
 */
import "dotenv/config";
import { PgBoss } from "pg-boss";
import { runScheduledLoops } from "../src/lib/agent/scheduler";

const QUEUE = "daily-agent-run";
const CRON = process.env.AGENT_CRON ?? "0 6 * * *"; // 06:00 every day
const TZ = process.env.AGENT_TZ ?? "Europe/Berlin";

async function main() {
  const boss = new PgBoss(process.env.DATABASE_URL!);
  boss.on("error", (e) => console.error("[worker] pg-boss error", e));
  await boss.start();
  await boss.createQueue(QUEUE);
  await boss.schedule(QUEUE, CRON, {}, { tz: TZ });
  await boss.work(QUEUE, async () => {
    const res = await runScheduledLoops();
    console.log("[worker] run finished", res);
  });
  console.log(`[worker] scheduled "${QUEUE}" at "${CRON}" (${TZ})`);
  if (process.argv.includes("--now")) {
    console.log("[worker] --now: running immediately", await runScheduledLoops());
  }
  const stop = async () => {
    await boss.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
