## Context

Das Haupt-Frontend (`frontend/`) und das Food-Frontend (`frontend-food/`) teilen denselben Backend, aber sollen laut AGENTS.md strikt getrennt sein: Kein Food-Code im Haupt-Frontend. Aktuell gibt es umfangreiche Überschneidungen — das Haupt-Frontend hat volle Ingredient-Schemas, -API-Hooks, -Utilities und -Components, die duplikativ im Food-Frontend existieren.

## Goals / Non-Goals

**Goals:**
- Alle Food-spezifischen Schemas, Hooks, Utilities und Components aus dem Haupt-Frontend entfernen
- Alle Imports und Referenzen auf entfernte Module aufräumen
- `PersonsPage` entfernen oder ersetzen (kann nicht `useNutritionalTags` importieren — Food-Domain-Hook)
- SearchPage: Recipe-spezifische Metadaten (recipe_type, servings) aus der Haupt-Frontend-Suchergebnisansicht entfernen

**Non-Goals:**
- Keine Änderungen im Food-Frontend
- Keine Änderungen im Backend
- Kein Shared-Package erstellen (folgt als separater Change, falls nötig)
- Recipe aus Suchergebnissen entfernen (Backend liefert es, Haupt-Frontend zeigt es als generisches Ergebnis an)

## Decisions

### 1. Vorgehen: Dateien löschen, nicht auslagern

**Entscheidung**: Food-Dateien werden direkt gelöscht, nicht in ein Shared-Package verschoben. Das Food-Frontend hat bereits eigene Kopien aller betroffenen Module.

**Begründung**: Duplikation ist bereits vorhanden. Ein Shared-Package-Refactoring wäre ein eigener Change mit eigener Komplexität. Für jetzt: Clean-Cut-Entfernung.

### 2. PersonsPage: Entfernen

**Entscheidung**: `PersonsPage.tsx` importiert `useNutritionalTags` (Food-Domain). Da diese Page ein Event-Kontakt-Personen-Management ist und nicht direkt ein Food-Feature, prüfen ob der NutritionalTags-Import ersetzt werden kann. Wenn nicht: Page vorerst entfernen und als Folge-Change neu aufbauen ohne Food-Abhängigkeit.

### 3. SearchResult-Anzeige für Recipe

**Entscheidung**: Recipe bleibt als `result_type` in Suchergebnissen, aber das Haupt-Frontend zeigt es als generischen Content-Treffer an (Titel, Slug, Typ-Label). Keine Recipe-spezifischen Metadaten (servings, recipe_type) in der SearchPage-Darstellung.

## Risks / Trade-offs

- **PersonsPage-Entfernung** könnte einen Hole in der Event-Personen-UI hinterlassen → Prüfen, ob NutritionalTags im Non-Food-Kontext benötigt wird. Wenn ja: Neuen Non-Food-Endpoint anbieten.
- **Recipe-Suchergebnisse ohne Detail-Link** sind im Haupt-Frontend ein和能力liches → Folge-Change: Cross-Domain-Linking zum Food-Frontend
