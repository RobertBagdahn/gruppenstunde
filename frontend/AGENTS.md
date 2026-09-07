# Haupt-Frontend-Agent-Regeln

Für projektweite Regeln siehe `../AGENTS.md`. Diese Datei beschreibt nur die Implementierung im Haupt-Frontend.

## Architektur

- React, TypeScript im Strict-Modus, Vite, shadcn/ui und TanStack Query verwenden.
- Server-State gehört in TanStack Query; Client-State nur bei echtem Bedarf in einen kleinen Zustand-Store.
- API-Daten über typisierte Zod-Schemas validieren; diese müssen mit den Pydantic-Schemas synchron sein.
- Keine rohen `fetch`-Aufrufe in Seiten, wenn ein API-Hook verwendet werden kann.
- URL-State für Filter, Suche, Pagination und Ansichtsmodi verwenden.
- Mobile-first ab 320px testen.

## UI und Navigation

- Vorhandene shadcn/ui-Komponenten verwenden, keine parallelen UI-Primitiven bauen.
- Markdown über `MarkdownEditor` und `MarkdownRenderer` behandeln; kein HTML und kein `dangerouslySetInnerHTML`.
- Entity-Links über `EntityLink` führen; URL-Muster nicht in einzelnen Komponenten duplizieren.
- Ein Tool darf in der primären Navigation nur einmal erscheinen.
- Das Haupt-Frontend enthält keinerlei Food-UI, Food-Hooks, Food-Schemas, Food-Routen oder Food-Navigation.

## Fehler und Tests

- Lade-, Leer-, Fehler- und Retry-Zustände sichtbar behandeln.
- Mutationen zeigen Erfolg und Fehler über Toasts in Seiten-Komponenten, nicht in API-Hooks.
- Destruktive Aktionen verwenden `ConfirmDialog`, nicht `window.confirm()`.
- Keine TypeScript-`any`, `console.log` oder Bilder ohne Alt-Text.
- Änderungen an Schemas, Hooks und UI jeweils gezielt prüfen.
