## Context

Befunde aus den Cloud-Run-Logs vom 16.10.2026 (Details im Incident-Bericht „Einkaufsliste-Ausfall am 16.10.2026“):

- Lastprofil: 3 Geräte, 19–20 Requests/min, davon 64 % Pulse (0,12 s im Schnitt), 21 % Listen-Abrufe (`GET /api/shopping-lists/13/`, 94 % der Rechenzeit), 8 % Abhaken.
- Jede Änderung ändert den Stempel; alle Geräte laden daraufhin die komplette Liste: 527 KB, Median 9,2 s vor und 4,8 s nach `13eef0ca`. Zwei Slots (2 Instanzen × Concurrency 1) sind damit für 3 × 5–9 s blockiert.
- Bei 429 hat der Client nichts wiederholt: `frontend-food/src/main.tsx` wiederholt nur Fehler außerhalb 4xx, ein 429 wird sofort zum Fehler. Der Pulse (`retry: false`) fragt weiter alle 5 s und verschärft die Überlast.
- `ShoppingListItemOut` trägt je Eintrag `sources`, `portion_options`, `package_options` und `start_unit`. Die Aufteilung der 527 KB auf Felder ist nicht gemessen.
- Die Pulse-Antwort enthält nur `stamp` (`schemas.ShoppingListPulseOut`); der Stempel verkettet `updated_at` der Liste, Anzahl, abgehakte Anzahl, `max(updated_at)` der Einträge und die Zahl der Mitglieder.
- Produktion bedient keine WebSockets (gunicorn/WSGI). Der Client prüft das nicht; in den Request-Logs der Nacht gibt es keinen `/ws/`-Eintrag, ob Handshakes dennoch am Frontend-Nginx scheitern, ist ungeprüft.
- Manuelle Hotfixes (Concurrency 8, Polling 15/20 s, Revisionen `00109`–`00111`) wurden innerhalb von 10 Minuten durch CI-Deploys von `main` überschrieben. In der Zeit deployten zwei Sessions parallel.
- Es gibt keine Staging-Umgebung und keine Lastprobe; Kapazitätswerte waren Annahmen.
- `stable-backend-capacity` (Branch `claude/stable-shopping-capacity`, nicht gemergt) deckt Concurrency 4/Threads 4/max 3, Warm-Fenster 16–22 Uhr, DB-Tier, Alerts, PDF-Semaphore, Warnungs-Endpunkt und Kaltstart ab. Dieser Change ergänzt nur die Lücken und ändert keine Datei der Infrastruktur.

## Goals / Non-Goals

**Goals:**
- Eine Änderung eines Geräts kostet die anderen Geräte höchstens eine kleine Anfrage (Ziel: unter 0,3 s Serverzeit, unter 10 KB), nicht den Vollabruf.
- Der Vollabruf bleibt möglich, ist kleiner und braucht je Eintrag höchstens 4 KB (Startwert, nach Messung angepasst).
- Unter Überlast sieht die Nutzerin die Liste weiter, bekommt eine verständliche Meldung, und die Clients verschärfen die Überlast nicht.
- Kapazitätsannahmen sind messbar belegt, bevor ein Gruppeneinkauf stattfindet.
- Hotfixes überschreiben sich nicht mehr unbemerkt.

**Non-Goals:**
- WebSockets in Produktion bereitstellen (ASGI-Umbau); Polling bleibt der Mechanismus.
- Concurrency, Instanzen, Warm-Fenster, DB-Tier, Alerts (liegen in `stable-backend-capacity`).
- Neue Staging-Umgebung.
- Serverseitiges Löschen-Tracking (Tombstones) für Einträge.

## Decisions

### 1. Inkrementeller Abgleich statt Vollabruf
`GET /api/shopping-lists/{id}/pulse/` liefert zusätzlich `items_count: int` und `items_latest: str | null` (ISO-Zeitstempel des jüngsten `updated_at`, Mikrosekunden); `stamp` bleibt unverändert. Neu: `GET /api/shopping-lists/{id}/changes/?since=<items_latest>` liefert `{stamp, items_count, items_latest, items: [ShoppingListItemOut]}` mit allen Einträgen, deren `updated_at >= since` ist (`>=`, damit Einträge mit gleichem Zeitstempel nicht verloren gehen; das Zusammenführen ist idempotent). Rechte wie beim Detail (Mitglieder, Gäste mit `X-Guest-Token`).

