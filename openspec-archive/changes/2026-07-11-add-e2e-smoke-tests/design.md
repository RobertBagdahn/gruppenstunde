## Context

Das Projekt Inspi hat derzeit keine automatisierten Browser-Tests. Die einzigen existierenden Tests sind Vitest+RTL Unit-Tests mit gemocktem `fetch`. Entwickler müssen nach Änderungen manuell durch die App klicken, um Regressionen zu erkennen.

Die App besteht aus drei Laufzeit-Komponenten die lokal gestartet werden:
- **PostgreSQL DB** (podman, Port 5432) — Datenhaltung
- **Django Backend** (uv run, Port 8000) — REST API
- **Vite Frontends** (npm, Ports 5173/5174) — React SPAs

Seed-User mit bekannten Credentials existieren via `add_users` Management Command (`admin/admin`, `user/user`, etc.).

## Goals / Non-Goals

**Goals:**
- Playwright-basierte Smoke-Tests für kritische Pfade (öffentliche Seiten, Auth, eingeloggte Bereiche)
- Automatische Screenshots jeder getesteten Seite (Viewport 375px + Full-Page)
- Server-Log-Überwachung mit Fehlererkennung (ERROR, 500, Traceback, ECONNREFUSED)
- Einfacher Einstieg: `make smoke-test` aus dem Repo-Root
- DB wird nur gesetzt wenn nötig (keine Zerstörung existierender Dev-Daten)
- Ausgabe-Verzeichnis ist gitignored

**Non-Goals:**
- Keine CI-Integration (Cloud Build) — erstmal nur lokal
- Keine visuellen Regression-Tests (Snapshot-Vergleich)
- Keine Performance-Tests
- Keine Accessibility-Tests (axe)
- Keine vollständigen User-Flows (Create-Recipe-Workflow, Event-Wizard etc.)
- Kein paralleles Testen beider Frontends gleichzeitig (sequentiell, um Port-Konflikte zu vermeiden)

## Decisions

### 1. Standalone `e2e/` Directory statt Einbettung in `frontend/`

**Begründung:** Smoke-Tests spannen beide Frontends + Backend. Ein eigener Ordner mit eigener `package.json` vermeidet Vermischung von Test-Deps mit App-Deps. Die `frontend/` und `frontend-food/` Pakete bleiben unberührt.

**Alternative verworfen:** Playwright in `frontend/devDependencies` — würde Food-Tests im Haupt-Frontend platzieren, was der strikten Trennung widerspricht.

### 2. Shell-Script + Makefile-Target (nicht nur Makefile)

**Begründung:** Die Orchestrierung (Server starten/stoppen, Ports prüfen, Logs greppen, Health-Checks) ist zu komplex für reines Make. Ein Shell-Script hält die Logik lesbar und testbar. Das Makefile-Target dient als konsistenter Einstiegspunkt.

**Alternative verworfen:** Reines Makefile-Target — sperrig für Error-Handling und Prozess-Management.

### 3. Viewport 375px + Full-Page Screenshots

**Begründung:** Viewport zeigt was Nutzer beim Laden sehen (Mobile-First). Full-Page zeigt Layout-Vollständigkeit. Beide zusammen geben ein vollständiges Bild ohne die Tests zu verlangsamen (Playwright macht Full-Page in einem Durchlauf).

### 4. Temporäre DB-Setup-Strategie (kein `reset-db`)

**Begründung:** Der Smoke-Test soll Entwickler-Workflows nicht stören. `add_users --if-empty` ist idempotent. Migrationen werden nur bei Bedarf ausgeführt. Die Tests prüfen ob die DB da ist und Seed-User existieren — falls ja, wird direkt getestet.

**Alternative verworfen:** `make reset-db` vor jedem Lauf — zerstört lokale Dev-Daten und dauert länger.

### 5. Playwright Test Runner (nicht Vitest + Playwright)

**Begründung:** `@playwright/test` ist der offizielle Test-Runner von Playwright mit integriertem Browser-Management, Screenshot-API, Fixtures und Reporter. Vitest mit Playwright-Integration wäre ein zusätzlicher Abstraktions-Layer ohne Mehrwert.

### 6. API-basierter Auth-Flow (nicht UI-Login-Formular)

**Begründung:** Für den Auth-Test ist ein direkter API-Call (`POST /api/auth/login/`) zuverlässiger und schneller als das Ausfüllen des Login-Formulars. Playwright's `request` API (`APIRequestContext`) wird für CSRF und Login genutzt, `page` (Browser) für UI-Tests.

### 7. Sequentielles Testen (nicht parallel)

**Begründung:** Beide Frontends teilen sich das Backend. Parallele Tests könnten Race-Conditions und schwer reproduzierbare Fehler verursachen. Sequentiell ist deterministisch und für einen Smoke-Test schnell genug.

### 8. Kein separater Test-DB-Container

**Begründung:** Ein zweiter PostgreSQL-Container würde die Komplexität erhöhen (anderer Port, eigenes Volume). Der Smoke-Test nutzt die existierende Dev-DB und fügt nur Seed-User hinzu.

## Risks / Trade-offs

- **[Risiko] Port-Konflikte**: Wenn Port 8000/5173/5174 bereits belegt sind, schlägt der Test fehl. → **Mitigation**: Script prüft Ports vor dem Start und gibt klare Fehlermeldung. `make kill-port` kann vorher manuell ausgeführt werden.
- **[Risiko] Seed-User nicht ausreichend**: Falls `add_users` nicht genug Daten für authentifizierte Seiten liefert. → **Mitigation**: Tests prüfen nur ob Seiten laden (keine Daten-Inhalte validieren). `--if-empty` stellt sicher, dass mindestens die 6 Seed-User existieren.
- **[Trade-off] Keine Content-Seeds**: `seed_all` wird nicht ausgeführt. Tests erwarten leere Listen-Zustände. → Akzeptiert für Smoke-Test; End-to-End-Flows mit Daten sind für spätere Erweiterung vorgesehen.
- **[Risiko] Langsame Kaltstarts**: Erstmaliger `npx playwright install` kann Minuten dauern. → **Mitigation**: In der README dokumentiert als einmaliger Setup-Schritt.

## Migration Plan

Keine Migration nötig — dies ist ein neues, isoliertes Feature.

1. `e2e/` Ordner und Dateien anlegen
2. `make smoke-test` Target zum Makefile hinzufügen
3. `npx playwright install` einmalig ausführen (Dokumentation)

Rollback: `e2e/` Ordner löschen, Makefile-Target entfernen.

## Open Questions

Keine — alle Design-Entscheidungen sind geklärt.
