## 1. Abstimmung und Messung

- [ ] 1.1 Referenzliste vermessen: Eintragszahl von Liste 13, Bytes je Feld und Eintrag (`sources`, `portion_options`, `package_options`, `start_unit`), Kompression am Frontend-Nginx und Backend; Ergebnis und Budget (Startwert 4 KB je Eintrag) in `design.md` festhalten
- [ ] 1.2 Prüfen, ob `stable-backend-capacity` nach `main` gemerged ist; Branch rebasen, Konflikte in `shoppingLists.ts`, `ShoppingListDetailPage.tsx`, `ShoppingListDetailOut` lösen
- [ ] 1.3 Query-Count-Test `backend/shopping/tests/test_detail_queries.py` (Commit `3ceaa07d`, nur auf `claude/prod-error-1d4d51`) nach `main` holen oder mit Aufgabe 1.1 aus `stable-backend-capacity` zusammenführen, damit der Test nur einmal existiert

## 2. Backend: inkrementeller Abgleich

- [ ] 2.1 Tests zuerst (`backend/shopping/tests/test_sync.py`): Pulse liefert `items_count` und `items_latest`; `changes` liefert nur Einträge ab `since` (inklusive gleichem Zeitstempel); konstante Abfragezahl bei 5 und 50 Einträgen; Zugriff für Mitglied, Gast, fremden Gast (404), anonym (401)
- [ ] 2.2 `services/pulse.py`: `items_count` und `items_latest` in derselben Aggregatabfrage wie der Stempel berechnen
- [ ] 2.3 `schemas.py`: `ShoppingListPulseOut` erweitern, `ShoppingListChangesOut` anlegen (`stamp`, `items_count`, `items_latest`, `items`)
- [ ] 2.4 `api.py`: `GET /{id}/changes/` mit `since` (ISO, ungültig → 422), Prefetch wie in `ShoppingListDetailOut`, Zugriffsregeln wie Detail

## 3. Frontend: inkrementeller Abgleich

- [ ] 3.1 Zod: `ShoppingListPulseSchema` um `items_count` und `items_latest` erweitern, `ShoppingListChangesSchema` neu; synchron zu Pydantic
- [ ] 3.2 Tests zuerst (`shoppingListSync.test.ts`): Zusammenführen nach `id`, Sortierung nach `sort_order`, Rückfall auf Vollabruf bei abweichender Eintragszahl, bei Mitgliederwechsel, bei Listenname/Quellenstatus; Vollabruf bei Tab-Rückkehr und nach 5 Minuten
- [ ] 3.3 `useShoppingListSync`: bei Abweichung nur der Einträge `changes` aufrufen, Cache zusammenführen, Stempel des Caches setzen; sonst Vollabruf
- [ ] 3.4 Eigene Änderungen lösen weiterhin keinen zusätzlichen Abruf aus (bestehendes Verhalten durch Test absichern)

## 4. Frontend: Überlast-Toleranz und WebSocket-Schalter

- [ ] 4.1 Tests zuerst: Retry-Regel in `main.tsx` wiederholt 429/503 bis 3-mal mit 1/2/4 s plus Zufall und beachtet `Retry-After`, wiederholt 401/403/404/409/422 nicht
- [ ] 4.2 `ApiError` um `retryAfterSeconds` aus dem Header `Retry-After` ergänzen (heute nur aus dem JSON-Body)
- [ ] 4.3 `main.tsx`: Retry-Regel mit Backoff umsetzen
- [ ] 4.4 Mutationen: `PATCH` mit explizitem `is_checked` oder `claimed` wiederholt automatisch, `POST` nicht („Nochmal versuchen“-Aktion statt Wiederholung); Test gegen doppelte Einträge
- [ ] 4.5 Pulse: Takt bei 429/5xx verdoppeln bis 60 s, nach Erfolg zurücksetzen (`pulseIntervalMs` um einen Fehlerzähler erweitern, Test)
- [ ] 4.6 Hinweisband „Gerade sind viele gleichzeitig dabei. Wir versuchen es gleich nochmal.“ in `ShoppingListDetailPage.tsx`, Liste bleibt sichtbar; Fehlerseite nur ohne geladene Liste; UI-Test inklusive 320 px Breite
- [ ] 4.7 `useShoppingListWebSocket`: nur mit `VITE_SHOPPING_WEBSOCKET === 'true'` verbinden, Standard aus; `.env.example` und Test ergänzen
- [ ] 4.8 Prüfen, ob Handshakes zu `/ws/` am Frontend-Nginx scheitern (Cloud-Run-Logs `inspi-frontend-food`), Ergebnis in `design.md` vermerken

