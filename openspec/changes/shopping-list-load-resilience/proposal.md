## Why

Am 16.10.2026 war die geteilte Einkaufsliste von 17:49 bis 18:46 Uhr (57 min) nur eingeschränkt nutzbar: Cloud Run wies 236 von 1.114 Backend-Requests (21,2 %) mit HTTP 429 ab, 92 Listen-Abrufe dauerten über 30 s (max. 68,8 s). Auslöser waren 3 Geräte, die bei jeder Änderung die komplette Liste (527 KB, 5–9 s Rechenzeit) neu luden, auf nur 2 gleichzeitigen Request-Slots. `stable-backend-capacity` (PR #32, gemergt) hat die Last an der Wurzel entschärft: Der Einkaufsmodus läuft auf dem kompakten `board`-Endpunkt, dessen Antwort pro Listenstand gecacht wird, und die Warnungen sind aus der Detailantwort entfernt. Offen bleiben das Verhalten des Clients unter Überlast, die fehlende Lastprobe und der ungeschützte Umgang mit manuellen Deploys.

## What Changes

- **Überlast-tolerante Clients:** Abrufe und idempotente Änderungen (Abhaken, Übernehmen) werden bei 429/503 mit Backoff wiederholt, die Liste bleibt mit dem letzten Stand sichtbar, der Pulse verlängert seinen Takt bei Fehlern. Eine verständliche Meldung ersetzt die Fehlerseite.
- **Kein WebSocket-Versuch ohne Endpunkt:** Produktion bedient keine WebSockets; der Client verbindet dort nicht.
- **Lastprobe:** Ein wiederholbares Skript simuliert ein Gruppeneinkauf-Szenario (6 Geräte, Pulse alle 5 s, 1 Abhaken alle 10 s, 10 min) im Einkaufsmodus (Pulse, dann `board`). Kapazitätsänderungen und Release-Kandidaten sind erst nach bestandener Probe freigegeben.
- **Deploy-Preflight für manuelle Hotfixes:** Der Deploy-Skill prüft vor jedem manuellen Deploy laufende CI-Deploys, Abweichung von `origin/main` und junge Revisionen, damit sich Hotfixes nicht gegenseitig überschreiben.
- **Entfallen gegenüber dem ersten Entwurf:** Delta-Sync (`changes`-Endpunkt) und die schlanke Detailantwort. Das Board ist die kompakte Antwort, wird pro Listenstand nur einmal berechnet und alle Geräte teilen sich das Ergebnis; die Detailantwort wird nur noch im Planungsmodus geladen. Beides wird nur wieder aufgegriffen, wenn die Lastprobe es verlangt.
- Nicht Teil dieses Changes (liegt in `stable-backend-capacity`): Concurrency, Instanzen, Warm-Fenster, DB-Tier, Alerts, Warnungs-Endpunkt, Board-Endpunkt, PDF-Semaphore, Kaltstart.

## Capabilities

### New Capabilities

### Modified Capabilities
- `shopping-list-sharing`: neue Anforderungen für überlast-tolerante Abfragen und Verzicht auf WebSocket-Versuche in Produktion
- `food-runtime-capacity`: neue Anforderung für eine wiederholbare Lastprobe mit Abnahmekriterien
- `cloud-run-deploy`: neue Anforderung für einen Preflight vor manuellen Deploys

## Impact

- Frontend `frontend-food`: `src/lib/queryRetry.ts`, `src/lib/api.ts`, `src/main.tsx` (Retry-Regel), `src/api/shoppingLists.ts` (Pulse-Takt bei Fehlern, idempotente Mutationen), `src/hooks/useShoppingListWebSocket.ts`, `ShoppingListDetailPage.tsx` und `ShoppingBoardView.tsx` (Hinweisband).
- Neues Skript `scripts/loadtest/shopping_group.py`, Befehl `seed_loadtest_shopping_list`, `.claude/skills/deploy/` (Preflight).
- Keine API-Änderung, keine Migrationen, keine Infrastruktur-Änderung.
