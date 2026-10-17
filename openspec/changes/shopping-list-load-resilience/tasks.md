## 1. Retry bei Überlast

- [x] 1.1 Tests zuerst: Retry-Regel in `main.tsx` wiederholt 429 ohne `code` und 503 bis 3-mal mit 1/2/4 s plus Zufall und beachtet `Retry-After`, wiederholt 401/403/404/409/422 und 429 mit `code` (KI-Limits) nicht
- [x] 1.2 `ApiError` um `retryAfterHeaderSeconds` aus dem Header `Retry-After` ergänzen
- [x] 1.3 `main.tsx`: Retry-Regel mit Backoff umsetzen (`lib/queryRetry.ts`)

## 2. Überlast-Toleranz im Frontend

- [x] 2.1 Tests zuerst: Pulse-Takt verdoppelt sich bei aufeinanderfolgenden 429/5xx bis 60 s und kehrt nach Erfolg zurück
- [x] 2.2 `useShoppingListSync`: Fehlerzähler und Takt (`pulseIntervalMs` um die Fehlerzahl erweitern)
- [x] 2.3 Mutationen: `PATCH` mit explizitem `is_checked` oder `claimed` wiederholt automatisch, `POST` nicht; Test gegen doppelte Einträge
- [x] 2.4 Hinweisband „Gerade sind viele gleichzeitig dabei. Wir versuchen es gleich nochmal.“ in Einkaufsmodus (`ShoppingBoardView`) und Planungsmodus; Liste bleibt sichtbar, Fehlerseite nur ohne geladene Daten; UI-Test (Einkaufsmodus; die Planungsansicht nutzt dieselbe Komponente `OverloadNotice` ohne eigenen Seitentest)
- [x] 2.5 `useShoppingListWebSocket`: nur mit `VITE_SHOPPING_WEBSOCKET === 'true'` verbinden, Standard aus; `.env.example` und Test ergänzen
- [x] 2.6 Handshakes zu `/ws/` in den Logs von `inspi-frontend-food` geprüft: 196 Versuche, alle 200 (SPA-Fallback), keiner im Backend; in `design.md` vermerkt
- [x] 2.7 Board-Modus bleibt vollständig: Der Detail-Dialog (Augen-Knopf, `GET …/items/{id}/`) zeigt alle Portionen, Mengen je Herkunft mit Rezept-Link, Packungsbedarf, Reserve und natürliche Einheit mit denselben Formatierern wie die volle Zeile; Tests in `ShoppingBoardView.test.tsx`
- [x] 2.8 Board-Lücken aus PR #32 schließen: „Wer hakt gerade ab“ kam nur über WebSocket-Ereignisse (`recentChecker`, ohne Socket nie gesetzt); das Board zeigt den Abhaker dauerhaft als „abgehakt von …“. Rückgängig nach dem Löschen im Board umgesetzt (voller Eintrag wird vor dem Löschen geholt), mit zwei Seitentests

## 3. Lastprobe

- [x] 3.1 `scripts/loadtest/shopping_group.py`: Parameter `--devices`, `--pulse-interval`, `--check-interval`, `--duration`, `--base-url`, `--confirm-production`; Gäste über Einladungslink anlegen, Pulse, Abhaken, Exit-Code bei verletzter Schwelle
- [x] 3.2 Lokalen Stack dokumentieren (`scripts/loadtest/README.md`) und Fixture über `seed_loadtest_shopping_list`
- [x] 3.3 Unit-Tests der Auswertung (Perzentile, Schwellen, Abbruch ohne `--confirm-production`)
- [x] 3.4 Einkaufsmodus abbilden: `--mode board` (Standard; Pulse, dann `GET …/board/`) und `--mode detail` (volle Liste); Label `sync_board`, Schwelle `--p95-sync` gilt für das Board
- [x] 3.5 Probe im Board- und im Detail-Modus laufen lassen; Ergebnisse in `scripts/loadtest/README.md` und im Pull Request (schwere Fixture: Detail p95 9,40 s fehlgeschlagen, Board p95 0,15 s bestanden)

## 4. Deploy-Preflight

- [x] 4.1 `.claude/skills/deploy/SKILL.md`: Schritt „Phase 0“ vor jedem manuellen Deploy, Bestätigung bei jedem Befund
- [x] 4.2 `.claude/skills/deploy/preflight.sh` (laufende CI, Abweichung von `origin/main`, junge Revisionen, vier Scaling-Dateien), ausprobiert mit Befund, sauberem Zustand, jungen Revisionen und Scaling-Änderung

## 5. Verifikation und Rollout

- [x] 5.1 `uv run pytest backend/shopping`, `ruff check`/`ruff format --check`; in `frontend-food`: `npm run lint`, `npx tsc --noEmit`, `npx vitest run`
- [x] 5.2 `openspec validate shopping-list-load-resilience`
- [ ] 5.3 Über `main` mergen, CI-Deploy abwarten; Cloud-Run-Logs prüfen: keine 429
- [ ] 5.4 Beim nächsten Gruppeneinkauf Anteil der 429 und p95 des Board-Aufrufs aus den Cloud-Run-Logs auswerten und mit 21 % (16.10.) vergleichen
