// End-to-end smoke test of the real user journey against a running server.
// Usage: BASE_URL=http://localhost:3000 node e2e/journey.mjs
import { chromium } from "playwright";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.SHOTS ?? "e2e/screenshots";
const email = `e2e+${Date.now()}@example.com`;
const step = (m) => console.log(`✓ ${m}`);

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
page.on("pageerror", (e) => console.error("PAGE ERROR", e.message));

try {
  await page.goto(`${BASE}/register`);
  await page.fill("#name", "Erika Beispiel");
  await page.fill("#email", email);
  await page.fill("#password", "correct-horse-battery");
  await page.check('input[name="consent"]');
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");
  step("register → dashboard");
  await page.screenshot({ path: `${OUT}/01-dashboard-empty.png`, fullPage: true });

  await page.goto(`${BASE}/cv`);
  await page.setInputFiles('input[name="cv"]', path.resolve("tests/fixtures/sample-cv.pdf"));
  await page.click('form:has(input[name="cv"]) button[type="submit"]');
  await page.waitForSelector('textarea[name="skills"]', { timeout: 30_000 });
  const skills = await page.inputValue('textarea[name="skills"]');
  if (!skills.includes("TypeScript")) throw new Error(`skills not parsed: ${skills}`);
  step(`CV uploaded & parsed → skills: ${skills}`);
  await page.fill('input[name="headline"]', "Software Engineer");
  await page.click('form:has(input[name="headline"]) button[type="submit"]');
  await page.waitForSelector("text=/Gespeichert|Saved/");
  step("profile edited & saved");
  await page.screenshot({ path: `${OUT}/02-cv-profile.png`, fullPage: true });

  await page.goto(`${BASE}/loops/new`);
  await page.fill('input[name="name"]', "Dev Frankfurt");
  await page.fill('input[name="jobTitles"]', "Software Engineer, Full Stack Developer");
  await page.fill('input[name="locations"]', "Frankfurt");
  await page.click('form button[type="submit"]');
  await page.waitForURL(/\/loops\/[0-9a-f-]{36}$/);
  step("search agent created");

  await page.click("text=/Jetzt ausführen|Run now/");
  await page.waitForSelector('form [role="status"], form [role="alert"]', { timeout: 90_000 });
  const result = await page.locator('form [role="status"], form [role="alert"]').first().innerText();
  step(`agent run finished → ${result}`);
  await page.screenshot({ path: `${OUT}/03-loop-detail.png`, fullPage: true });

  for (const p of ["matches", "applications", "sources", "settings", "notifications"]) {
    const res = await page.goto(`${BASE}/${p}`);
    if (!res?.ok()) throw new Error(`/${p} → ${res?.status()}`);
  }
  await page.goto(`${BASE}/sources`);
  await page.screenshot({ path: `${OUT}/04-sources.png`, fullPage: true });
  step("all app pages render");

  const exp = await page.request.get(`${BASE}/api/me/export`);
  const data = await exp.json();
  if (data.account.email !== email || "passwordHash" in data.account) throw new Error("export broken");
  step(`GDPR export ok (${data.profiles.length} profile, ${data.loops.length} loop)`);

  await page.goto(`${BASE}/settings`);
  await page.click('button[value="dark"]');
  await page.waitForFunction(() => document.documentElement.dataset.theme === "dark");
  await page.goto(`${BASE}/dashboard`);
  await page.screenshot({ path: `${OUT}/05-dashboard-dark.png`, fullPage: true });
  step("dark mode");

  await page.goto(`${BASE}/settings`);
  await page.click('button[value="ar"]');
  await page.waitForFunction(() => document.documentElement.dir === "rtl");
  await page.goto(`${BASE}/dashboard`);
  await page.screenshot({ path: `${OUT}/06-dashboard-ar-rtl.png`, fullPage: true });
  step("Arabic + RTL");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('button[value="de"]').catch(() => {});
  await page.goto(`${BASE}/settings`);
  await page.click('button[value="de"]');
  await page.goto(`${BASE}/dashboard`);
  await page.screenshot({ path: `${OUT}/07-mobile.png`, fullPage: true });
  step("mobile viewport");

  await page.goto(`${BASE}/settings`);
  await page.fill('input[name="confirm"]', "LÖSCHEN");
  await page.click('button:has-text("Konto und alle Daten löschen")');
  await page.waitForURL(`${BASE}/`);
  const after = await page.goto(`${BASE}/dashboard`);
  if (!after?.url().includes("/login")) throw new Error("account not deleted");
  step("account deletion (GDPR Art. 17)");
  console.log("\nE2E PASSED");
} catch (e) {
  await page.screenshot({ path: `${OUT}/error.png`, fullPage: true });
  console.error("E2E FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