Client-Ablauf bei abweichendem Stempel:
1. Weicht nur `items_latest` oder `items_count` vom geladenen Stand ab, während Mitgliederzahl und Listenanteil des Stempels gleich bleiben, ruft der Client `changes` auf.
2. Er ersetzt oder ergänzt die zurückgegebenen Einträge im Cache nach `id`, sortiert nach `sort_order` und setzt `stamp` des Caches auf den Wert der Antwort.
3. Stimmt die Zahl der Einträge im Cache danach nicht mit `items_count` überein (Eintrag wurde gelöscht), lädt er die Liste voll.
4. Abweichungen bei Mitgliedern, Gästen, Listenname oder Quellenstatus lösen immer den Vollabruf aus.
5. Zusätzlich lädt der Client bei Rückkehr in den Tab und höchstens alle 5 Minuten die Liste voll, damit verpasste Löschungen nicht stehen bleiben.

Die Listenzähler (`checked_count`) bildet das Frontend aus den Einträgen; die Detailantwort hat keine weiteren eintragsabhängigen Listenfelder außer `stamp`, `updated_at`, `source_status` und `source_updated_at`, die nur beim Vollabruf wechseln.

*Alternativen:* ETag/304 auf dem Detail (spart Bytes, nicht die 5–9 s Rechenzeit, weil der Server die Antwort zum Vergleichen bauen muss); WebSocket-Push (braucht ASGI, Non-Goal); Tombstone-Tabelle für Löschungen (mehr Schema für einen seltenen Fall; der Vollabruf als Rückfall genügt).

### 2. Antwortgröße: erst messen, dann kürzen
Aufgabe 1 misst die Aufteilung der Referenzliste (Liste 13 vom 16.10.): Bytes je Feld und Eintrag, Anzahl der Einträge, ob die Antwort komprimiert ausgeliefert wird. Danach in dieser Reihenfolge, bis das Budget erreicht ist:
1. Kompression prüfen und, falls nicht aktiv, am Frontend-Nginx einschalten (Text/JSON, `gzip_min_length` 1 KB).
2. `portion_options` und `package_options` nur im Mengen-Dialog laden: `GET /api/shopping-lists/{id}/items/{item_id}/options/` (gleiche Rechte wie `PATCH`), im Detail entfallen sie.
3. `sources` auf die für die Liste angezeigten Felder kürzen, volle Quellen beim Aufklappen laden.

Das Budget ist ein Test: Eine Fixture-Liste mit 50 Einträgen (Rezept- und Essensplan-Quellen, Portionen, Packungen) darf höchstens 4 KB × 50 = 200 KB JSON ergeben. Der Wert 4 KB ist ein Startwert aus der Beobachtung (527 KB bei einer Liste, deren Eintragszahl nicht protokolliert wurde) und wird nach Aufgabe 1.1 festgelegt.

### 3. Überlast-tolerante Clients
- `main.tsx`: Die Retry-Regel behandelt 429 und 503 als vorübergehend: bis zu 3 Wiederholungen mit 1 s, 2 s, 4 s plus Zufallsanteil bis 500 ms; `Retry-After` hat Vorrang, wenn vorhanden. Andere 4xx bleiben ohne Wiederholung.
- Mutationen: Nur idempotente Aufrufe (`PATCH …/items/{id}/` mit explizitem `is_checked` oder `claimed`) wiederholen automatisch. `POST` (Eintrag anlegen) wiederholt nicht, damit kein Eintrag doppelt entsteht; die Nutzerin sieht „Nochmal versuchen“.
- Pulse: bei 429/5xx verdoppelt sich der Takt bis höchstens 60 s, nach dem ersten Erfolg zurück auf den normalen Takt.
- Anzeige: Schlägt ein Abruf nach den Wiederholungen fehl, bleibt die Liste mit dem letzten Stand sichtbar, ein Hinweisband zeigt „Gerade sind viele gleichzeitig dabei. Wir versuchen es gleich nochmal.“ und verschwindet nach dem nächsten Erfolg. Die Fehlerseite erscheint nur, wenn noch gar keine Liste geladen wurde.

### 4. WebSocket-Client in Produktion aus
`useShoppingListWebSocket` verbindet nur, wenn `import.meta.env.VITE_SHOPPING_WEBSOCKET === 'true'` gesetzt ist (Standard: aus; lokale Entwicklung mit ASGI kann es einschalten). Damit sind der `socketConnected`-Zweig im Pulse-Takt und die Reconnect-Versuche in Produktion tot. Aufgabe 6.1 prüft zuerst, ob Handshakes am Frontend-Nginx tatsächlich scheitern; ist das nicht der Fall, bleibt die Entscheidung trotzdem gültig, weil sie das Verhalten explizit macht.

### 5. Lastprobe
Skript `scripts/loadtest/shopping_group.py` (Python, nur Standardbibliothek plus `httpx`, `uv run`): meldet N Gäste über einen Einladungslink an, jeder Gast ruft den Pulse im aktiven Takt ab, bei geänderter Marke den `changes`-Endpunkt (bzw. das Detail als Rückfall), und ein Gast hakt alle 10 s einen Eintrag ab. Ausgabe: Requests, Statuscodes, p50/p95/max je Endpunkt, Anzahl 429.

