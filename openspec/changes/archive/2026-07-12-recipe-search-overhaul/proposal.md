## Why

Die Rezeptsuche (`/recipes`) ist die Haupt-Einstiegsseite für Nutzer, um Rezepte zu finden. Aktuell werden standardmäßig **alle** sichtbaren Rezepte angezeigt (inkl. nicht-verifizierter Community-Rezepte mit `status=submitted`). Die Filter-UI ist inkonsistent (Radio-Buttons vs. Checkboxen) und die Überschriften sind nicht aussagekräftig. Es gibt keinen definierten Verifizierungs-Workflow für Staff-User, der vor dem Freischalten warnt, wenn Rezept-Regeln nicht erfüllt sind. Die Suche ist verifiziert-zentriert noch nicht umgesetzt und sortiert standardmäßig nach `newest` statt nach tatsächlicher Nutzung.

## What Changes

- **Default: nur verifizierte Rezepte**: `origin`-Filter default auf `verified`, Community und eigene Rezepte müssen explizit zugeschaltet werden
- **Einheitliche Multi-Select-Checkbox-Filter**: Alle Filtergruppen (Typ, Anzeigen, Stufe, Schwierigkeit, Dauer, Zubereitungsart, Kosten) als Checkbox-Gruppen; nichts gewählt = alle anzeigen. Kosten als vordefinierte Preisstufen (`< 2€`, `2-5€`, `5-10€`, `> 10€`)
- **Neue Filter-Gruppen-Titel**: `Typ` (statt Rezeptart), `Anzeigen` (statt Herkunft), `Stufe`, `Schwierigkeit`, `Dauer`, `Zubereitungsart` (NEU), `Kosten`
- **Reset-Button prominent**: Immer sichtbar, oben in der Sidebar
- **Entwurf-Leiste**: "Meine Rezepte" inkl. Drafts, Draft-Karten mit `Entwurf`-Badge markiert
- **Tabellenansicht**: Toggle Kacheln ↔ Tabelle (Bild, Titel, Zeit, Schwierigkeit, Likes, Kosten), Persistenz via localStorage
- **Verifizierungs-Workflow**: Staff-User können Rezepte auf der Detailseite verifizieren; Prüfung aller aktiven Rules + Pflichtfelder; Warning-Dialog bei nicht erfüllten Regeln mit `Trotzdem verifizieren`-Option; ApprovalLog
- **Verification-Readiness-Anzeige**: Fortschrittsbalken/Score auf der Rezept-Detailseite (für Autoren und Staff sichtbar)
- **Neue Default-Sortierung**: `use_count` (Verwendungshäufigkeit in Meal-Plans), 0er ans Ende
- **Dynamischer Seitentitel**: `"Verifizierte Rezepte – Inspi"` (Default), `"Frühstück – Rezepte – Inspi"` (mit Filter)
- **Mobile Filter**: Bottom-Sheet-Drawer statt Collapsible-Sidebar
- **Filter Sidebar sticky**: Beim Scrollen der Ergebnisse sichtbar bleiben
- **Suchverhalten**: Suche immer im aktuellen Anzeigebereich (respektiert aktive Filter)
- **Diverse UI-Verbesserungen**: Skeleton Cards mit exaktem Layout, Suchtext-Highlighting in Karten, intelligente Leer-Ergebnisse

## Capabilities

### New Capabilities
- `recipe-verification`: Staff-Workflow zum Verifizieren von Rezepten mit Rule-Check, Warning-Dialog, Verification-Readiness-Score
- `recipe-table-view`: Tabellenansicht für die Rezeptsuche als Alternative zum Kachel-Grid
- `recipe-filter-uniform`: Einheitliche Multi-Select-Checkbox-Filter für alle Filtergruppen

### Modified Capabilities
- `recipe-search`: Default-Origin auf `verified`, neue Sortierung `use_count`, neue Filter-Gruppen `Zubereitungsart` und Preisstufen für `Kosten`, dynamischer Seitentitel, sticky Sidebar, Bottom-Sheet auf Mobile, Suchtext-Highlighting

## Impact

- **Backend**: `recipe/api/recipes.py` (list_recipes: Default-Origin, use_count-Sort), neuer Verification-Endpoint `POST /api/recipes/{id}/verify/`, neuer Endpoint `GET /api/recipes/{id}/verification-status/`, `recipe/schemas/recipes.py` (RecipeFilterIn, neue Schemas)
- **Frontend-Food**: `RecipeFilterSidebar.tsx` (komplette Neugestaltung), `RecipeListPage.tsx` (Tabellenansicht, Sticky, dynamischer Title), `RecipeCard.tsx` (Suchtext-Highlighting, Draft-Badge), neue Komponenten (`RecipeTableRow`, `VerifyDialog`, `VerificationScore`, `FilterBottomSheet`)
- **Schemas**: Pydantic `RecipeFilterIn` (`origin` default, `sort` default, neue Kosten-Stufen), Zod `RecipeFilterSchema` synchron
- **Migrations**: keine neuen DB-Felder nötig (`use_count` existiert bereits als `usage_count`, `status` existiert bereits)
- **Keine Breaking Changes**: Bestehende URL-Parameter bleiben funktional, `origin="all"` wird zu `origin` nicht gesetzt (neuer Default)
