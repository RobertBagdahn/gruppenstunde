## Context

Befunde aus den Cloud-Run-Logs vom 16.10.2026 (Details im Incident-Bericht „Einkaufsliste-Ausfall am 16.10.2026“):

- Lastprofil: 3 Geräte, 19–20 Requests/min, davon 64 % Pulse (0,12 s im Schnitt), 21 % Listen-Abrufe (`GET /api/shopping-lists/13/`, 94 % der Rechenzeit), 8 % Abhaken.
- Jede Änderung ändert den Stempel; alle Geräte laden daraufhin die komplette Liste: 527 KB, Median 9,2 s vor und 4,8 s nach `13eef0ca`. Zwei Slots (2 Instanzen × Concurrency 1) sind damit für 3 × 5–9 s blockiert.
- Bei 429 hat der Client nichts wiederholt: `frontend-food/src/main.tsx` wiederholt nur Fehler außerhalb 4xx, ein 429 wird sofort zum Fehler. Der Pulse (`retry: false`) fragt weiter alle 5 s und verschärft die Überlast.
- Der Stempel (`services/pulse.py`) verkettet `updated_at` der Liste, Anzahl, abgehakte Anzahl, `max(updated_at)` der Einträge und die Zahl der Mitglieder; `GET /pulse/` liefert nur ihn.
- Produktion bedient keine WebSockets (gunicorn/WSGI). Der Client prüfte das nicht: Die Logs von `inspi-frontend-food` (16.10. 12:00 bis 17.10. 09:00 UTC) zeigen 196 Handshake-Versuche auf `/ws/shopping-lists/…/`, je Seitenaufruf 6 (1 plus 5 Wiederholungen im 3-s-Takt), alle mit 200, weil der Nginx den SPA-Fallback ausliefert. Im Backend kam kein `/ws/`-Request an; die Versuche kosteten dort keine Slots.
- Manuelle Hotfixes (Concurrency 8, Polling 15/20 s, Revisionen `00109`–`00111`) wurden innerhalb von 10 Minuten durch CI-Deploys von `main` überschrieben. In der Zeit deployten zwei Sessions parallel.
- Es gibt keine Staging-Umgebung und keine Lastprobe; Kapazitätswerte waren Annahmen.
- `stable-backend-capacity` (PR #32, gemergt am 17.10.2026) bringt `GET /shopping-lists/{id}/board/`: eine kompakte Antwort nur mit Zeilenfeldern (ohne Quellen, Optionen, Preise), pro Listenstand serverseitig gecacht (Schlüssel = Stempel, Betrachter-Rechte je Request abgeleitet). Der Einkaufsmodus lädt nur noch das Board; die volle Detailantwort wird im Planungsmodus geladen. `useShoppingListSync` lädt das Board bei geändertem Stempel neu. Alle Geräte teilen sich damit eine Berechnung je Änderung.
- Dieser Change ergänzt nur die Lücken und ändert keine Datei der Infrastruktur.

## Goals / Non-Goals

**Goals:**
- Unter Überlast sieht die Nutzerin die Liste weiter, bekommt eine verständliche Meldung, und die Clients verschärfen die Überlast nicht.
- Kapazitätsannahmen sind messbar belegt, bevor ein Gruppeneinkauf stattfindet.
- Hotfixes überschreiben sich nicht mehr unbemerkt.

**Non-Goals:**
- Delta-Sync und schlanke Detailantwort: entfallen, weil das Board (PR #32) beides für den Einkaufsmodus löst. Wieder aufgreifen, falls die Lastprobe (p95 Board-Abgleich unter 1 s) es verlangt.
- WebSockets in Produktion bereitstellen (ASGI-Umbau); Polling bleibt der Mechanismus.
- Concurrency, Instanzen, Warm-Fenster, DB-Tier, Alerts (liegen in `stable-backend-capacity`).
- Neue Staging-Umgebung.

## Decisions

### 1. Überlast-tolerante Clients
- `main.tsx`: Die Retry-Regel behandelt 429 und 503 als vorübergehend: bis zu 3 Wiederholungen mit 1 s, 2 s, 4 s plus Zufallsanteil bis 500 ms; `Retry-After` hat Vorrang, wenn vorhanden. Andere 4xx bleiben ohne Wiederholung.
- Mutationen: Nur idempotente Aufrufe (`PATCH …/items/{id}/` mit explizitem `is_checked` oder `claimed`) wiederholen automatisch. `POST` (Eintrag anlegen) wiederholt nicht, damit kein Eintrag doppelt entsteht; die Nutzerin sieht „Nochmal versuchen“.
- Pulse: bei 429/5xx verdoppelt sich der Takt bis höchstens 60 s, nach dem ersten Erfolg zurück auf den normalen Takt. Der Fehlerzähler liegt in `useShoppingListSync` und zählt aufeinanderfolgende Fehlschläge.
- Anzeige: Schlägt ein Abruf von Board oder Liste nach den Wiederholungen fehl, bleibt die Liste mit dem letzten Stand sichtbar, ein Hinweisband zeigt „Gerade sind viele gleichzeitig dabei. Wir versuchen es gleich nochmal.“ und verschwindet nach dem nächsten Erfolg. Die Fehlerseite erscheint nur, wenn noch gar keine Liste geladen wurde.

### 2. WebSocket-Client in Produktion aus
`useShoppingListWebSocket` verbindet nur, wenn `import.meta.env.VITE_SHOPPING_WEBSOCKET === 'true'` gesetzt ist (Standard: aus; lokale Entwicklung mit ASGI kann es einschalten). Damit sind der `socketConnected`-Zweig im Pulse-Takt und die Reconnect-Versuche in Produktion tot. Die Logs (siehe Context) bestätigen, dass die Handshakes nie ein Backend erreichen; die Entscheidung spart 5 sinnlose Requests je Seitenaufruf und macht das Verhalten explizit.

### 3. Lastprobe
Skript `scripts/loadtest/shopping_group.py` (Python, nur Standardbibliothek plus `httpx`, `uv run`): meldet N Gäste über einen Einladungslink an, jeder Gast ruft den Pulse im aktiven Takt ab, bei geänderter Marke das Board (Einkaufsmodus; `--mode detail` lädt die volle Liste als Vergleich), und ein Gast hakt alle 10 s einen Eintrag ab. Ausgabe: Requests, Statuscodes, p50/p95/max je Endpunkt, Anzahl 429.

Zielumgebung ist ein produktionsnaher lokaler Stack: `Dockerfile.backend` mit den Laufzeitlimits aus `deploy.yml` (Gunicorn-Werte, 1 vCPU/1 GiB per Container-Limit) und Postgres mit einer Kopie der Listen-Fixture. Produktion nur außerhalb der Nutzungszeit und nur nach ausdrücklichem OK. Abnahme (Startwerte aus dem Vorfall: 6 Geräte statt 3, 5-s-Pulse, 1 Abhaken je 10 s, 10 Minuten): 0 × 429, p95 des Board-Abgleichs unter 1 s, p95 des Vollabrufs unter 3 s.

*Alternative:* Staging-Service in Cloud Run (ein zweiter Service plus Datenbank kostet laufend und driftet von Produktion ab; Non-Goal).

### 4. Preflight für manuelle Deploys
Der Deploy-Skill (`.claude/skills/deploy/SKILL.md`) bekommt einen Schritt vor jedem manuellen Backend- oder Frontend-Deploy mit `gcloud`:
1. `gh run list --workflow deploy.yml --status in_progress,queued`: läuft oder wartet ein CI-Deploy, wird gewarnt, dass er die manuellen Werte überschreibt.
2. `git rev-parse HEAD` gegen `git rev-parse origin/main`: weicht der Stand ab, wird gewarnt und der Rückweg „Fix nach `main`, CI deployt“ genannt.
3. `gcloud run revisions list --limit 5 --format` mit Ersteller und Zeit: eine Revision einer anderen Quelle in den letzten 15 Minuten wird gemeldet.
4. Betrifft die Änderung Scaling oder Gunicorn-Werte, wird auf die vier Dateien verwiesen, die gemeinsam zu ändern sind (`deploy.yml`, `Dockerfile.backend`, Terraform, `Makefile`; `test_runtime_limits` erzwingt das).
Der Skill bricht nicht ab, sondern verlangt eine ausdrückliche Bestätigung.

## Risks / Trade-offs

- [Board-Cache gilt je Prozess: `settings` konfigurieren kein `CACHES`, Django nutzt `LocMemCache`; mit 2 Instanzen × 1 Worker berechnet jede Instanz ihr eigenes Board je Änderung] → Für die Last tragbar (1 Berechnung je Änderung und Instanz statt je Gerät); die Lastprobe zeigt es, ein gemeinsamer Cache ist nur bei Bedarf nötig.
- [Wiederholungen erhöhen die Last bei Überlast] → Backoff mit Zufall, höchstens 3 Wiederholungen, der Pulse bremst seinen Takt; zusammen ist die Last bei Überlast geringer als heute.
- [Lokale Lastprobe bildet Cloud Run nur grob ab] → Sie belegt das Verhältnis von Last zu Slots, nicht absolute Zeiten. Absolute Werte bleiben aus den Cloud-Run-Logs beobachtbar; eine Probe in Produktion braucht ein OK.

## Migration Plan

1. Frontend-Änderungen (Retry, Pulse-Takt, Hinweisband, WebSocket-Schalter) über `main`; keine API-Änderung, alte Backends bleiben kompatibel.
2. Lastprobe lokal gegen den Stand ausführen und das Ergebnis in den Pull Request schreiben.
3. Preflight gilt ab Merge für jeden manuellen Deploy.
Rollback: Revert des Merge-Commits; keine Daten und keine Infrastruktur betroffen.

## Open Questions

- Reicht der lokale Stack mit Fixture (ca. 1 KB je Eintrag), oder braucht die Probe eine Kopie der echten Liste 13, um das Board realistisch zu belasten?
