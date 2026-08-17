## Context

Die MealPlanListPage zeigt eine simple Liste von Essensplänen. Aktuell: dünne Border-Cards in einer einzelnen Spalte mit viel Leerraum. Kein visueller Zusammenhalt.

## Goals / Non-Goals

**Goals:**
- Kompakteres, visuell ansprechenderes Layout
- Mehr Borders und Struktur statt Whitespace
- Desktop: 2-Spalten-Grid
- Bessere Card-Gestaltung mit Akzenten
- Delete-Action in DropdownMenu verstecken
- Create-Form als shadcn Dialog

**Non-Goals:**
- Neue API-Endpunkte oder Datenfelder
- Progress-Bar (keine Daten vorhanden für "% geplant")
- Änderungen an der Detailseite

## Decisions

1. **2-Spalten-Grid auf Desktop** (`grid-cols-1 md:grid-cols-2`) — bessere Raumnutzung
2. **Summary-Stats im Header** — Gesamtanzahl Mahlzeiten/Portionen aus den vorhandenen Daten berechnen (clientseitig)
3. **shadcn DropdownMenu** für Card-Aktionen (Löschen, evtl. Bearbeiten) statt isoliertem Delete-Icon
4. **shadcn Dialog** für Create-Form statt inline-Collapse
5. **Card-Design**: `border-l-4 border-l-primary` als Akzent, kompakteres Padding, `divide-y` für Sections
6. **Weniger gap/space-y** — von `space-y-6` / `gap-4` auf `gap-3` reduzieren

## Risks / Trade-offs

- Kein Backend-Risk, rein visuell
- 2-Spalten können bei sehr langen Namen umbrechen — `truncate` löst das
