## Context

Beide Frontends (`frontend/` und `frontend-food/`) haben das gleiche Problem: iOS Safari zoomt auf dem iPhone bei jedem Seitenaufruf etwas ein. Der aktuelle Viewport-Meta-Tag (`width=device-width, initial-scale=1.0`) erlaubt Safari, den Viewport selbstständig zu skalieren.

Die Root-Cause-Analyse ergab vier Schichten:
1. **Viewport-Meta**: `maximum-scale=1` fehlt → Safari darf auto-zoomen
2. **Horizontales Overflow**: 15+ Stellen mit `min-w-[200px]`, `whitespace-nowrap`-Tab-Bars, etc. auf 320px Viewport
3. **Fehlende defensive CSS**: Kein `overflow-x: hidden` auf `html` oder `body`
4. **Layout Shifts**: Font-Loading (FOUT) + SPA Hydration können kurzzeitigen Overflow triggern

## Goals / Non-Goals

**Goals:**
- iOS Safari zoomt nicht mehr automatisch auf der Produktion
- Betroffene Pages passen auf 320px Viewport ohne horizontales Overflow
- Beide Frontends (main + food) werden gefixt

**Non-Goals:**
- Kein Redesign kompletter Komponenten (nur minimale CSS/HTML-Änderungen)
- Keine Backend-Änderungen
- Keine Schema-Änderungen (Pydantic/Zod)
- Keine Änderungen an der Build-Pipeline oder Deployment-Konfiguration

## Decisions

### 1. maximum-scale=1 vs user-scalable=no

Entschieden: `maximum-scale=1` (ohne `user-scalable=no`)

- `user-scalable=no` deaktiviert Pinch-to-Zoom komplett und verstößt gegen WCAG 2.2 Success Criterion 1.4.4 (Resize Text)
- `maximum-scale=1` deaktiviert ebenfalls Pinch-to-Zoom, aber iOS Accessibility Zoom (Settings → Accessibility → Zoom) bleibt verfügbar
- Alternative `maximum-scale=5` wurde verworfen — es verhindert das Auto-Zoom-Problem nicht zuverlässig

### 2. overflow-x: hidden auf html vs body

Entschieden: **Beide** `html` und `body` bekommen `overflow-x: hidden`

- iOS Safari verwendet den `<html>`-Node für Viewport-Berechnungen
- Manche Third-Party-Skripte rendern direkt in `<body>`
- Mit Tailwind's `@layer base` muss `html` nicht explizit angesprochen werden — `@apply` auf `body` reicht nicht, da iOS Safari den Overflow-Context von `<html>` liest

### 3. Overflow-Fixes: Reparieren vs Verstecken

Entschieden: **Reparieren + Verstecken als zweite Linie**

- `overflow-x: hidden` auf html body fängt unentdeckte Overflow-Reste ab (Sicherheitsnetz)
- bekannte Overflow-Quellen werden gezielt repariert:
  - `min-w-[200px]` → responsive via `sm:min-w-[200px]`
  - `whitespace-nowrap`-Tab-Bars → `overflow-x-auto` auf Container
  - `grid-cols-4` auf Mobile → `grid-cols-2 sm:grid-cols-4`

### 4. Font-Loading optimieren (Option, nicht Pflicht)

Entschieden: **Nicht als Teil dieses Changes**  

Font-Loading zu fixen (font-display: optional, preload, self-hosting) reduziert FOUT-bedingte Layout-Shifts. Das ist aber ein separates Thema und gehört nicht in diesen Bugfix.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| **Pinch-to-Zoom deaktiviert** für User, die es bewusst nutzen | iOS Accessibility Zoom bleibt. User mit motorischen Einschränkungen können Zoom systemweit aktivieren. |
| **overflow-x: hidden versteckt** echten Layout-Bug | Wir reparieren bekannte Overflow-Quellen gezielt. hidden ist nur Sicherheitsnetz für unentdeckte Fälle. |
| **CSS-Änderungen werden** durch `autoprefixer` nicht korrekt transformiert | Alle Klassen sind Tailwind-Standard. Keine vendor-prefix-relevanten Properties. |
| **Nicht alle Overflow-Quellen gefunden** | overflow-x:hidden + maximum-scale=1 Kombination fängt Restfälle ab. |
