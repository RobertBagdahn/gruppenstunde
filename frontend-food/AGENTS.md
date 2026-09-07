# Food-Frontend-Agent-Regeln

Für projektweite Regeln siehe `../AGENTS.md`. Fachliche Anforderungen gehören in OpenSpec; diese Datei beschreibt die Implementierung des Food-Frontends.

## Architektur

- React, TypeScript im Strict-Modus, shadcn/ui, TanStack Query und Zod verwenden.
- Server-State gehört in TanStack Query; Client-State nur minimal in Zustand.
- Zod-Schemas müssen mit den Backend-Pydantic-Schemas synchron sein.
- Mobile-first ab 320px entwickeln und testen.
- Für neue UI-Komponenten zuerst den `/styleguide` prüfen.

## Design-System

- Farben und Flächen über HSL-CSS-Variablen und semantische Theme-Tokens steuern; keine hartcodierten Tailwind-Palettenfarben.
- Überschriften mit `Plus Jakarta Sans`, Fließtext mit `Inter`.
- Lucide für Standard-UI-Aktionen, Navigation, Status und Inline-Symbole verwenden.
- Material Symbols nur für illustrative oder bereits etablierte große Feature-Symbole verwenden.
- Tabellenzeilen als `CardTable`/`DataCardRow` umsetzen und auf kleinen Viewports stapeln.
- Rezeptbilder ausschließlich mit `RecipeThumbnail` und dem Backend-Feld `image_url` darstellen.

## UI und Fehler

- Markdown statt HTML rendern; kein `dangerouslySetInnerHTML`.
- Lade-, Leer-, Fehler- und Retry-Zustände behandeln.
- Mutations-Feedback über Toasts in Seiten-Komponenten anzeigen.
- Permissions ausschließlich aus `can_edit` und `can_delete` der API verwenden.
- Keine TypeScript-`any`, `console.log` oder manuellen Rezeptbild-Fallbacks.
