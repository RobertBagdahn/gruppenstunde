## Why

Das Projekt hat keine automatisierten Browser-Tests. Jeder Deploy und jede größere Änderung erfordert manuelles Durchklicken der App, um sicherzustellen, dass nichts kaputt gegangen ist. Ein Playwright-basierter Smoke-Test soll kritische Pfade automatisch prüfen — öffentliche Seiten, Auth-Flow und eingeloggte Bereiche — und dabei Screenshots sowie Log-Analyse liefern.

## What Changes

- Neuer `e2e/` Ordner an der Repo-Wurzel mit eigener `package.json` und Playwright-Konfiguration
- Playwright-Tests für öffentliche Seiten (Home, Recipes, Search, Blog), Auth-Flow (Login, Session) und eingeloggte Bereiche (My-Recipes, Dashboard)
- Automatische Screenshots (Viewport 375px + Full-Page) jeder getesteten Seite
- Log-Überwachung: Backend- und Frontend-Logs werden während des Tests mitgeschrieben und auf Fehler (ERROR, 500, Traceback, ECONNREFUSED) geprüft
- Neues `make smoke-test` Target, das DB sicherstellt, Server startet, Tests ausführt, Screenshots macht, Logs prüft und alles aufräumt
- Orchestrierungs-Script `e2e/smoke-test.sh`, das vom Makefile-Target aufgerufen wird

## Capabilities

### New Capabilities
- `e2e-smoke-tests`: Playwright-basierte Browser-Smoke-Tests mit Screenshot-Erstellung und Server-Log-Prüfung, ausgeführt über `make smoke-test`

### Modified Capabilities
_Keine — bestehende Specs werden nicht geändert._

## Impact

- **Neue Dateien**: `e2e/` (package.json, playwright.config.ts, smoke-test.sh, tests/*.spec.ts)
- **Geänderte Dateien**: `Makefile` (neues `smoke-test` Target)
- **Neue Abhängigkeit**: `@playwright/test` im `e2e/package.json`
- **Betroffene Systeme**: Podman (DB), Django runserver (Backend), Vite dev server (Frontends)
- **Keine Änderungen** an Backend-Code, Frontend-Code, Schemas oder Datenbank-Modellen
