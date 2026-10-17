## Why

Am 16.10.2026 war die geteilte Einkaufsliste von 17:49 bis 18:46 Uhr (57 min) nur eingeschränkt nutzbar: Cloud Run wies 236 von 1.114 Backend-Requests (21,2 %) mit HTTP 429 ab, 92 Listen-Abrufe dauerten über 30 s (max. 68,8 s). Auslöser waren 3 Geräte, die bei jeder Änderung die komplette Liste (527 KB, 5–9 s Rechenzeit) neu luden, auf nur 2 gleichzeitigen Request-Slots. Der Change `stable-backend-capacity` (Branch `claude/stable-shopping-capacity`) erhöht Kapazität, Warm-Fenster, Alerts und entfernt die Warnungen aus der Listenantwort. Er lässt aber vier Ursachen offen: die Last pro Änderung, die Antwortgröße, das Verhalten des Clients unter Überlast und das ungeprüfte Vertrauen in Kapazitätsänderungen.

## What Changes

- **Inkrementeller Abgleich:** Der Pulse liefert zusätzlich `items_count` und `items_latest`. Ändern sich nur Einträge, holt ein Gerät über den neuen Endpunkt `GET /api/shopping-lists/{id}/changes/?since=…` nur die geänderten Einträge und führt sie lokal zusammen, statt die ganze Liste neu zu laden. Bei Unstimmigkeit (Anzahl, Mitglieder, Löschung) bleibt der Vollabruf der Rückfall.
- **Schlanke Listenantwort:** Die Detailantwort bekommt ein Größenbudget je Eintrag. Zuerst wird gemessen, woraus die 527 KB bestehen; selten genutzte Felder (Portions- und Packungsoptionen) werden bei Bedarf nachgeladen, Kompression wird geprüft.
- **Überlast-tolerante Clients:** Abrufe und idempotente Änderungen (Abhaken, Übernehmen) werden bei 429/503 mit Backoff wiederholt, die Liste bleibt mit dem letzten Stand sichtbar, der Pulse verlängert seinen Takt bei Fehlern. Eine verständliche Meldung ersetzt die Fehlerseite.
- **Kein WebSocket-Versuch ohne Endpunkt:** Produktion bedient keine WebSockets; der Client verbindet dort nicht.
- **Lastprobe:** Ein wiederholbares Skript simuliert ein Gruppeneinkauf-Szenario (6 Geräte, Pulse alle 5 s, 1 Abhaken alle 10 s, 10 min) gegen einen produktionsnahen lokalen Stack. Kapazitätsänderungen und Release-Kandidaten sind erst nach bestandener Probe freigegeben.
- **Deploy-Preflight für manuelle Hotfixes:** Der Deploy-Skill prüft vor jedem manuellen Deploy laufende CI-Deploys, Abweichung von `origin/main` und Deploys aus anderen Sessions, damit sich Hotfixes nicht gegenseitig überschreiben.
- Nicht Teil dieses Changes (liegt in `stable-backend-capacity`): Concurrency, Instanzen, Warm-Fenster, DB-Tier, Alerts, Warnungs-Endpunkt, PDF-Semaphore, Kaltstart.

## Capabilities

### New Capabilities

### Modified Capabilities
- `shopping-list-sharing`: neue Anforderungen für inkrementellen Abgleich, überlast-tolerante Abfragen und Verzicht auf WebSocket-Versuche in Produktion
- `shopping-list`: neue Anforderung für eine schlanke, größenbegrenzte Listenantwort
- `food-runtime-capacity`: neue Anforderung für eine wiederholbare Lastprobe mit Abnahmekriterien
- `cloud-run-deploy`: neue Anforderung für einen Preflight vor manuellen Deploys

## Impact

- Backend `shopping`: `api.py` (neuer Endpunkt `changes`, erweiterter Pulse), `schemas.py` (`ShoppingListPulseOut`, `ShoppingListChangesOut`, schlankere `ShoppingListItemOut`), `services/pulse.py`, Tests (`test_sync.py`, Größenbudget).
- Frontend `frontend-food`: `src/api/shoppingLists.ts` (Zod-Schemas `ShoppingListPulseSchema` und `ShoppingListChangesSchema`, Hook `useShoppingListSync`, Backoff), `src/main.tsx` (Retry-Regel für 429/503), `src/hooks/useShoppingListWebSocket.ts`, `ShoppingListDetailPage.tsx`.
- Neues Skript `scripts/loadtest/shopping_group.py` samt Dokumentation; `.claude/skills/deploy/SKILL.md` (Preflight).
- Pydantic und Zod müssen synchron bleiben (Pulse, Changes, Item).
- Keine Migrationen. Keine Infrastruktur-Änderung.
- Abhängigkeit: `stable-backend-capacity` ändert dieselben Dateien (`shoppingLists.ts`, `ShoppingListDetailPage.tsx`, `ShoppingListDetailOut`). Dieser Change wird nach dessen Merge umgesetzt oder rebased.