## 5. Schlanke Listenantwort

- [ ] 5.1 Test zuerst: Fixture-Liste mit 50 Einträgen (Rezept- und Essensplan-Quellen, Portionen, Packungen) bleibt unter dem Budget aus 1.1 (Startwert 200 KB JSON); Test für `GET …/items/{item_id}/options/` (Mitglied, Gast, fremder Gast, anonym)
- [ ] 5.2 Kompression am Frontend-Nginx aktivieren, falls 1.1 sie als fehlend zeigt (`gzip on`, JSON, `gzip_min_length 1k`); Test oder Prüfschritt mit `curl -H 'Accept-Encoding: gzip'`
- [ ] 5.3 Backend: `GET /api/shopping-lists/{id}/items/{item_id}/options/` anlegen; `portion_options` und `package_options` aus `ShoppingListItemOut` entfernen; Pydantic und Zod gemeinsam ändern
- [ ] 5.4 Frontend: Mengen-Dialog lädt Optionen beim Öffnen (TanStack-Query-Hook, Ladezustand), gleiche Vorauswahl wie zuvor; bestehende Dialog-Tests anpassen
- [ ] 5.5 Falls das Budget damit nicht erreicht ist: `sources` auf angezeigte Felder kürzen und beim Aufklappen laden; Budget in `design.md` nachtragen

## 6. Lastprobe

- [ ] 6.1 `scripts/loadtest/shopping_group.py`: Parameter `--devices`, `--pulse-interval`, `--check-interval`, `--duration`, `--base-url`, `--confirm-production`; Gäste über Einladungslink anlegen, Pulse, `changes`, Vollabruf, Abhaken; Ausgabe je Endpunkt, Exit-Code bei verletzter Schwelle
- [ ] 6.2 Lokalen Stack dokumentieren (`scripts/loadtest/README.md`): Container aus `Dockerfile.backend` mit Limits aus `deploy.yml`, Postgres, Fixture-Liste mit 50 Einträgen
- [ ] 6.3 Unit-Tests der Auswertung (Perzentile, Schwellen, Abbruch ohne `--confirm-production`)
- [ ] 6.4 Probe gegen den Stand vor diesem Change (nur Vollabruf) und danach laufen lassen; beide Ergebnisse in den Pull Request schreiben

## 7. Deploy-Preflight

- [ ] 7.1 `.claude/skills/deploy/SKILL.md`: Schritt „Preflight“ vor jedem manuellen Deploy (laufende CI, Abweichung von `origin/main`, Revisionen der letzten 15 Minuten, vier Dateien bei Scaling-Änderungen), Bestätigung bei jedem Befund
- [ ] 7.2 Preflight-Befehle als kurzes Skript unter `.claude/skills/deploy/` ablegen und im Skill referenzieren; mit einem laufenden und einem leeren Zustand ausprobieren

## 8. Verifikation und Rollout

- [ ] 8.1 `uv run pytest backend/shopping` und `uv run ruff check`/`ruff format --check`; Frontend: `npm run lint`, `npm run typecheck`, `npm test` in `frontend-food`
- [ ] 8.2 `openspec validate shopping-list-load-resilience`
- [ ] 8.3 Über `main` mergen, CI-Deploy abwarten (Backend zuerst, dann Frontend); Cloud-Run-Logs prüfen: keine 429, Pulse-Antworten mit `items_count`, `changes`-Aufrufe sichtbar, Listen-Vollabrufe pro Änderung gesunken
- [ ] 8.4 Beim nächsten Gruppeneinkauf Anteil der Vollabrufe an den Listen-Requests auswerten und mit 21 % (16.10.) vergleichen
