# AI Career Assistant – Architektur, Analyse & Roadmap

Stand: 30.10.2026 · Phase 1 (MVP) implementiert

## 1. Ausgangslage

| Ort | Inhalt |
|---|---|
| GitHub `Noah-Samawi/ai-career-assistant` | Nur Initial-Commit (README, leeres package.json) |
| Lokal `~/ai-career-assistant` | Ordner `n8n/`, `src/`, `tests/` – Inhalt nicht eingesehen (Zugriff nicht freigegeben). **Vor dem Merge prüfen.** |

Das MVP wurde daher neu aufgesetzt. Nichts Bestehendes wurde überschrieben.

## 2. Analyse der LoopCV-Referenz

| Bereich | LoopCV | Bewertung / unsere Verbesserung |
|---|---|---|
| Kernkonzept | „Loops“ = gespeicherte Suchaufträge (Titel, Ort, Remote, Keywords, ausgeschlossene Firmen), täglich ausgeführt | Übernommen als **Such-Agenten (Loops)**. Zusätzlich: transparenter Match-Score mit Begründung pro Job, Mindestscore, Tageslimit |
| Onboarding | Checkliste „Setup profile / Answer questions / Start first loop / Add extension“ | Übernommen als geführtes 3-Schritt-Onboarding mit echtem Fortschritt aus der DB |
| Dashboard | KPI-Kacheln (Active Loops, Matches, Applications, Emails, Pending) – alle 0 im Screenshot | KPIs + Bewerbungstabelle + Agent-Aktivitätslog. Alle Zahlen kommen aus der DB, keine Demo-Werte |
| Bewerbungswege | (a) Automatische E-Mails an Recruiter (Email-Finder), (b) „Automatic Form Applications“, (c) LinkedIn-Extension | (a) E-Mail-Bewerbung über das **eigene** Gmail/Outlook des Nutzers mit Freigabe → Phase 3. (b) Formular-Autofill nur über Browser-Extension im Browser des Nutzers → Phase 4. Kein serverseitiges Scraping/Absenden auf Plattformen ohne Erlaubnis |
| E-Mail-Finder | Ermittelt Recruiter-Adressen und mailt unaufgefordert | **Bewusst nicht übernommen**: Kaltakquise an ermittelte Personen-E-Mails ist in DE/EU (DSGVO, UWG §7) heikel. Wir nutzen nur in der Anzeige veröffentlichte Bewerbungsadressen |
| Analytics | E-Mail-Öffnungen, A/B-Test von CVs | Phase 3–4. Tracking-Pixel in Bewerbungsmails: rechtlich riskant → nicht geplant |
| Tools | CV Checker, ATS-Keyword-Check, Interview Prep | Match-Analyse zeigt fehlende Skills je Stelle (ATS-Lücken). Interview-Prep Phase 4 |

### Kritische Punkte („Fatal Flaws“), die das Design bestimmen

1. **„Automatisch bei LinkedIn/Indeed/StepStone bewerben“ ist mit offiziellen Mitteln nicht möglich.** Keine dieser Plattformen bietet eine öffentliche Apply-API. Serverseitiges Automatisieren verstößt gegen deren AGB, riskiert Account-Sperren des Nutzers und erfordert CAPTCHA-Umgehung → ausgeschlossen.
2. **Ehrlicher Status:** „Gesendet“ (`submitted`) darf nur gesetzt werden, wenn ein Kanal eine Bestätigung liefert (z. B. Gmail-API-Message-ID). Klickt der Nutzer selbst auf „Ich habe mich beworben“, heißt der Status `applied_externally`.
3. **Halluzinationen im Anschreiben** sind das größte Reputationsrisiko für den Nutzer. Deshalb: Prompt mit „nur Fakten aus dem Profil“ + automatischer **Claim-Check**, der Skills im Anschreiben markiert, die nicht im Profil stehen.
4. **Massenbewerbungen schaden** (Spam-Wahrnehmung bei Recruitern). Defaults: Mindestscore 60, Tageslimit 10, Freigabe vor jeder Bewerbung.

