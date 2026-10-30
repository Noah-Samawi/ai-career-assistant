# AI Career Assistant (Noavio Career)

KI-Agent für die Jobsuche: Lebenslauf hochladen → Such-Agenten anlegen → täglich echte Stellen aus offiziellen Quellen → erklärbarer Match-Score → KI-Anschreiben mit Fakten-Check → Bewerbung nach Freigabe → ehrliches Tracking.

Architektur, Integrations-Matrix und Roadmap: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**

## Stack

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · PostgreSQL + Drizzle ORM · pg-boss (Queue in Postgres) · OpenAI **oder** Anthropic · Vitest + Playwright

## Schnellstart (lokal)

```bash
# 1. Abhängigkeiten
npm install

# 2. Postgres (z. B. Docker)
docker run -d --name career-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=careerassistant -p 5432:5432 postgres:16

# 3. Konfiguration
cp .env.example .env
#   FILE_ENCRYPTION_KEY setzen:  openssl rand -base64 32
#   optional OPENAI_API_KEY oder ANTHROPIC_API_KEY, ADZUNA_*, SERPAPI_KEY

# 4. Datenbank
npm run db:migrate

# 5. Starten
npm run dev            # App: http://localhost:3000
npm run worker         # tägliche Agent-Läufe (06:00 Europe/Berlin), separat laufen lassen
```

Ohne KI-Schlüssel läuft alles außer Anschreiben; der Lebenslauf wird dann per Heuristik analysiert (im UI gekennzeichnet).

## Skripte

| Befehl | Zweck |
|---|---|
| `npm test` | Unit- + Integrationstests (benötigt Postgres, DB `jobpilot_test` bzw. `TEST_DATABASE_URL`) |
| `npm run e2e` | Browser-Durchlauf der kompletten User-Journey gegen laufenden Server (`BASE_URL`) |
| `npm run typecheck` | Routen-Typen generieren + `tsc` |
| `npm run db:generate` | Migration aus `src/db/schema.ts` erzeugen |
| `npm run agent:run-now` | Alle aktiven Loops (Pro/Premium) sofort ausführen |
| `POST /api/cron/run-loops` | Alternative zum Worker für Hosting-Cron (Header `Authorization: Bearer $CRON_SECRET`) |

## Was echt ist – und was nicht

| Funktion | Status |
|---|---|
| Registrierung/Login, Sessions, Rate-Limit, Audit-Log | ✅ echt |
| CV-Upload PDF/DOCX, Verschlüsselung (AES-256-GCM), Textextraktion | ✅ echt |
| CV-Analyse per KI (OpenAI/Anthropic) | ✅ echt, benötigt API-Key |
| CV-Analyse per Heuristik (Fallback) | ✅ echt, bewusst eingeschränkt (keine erfundenen Stationen) |
| Jobquellen: Bundesagentur, Arbeitnow, Greenhouse, Lever, Remotive | ✅ echte öffentliche APIs |
| Jobquellen: Adzuna, Google Jobs (SerpAPI) | ✅ echt, benötigen API-Key |
| LinkedIn, Indeed, StepStone, Xing, Glassdoor, Monster, ZipRecruiter, Workday | ❌ keine offizielle API – im UI so ausgewiesen |
| Matching-Score 0–100 mit Begründung, Dedupe über Quellen hinweg | ✅ echt |
| KI-Anschreiben + Claim-Check | ✅ echt, benötigt API-Key |
| Freigabe-Workflow, Status-Historie, keine Doppelbewerbungen | ✅ echt |
| Automatisches **Absenden** | ⏳ nicht im MVP. Status „Gesendet“ ist nur über einen bestätigenden Kanal erreichbar (Phase 3: E-Mail über Gmail/Outlook). Bis dahin: „Ich habe mich beworben“ = `applied_externally` |
| Gmail/Outlook, Stripe, Browser-Extension | ⏳ Phase 2–4 |
| Sprachen | DE/EN vollständig; FR/ES/AR Kernbildschirme, Rest Fallback EN; RTL für Arabisch |

## Sicherheit & DSGVO

bcrypt (12), Session-Token nur als SHA-256 in der DB, `httpOnly`/`SameSite=Lax`/`Secure`-Cookies, Security-Header, Upload-Typprüfung per Magic Bytes, CV-Dateien verschlüsselt, Datenexport (`/api/me/export`), Kontolöschung inkl. Dateien, Audit-Log.

## Projektstruktur

```
src/
  app/(app)/…        geschützte Seiten (Dashboard, CV, Loops, Matches, Bewerbungen, …)
  app/actions/…      Server Actions (Auth, CV, Loops, Bewerbungen, Einstellungen)
  app/api/…          GDPR-Export, Cron
  db/schema.ts       Datenmodell (13 Tabellen)
  lib/agent          runLoop(): Suche → Dedupe → Score → Entwürfe → Benachrichtigung
  lib/jobs           Quellen-Adapter, Registry, Dedupe, Persistenz
  lib/matching       Score-Algorithmus
  lib/cv             Extraktion, KI-Parser, Heuristik
  lib/applications   Statusmaschine, Anschreiben, Claim-Check
  i18n/              Übersetzungen (neue Sprache = neue Datei + Registrierung in index.ts)
scripts/worker.ts    pg-boss-Scheduler
tests/, e2e/         Vitest, Playwright
```
