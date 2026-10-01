# Food-Frontend-Agent-Regeln

Für projektweite Regeln siehe `../AGENTS.md`. Fachliche Anforderungen gehören in OpenSpec; diese Datei beschreibt die Implementierung des Food-Frontends.

## Architektur

- React, TypeScript im Strict-Modus, shadcn/ui, TanStack Query und Zod verwenden.
- Server-State gehört in TanStack Query; Client-State nur minimal in Zustand.
- Zod-Schemas müssen mit den Backend-Pydantic-Schemas synchron sein.
- Mobile-first ab 320px entwickeln und testen.
- Für neue UI-Komponenten zuerst den `/styleguide` prüfen.

## Design-System

- Farben und Flächen über HSL-CSS-Variablen und semantische Theme-Tokens steuern; keine hartcodierten Tailwind-Palettenfarben. Status nur über `success`, `warning`, `danger`, `info` (mit `-soft`, `-border`, `-foreground`); `chart-*` nur in Diagrammen.
- Genau fünf Schriftgrößen: `text-caption` (12 px), `text-body` (14), `text-emphasis` (16), `text-section` (20), `text-title` (28); keine freien Werte (`text-[…]`).
- Genau drei Radien: `rounded-lg` (8 px, Bedienelemente), `rounded-xl` (12 px, Karten und Dialoge), `rounded-full` (Pills, Badges, Avatare).
- Überschriften mit `Plus Jakarta Sans`, Fließtext mit `Inter`.
- Icons: nur Lucide, über `Icon` aus `@/components/ui/icon` oder Lucide-Komponenten, Größen 16/20/24/48 px, Strichstärke 2 (16 im Fließtext und in kleinen Buttons, 20 in Buttons und Navigation, 24 in Kopfzeilen, 48 nur in Leerzuständen). Keine Material Symbols und keine Icon-Schrift. Neue Namen für `Icon name="…"` in `ICONS` ergänzen.
- Tabellenzeilen als `CardTable`/`DataCardRow` umsetzen und auf kleinen Viewports stapeln.
- Rezeptbilder ausschließlich mit `RecipeThumbnail` und dem Backend-Feld `image_url` darstellen.

## UI und Fehler

- Markdown statt HTML rendern; kein `dangerouslySetInnerHTML`.
- Lade-, Leer-, Fehler- und Retry-Zustände behandeln.
- Mutations-Feedback über Toasts in Seiten-Komponenten anzeigen.
- Permissions ausschließlich aus `can_edit` und `can_delete` der API verwenden.
- Keine TypeScript-`any`, `console.log` oder manuellen Rezeptbild-Fallbacks.