Zielumgebung ist ein produktionsnaher lokaler Stack: `Dockerfile.backend` mit den Laufzeitlimits aus `deploy.yml` (Gunicorn-Werte, 1 vCPU/1 GiB per Container-Limit) und Postgres mit einer Kopie der Listen-Fixture. Produktion nur außerhalb der Nutzungszeit und nur nach ausdrücklichem OK. Abnahme (Startwerte aus dem Vorfall: 6 Geräte statt 3, 5-s-Pulse, 1 Abhaken je 10 s, 10 Minuten): 0 × 429, p95 des Abgleichs unter 1 s, p95 des Vollabrufs unter 3 s.

*Alternative:* Staging-Service in Cloud Run (ein zweiter Service plus Datenbank kostet laufend und driftet von Produktion ab; Non-Goal).

### 6. Preflight für manuelle Deploys
Der Deploy-Skill (`.claude/skills/deploy/SKILL.md`) bekommt einen Schritt vor jedem manuellen Backend- oder Frontend-Deploy mit `gcloud`:
1. `gh run list --workflow deploy.yml --status in_progress,queued`: läuft oder wartet ein CI-Deploy, wird gewarnt, dass er die manuellen Werte überschreibt.
2. `git rev-parse HEAD` gegen `git rev-parse origin/main`: weicht der Stand ab, wird gewarnt und der Rückweg „Fix nach `main`, CI deployt“ genannt.
3. `gcloud run revisions list --limit 5 --format` mit Ersteller und Zeit: eine Revision einer anderen Quelle in den letzten 15 Minuten wird gemeldet.
4. Betrifft die Änderung Scaling oder Gunicorn-Werte, wird auf die vier Dateien verwiesen, die gemeinsam zu ändern sind (`deploy.yml`, `Dockerfile.backend`, Terraform, `Makefile`; `test_runtime_limits` erzwingt das).
Der Skill bricht nicht ab, sondern verlangt eine ausdrückliche Bestätigung.

## Risks / Trade-offs

- [Lokale Zusammenführung zeigt einen veralteten Zustand, wenn eine Änderung zwischen Pulse und `changes` eintrifft] → `changes` liefert `stamp` und `items_count` des Antwortzeitpunkts; stimmt die Eintragszahl nicht, folgt der Vollabruf, und der nächste Pulse gleicht ohnehin ab.
- [Gelöschter Eintrag mit gleichzeitig hinzugefügtem Eintrag ergibt dieselbe Anzahl] → Dann bleibt der gelöschte Eintrag lokal sichtbar, bis ein Vollabruf stattfindet. Abhilfe: Der Vollabruf läuft zusätzlich alle 5 Minuten und bei Rückkehr in den Tab. Löschungen gelten als selten.
- [Wiederholungen erhöhen die Last bei Überlast] → Backoff mit Zufall, höchstens 3 Wiederholungen, der Pulse bremst seinen Takt; zusammen ist die Last bei Überlast geringer als heute.
- [Größenbudget bricht bestehende Anzeigen] → Felder werden erst entfernt, wenn der Nachlade-Weg steht; Zod-Schema und Pydantic-Schema ändern sich gemeinsam, Tests der Detailseite decken Mengen-Dialog und Quellen ab.
- [Lokale Lastprobe bildet Cloud Run nur grob ab] → Sie belegt das Verhältnis von Last zu Slots, nicht absolute Zeiten. Absolute Werte bleiben aus den Cloud-Run-Logs beobachtbar; eine Probe in Produktion braucht ein OK.
- [Überschneidung mit `stable-backend-capacity`] → Reihenfolge festgelegt: erst dieser Branch nach `main`, dann Rebase; die gemeinsamen Dateien sind im Proposal benannt.

## Migration Plan

1. `stable-backend-capacity` nach `main` bringen (eigene Verantwortung), dann diesen Change rebasen.
2. Backend zuerst: Pulse-Felder und `changes` sind additiv; alte Frontends ignorieren sie.
3. Frontend danach: Abgleich, Backoff, WebSocket-Schalter, Zod-Schemas.
4. Größenbudget in zwei Schritten: Messung und Nginx-Kompression, dann Nachladen der Optionen.
5. Lastprobe lokal ausführen und das Ergebnis in den Pull Request schreiben.
Rollback: Revert des Merge-Commits; keine Daten und keine Infrastruktur betroffen.

## Open Questions

- Wie viele Einträge hatte Liste 13 am 16.10. (527 KB, Schlüssel für das Größenbudget)?
- Läuft Kompression bereits am Frontend-Nginx oder am Backend?
- Reicht der Vollabruf bei Rückkehr in den Tab, oder soll der 5-Minuten-Vollabruf bleiben (Kosten: 1 Vollabruf je Gerät und 5 Minuten)?
