## 1. Viewport Meta + CSS (beide Frontends)

- [ ] 1.1 `<meta name="viewport">` in `frontend/index.html` um `maximum-scale=1` ergänzen
- [ ] 1.2 `<meta name="viewport">` in `frontend-food/index.html` um `maximum-scale=1` ergänzen
- [ ] 1.3 `overflow-x: hidden` auf `html` und `body` in `frontend/src/index.css` hinzufügen
- [ ] 1.4 `overflow-x: hidden` auf `html` und `body` in `frontend-food/src/index.css` hinzufügen

## 2. Main Frontend — Overflow-Fixes

- [ ] 2.1 `FilterBar.tsx`: `min-w-[200px]` responsive via `sm:min-w-[200px] min-w-0` machen
- [ ] 2.2 `TitleImageEditor.tsx`: `min-w-[200px]` auf `max-w-[calc(100vw-1rem)]` begrenzen
- [ ] 2.3 `EventDashboardPage.tsx`: Tab-Bar zusätzl. in `overflow-x-auto`-Container prüfen
- [ ] 2.4 `SearchTabs.tsx`: Sicherstellen dass Container `overflow-x-auto` hat
- [ ] 2.5 `MyDashboardPage.tsx` (Zeilen 303, 333, 352): `min-w-0` bei `shrink-0` + `justify-between` ergänzen

## 3. Food Frontend — Overflow-Fixes

- [ ] 3.1 `StepCockpit.tsx`: `grid-cols-4` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- [ ] 3.2 `TableView.tsx`: Wrapper sicherstellen mit stabilen `overflow-x-auto` + `sticky`-Spalten

## 4. Verifikation

- [ ] 4.1 `npm run build` in `frontend/` läuft ohne Fehler
- [ ] 4.2 `npm run build` in `frontend-food/` läuft ohne Fehler
- [ ] 4.3 Manuelles Testen auf iPhone (Safari): kein automatischer Zoom nach Page-Load
- [ ] 4.4 Manuelles Testen auf 320px Viewport (Browser DevTools): kein horizontales Overflow
