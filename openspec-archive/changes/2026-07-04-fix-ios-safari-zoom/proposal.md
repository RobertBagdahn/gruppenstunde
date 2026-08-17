## Why

Auf dem iPhone (iOS Safari) zoomt die App bei jedem Seitenaufruf etwas ein. Der User muss nach jedem Page-Load manuell herauszoomen. Das zerstört die mobile UX und passiert seit Wochen auf der Produktion.

Ursache: iOS Safari zoomt automatisch auf den Viewport, wenn Elemente horizontal überlaufen (selbst 1px) und/oder `maximum-scale` im Viewport-Meta fehlt. Die App hat an mehreren Stellen horizontales Overflow und keine defensive `overflow-x:hidden`-Absicherung.

## What Changes

- **Beide Frontends** (`frontend/`, `frontend-food/`):
  - Viewport-Meta-Tag um `maximum-scale=1` ergänzen
  - `overflow-x: hidden` auf `html` und `body` im CSS
- **Main-Frontend** (`frontend/`):
  - `min-w-[200px]` in `FilterBar.tsx` und `TitleImageEditor.tsx` responsive machen
  - Tab-Bars mit `whitespace-nowrap` in `overflow-x-auto`-Container prüfen/absichern
  - `min-w-0` bei `shrink-0` + `justify-between`-Kombinationen ergänzen
- **Food-Frontend** (`frontend-food/`):
  - `grid-cols-4` in `StepCockpit.tsx` auf Mobile auf `grid-cols-2` umstellen
  - `min-w-[800px]` Tabellen mit horizontalem Scrollen dediziert absichern

## Capabilities

### New Capabilities
- `mobile-viewport`: iOS Safari Zoom-Prävention — korrekte Viewport-Konfiguration, horizontales Overflow-Handling, defensive CSS-Absicherung für alle Frontends

### Modified Capabilities
- *(none)*

## Impact

| Bereich | Dateien | Änderung |
|---------|---------|----------|
| `frontend/index.html` | 1 | viewport meta attribute |
| `frontend-food/index.html` | 1 | viewport meta attribute |
| `frontend/src/index.css` | 1 | overflow-x: hidden |
| `frontend-food/src/index.css` | 1 | overflow-x: hidden |
| `frontend/src/...` | ~5 Components | responsive min-widths, min-w-0 |
| `frontend-food/src/...` | ~3 Components | grid-cols responsive, overflow |
| Backend | 0 | **Kein Backend-Code** |
| Migrationen | 0 | **Keine Migrationen** |
| Pydantic/Zod Schemas | 0 | **Keine Schema-Änderungen** |
