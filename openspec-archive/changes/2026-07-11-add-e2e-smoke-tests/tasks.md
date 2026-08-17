## 1. e2e/ Verzeichnisstruktur und Konfiguration

- [x] 1.1 `e2e/` Ordner anlegen mit `.gitignore` (ignoriert `output/`, `node_modules/`, `test-results/`)
- [x] 1.2 `e2e/package.json` erstellen mit `@playwright/test` als Dev-Dependency und `test` Script
- [x] 1.3 `e2e/playwright.config.ts` erstellen: baseURLs, Viewport 375x812, Screenshot-Mode `on`, Output-Verzeichnis `output/screenshots/`, Timeout 30s

## 2. Orchestrierungs-Script

- [x] 2.1 `e2e/smoke-test.sh` erstellen mit Shebang, `set -euo pipefail`, Trap für Cleanup
- [x] 2.2 DB-Check: `podman compose up -d db` nur wenn Container nicht läuft; `uv run python manage.py migrate` und `uv run python manage.py add_users --if-empty`
- [x] 2.3 Server-Start: Backend auf 8000, Frontend auf 5173, Food-Frontend auf 5174, jeweils mit stdout/stderr in Log-Dateien
- [x] 2.4 Health-Check: Warten bis alle drei Server antworten (curl mit Retry, Timeout 30s)
- [x] 2.5 Playwright ausführen: `cd e2e && npx playwright test` mit Exit-Code-Weitergabe
- [x] 2.6 Server-Cleanup: Alle Kind-Prozesse killen (im Trap, auch bei Fehler)
- [x] 2.7 Log-Prüfung: `grep -E "ERROR|500|Traceback|ECONNREFUSED" e2e/output/*.log` und Exit 1 bei Treffern

## 3. Playwright Test-Spezifikationen

- [x] 3.1 `e2e/tests/public.spec.ts`: Homepage (5173), Recipe-Liste (5174), Recipe-Detail, Search, Blog-Liste — jeweils mit Screenshot (viewport + fullPage) und Console-Error-Check
- [x] 3.2 `e2e/tests/auth.spec.ts`: CSRF-Token via API, Login via UI-Formular, `/auth/me/` Check — mit Screenshot nach Login
- [x] 3.3 `e2e/tests/authenticated.spec.ts`: My-Dashboard (5173), My-Recipes (5174), Meal-Plans-App (5174) — mit Screenshot und Auth-Context (session Cookie aus auth.spec.ts)

## 4. Makefile-Integration

- [x] 4.1 `make smoke-test` Target im `Makefile` hinzufügen, das `e2e/smoke-test.sh` aufruft
- [x] 4.2 Target in der `help`-Sektion dokumentieren: `smoke-test: ## Run Playwright end-to-end smoke tests`

## 5. Verifikation

- [x] 5.1 `npx playwright install` im `e2e/` Verzeichnis ausführen (Chromium-Browser)
- [x] 5.2 `make smoke-test` ausführen und prüfen dass alle Tests grün sind
- [x] 5.3 Screenshots in `e2e/output/screenshots/` auf Vollständigkeit prüfen
- [x] 5.4 Log-Dateien in `e2e/output/` auf erwartete Inhalte prüfen (keine False-Positives)