## 3. Integrations-Matrix (ehrlich)

| Quelle | Status im MVP | Voraussetzung |
|---|---|---|
| Bundesagentur für Arbeit – Jobsuche API | ✅ implementiert | Öffentliche API, kein Key (Client-ID `jobboerse-jobsuche`) |
| Arbeitnow (DE/EU + Remote) | ✅ implementiert | Öffentlicher Feed, kein Key |
| Greenhouse Job Board API | ✅ implementiert | Board-Token der Wunschfirma (z. B. `stripe`) |
| Lever Postings API | ✅ implementiert | Firmen-Slug (z. B. `plaid`) |
| Remotive (Remote weltweit) | ✅ implementiert | Kein Key; AGB: Quelle verlinken, max. ~4 Abrufe/Tag |
| Adzuna (16 Länder) | ✅ implementiert, inaktiv ohne Key | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` (kostenlos) |
| Google Jobs via SerpAPI | ✅ implementiert, inaktiv ohne Key | `SERPAPI_KEY` (kostenpflichtig) |
| Indeed | ❌ | Publisher-API eingestellt; nur Partnerprogramme |
| LinkedIn Jobs | ❌ | Job-Search-API nur für Partner (Talent Solutions) |
| Glassdoor, StepStone, Xing, Monster, ZipRecruiter | ❌ | Keine öffentliche Such-API; nur Partner-/Feed-Verträge. Viele Stellen erscheinen aber über Google Jobs (SerpAPI) |
| Workday-Portale | ⏳ Phase 4 | Kein offizielles öffentliches API; nur per Extension im Nutzer-Browser |
| Direkte Karriereseiten | ⏳ Phase 2 | schema.org `JobPosting` (JSON-LD) aus vom Nutzer eingetragenen URLs, robots.txt beachten |
| OpenAI / Anthropic | ✅ implementiert | `OPENAI_API_KEY` oder `ANTHROPIC_API_KEY`. Ohne Key: CV-Analyse per Heuristik (gekennzeichnet), Anschreiben deaktiviert |
| Gmail / Outlook | ⏳ Phase 3 | Google OAuth (Scope `gmail.readonly` + `gmail.send` → Google-Sicherheitsprüfung nötig), Microsoft Graph |
| Stripe | ⏳ Phase 2 | `STRIPE_SECRET_KEY`, Webhook-Secret |

## 4. Architektur

```
Browser ──► Next.js 16 (App Router, Server Components, Server Actions)
              │  src/app/(app)/*      UI (Dashboard, CV, Loops, Matches, Bewerbungen)
              │  src/lib/auth         Sessions (DB, httpOnly-Cookie), bcrypt
              │  src/lib/cv           PDF/DOCX → Text → Profil (KI oder Heuristik)
              │  src/lib/jobs         Quellen-Adapter → normalisierter Job → Dedupe
              │  src/lib/matching     Score 0–100 + Begründung
              │  src/lib/agent        runLoop(): Suche → Match → Entwurf → Freigabe
              │  src/lib/ai           Provider-Abstraktion (OpenAI / Anthropic)
              ▼
         PostgreSQL (Drizzle ORM)  ◄── Worker (pg-boss, Cron 06:00 täglich)
         Storage (CV-Dateien AES-256-GCM verschlüsselt)
```

**Warum so:** Ein Deployable (Next.js) + ein Worker-Prozess + Postgres. Die Queue (pg-boss) läuft in Postgres → kein Redis nötig. n8n ist für das MVP nicht erforderlich; Workflows sind typisierter TypeScript-Code und testbar.

## 5. Datenbank (Kurzfassung, Details in `src/db/schema.ts`)

| Tabelle | Zweck |
|---|---|
| `users` | Konto, Sprache, Plan (free/pro/premium) |
| `sessions` | Session-Token (nur SHA-256-Hash gespeichert) |
| `cv_documents` | Hochgeladene Datei (verschlüsselt), extrahierter Text, Parse-Status |
| `profiles` | Strukturiertes Profil (Skills, Erfahrung, Ausbildung, Sprachen); mehrere pro Nutzer (Premium) |
| `loops` | Such-Agent: Titel, Orte, Länder, Remote, Quellen, Mindestscore, Tageslimit, Modus, Firmen-Listen |
| `jobs` | Normalisierte Stellen, eindeutig je `(source, external_id)`, plus `dedupe_hash` quellenübergreifend |
| `matches` | Job ↔ Nutzer mit Score, Aufschlüsselung, Status; eindeutig je `(user, job)` |
| `applications` | Bewerbung mit Anschreiben, Status, Kanal, Bestätigung; eindeutig je `(user, job)` → keine Doppelbewerbung |
| `application_events` | Lückenlose Status-Historie (wer, wann, von → nach) |
| `agent_runs` | Protokoll jedes Agent-Laufs (gefunden, neu, gematcht, ausgeschlossen, Fehler) |
| `notifications` | In-App-Benachrichtigungen |
| `usage_counters` | Plan-Limits (Anschreiben/Monat, Läufe/Tag) |
| `audit_logs` | Sicherheitsrelevante Aktionen (Login, Upload, Freigabe, Export, Löschung) |

### Bewerbungs-Statusmodell

```
draft → pending_approval → approved → submitted (nur mit Kanal-Bestätigung)
                    │            └──→ applied_externally (Nutzer bestätigt manuell)
                    └→ withdrawn
submitted | applied_externally → interview → offer
                               → rejected
```

## 6. Sicherheit & DSGVO (umgesetzt)

- Passwörter bcrypt (Kosten 12), Session-Token 256 Bit, in DB nur Hash, Cookie `httpOnly`, `SameSite=Lax`, `Secure` in Produktion
- Login-Rate-Limit (pro E-Mail + IP), Audit-Log für sicherheitsrelevante Aktionen
- CV-Dateien AES-256-GCM verschlüsselt auf Disk (`FILE_ENCRYPTION_KEY`)
- Datenexport (Art. 20) als JSON, Konto-Löschung (Art. 17) inkl. Dateien
- Externe Aktionen nur mit Freigabe; KI erhält nur Profil + Stellentext

## 7. Roadmap

| Phase | Inhalt | Status |
|---|---|---|
| **1 – MVP** | Auth, CV-Upload & Analyse, Profil-Editor, Loops, 7 Job-Quellen, Matching, KI-Anschreiben mit Claim-Check, Freigabe-Workflow, Dashboard, Benachrichtigungen, i18n (DE/EN/FR/ES/AR + RTL), Dark Mode, Export/Löschung, Tests | ✅ |
| 2 – Monetarisierung & Qualität | Stripe-Abos, Google-OAuth-Login, KI-Re-Ranking der Top-Matches, Karriereseiten via JSON-LD, CV-Tailoring (wahrheitsgetreu, Diff-Ansicht), PDF-Export Anschreiben, E-Mail-Benachrichtigungen | offen |
| 3 – E-Mail-Assistent | Gmail/Outlook-Anbindung, Antworten erkennen & Bewerbungen zuordnen, Interview-Erkennung, Antwortentwürfe, E-Mail-Bewerbung an veröffentlichte Adressen mit Freigabe (→ echter `submitted`-Status) | offen |
| 4 – Browser-Extension | Formular-Autofill (Workday, Greenhouse, Lever, LinkedIn Easy Apply) im Browser des Nutzers, Nutzer klickt selbst „Absenden“, Bestätigungsseite wird erfasst | offen |
| 5 – Scale | Objekt-Storage (S3) statt Disk, Monitoring, Admin-Bereich, B2B (Coaches/Unis) | offen |
