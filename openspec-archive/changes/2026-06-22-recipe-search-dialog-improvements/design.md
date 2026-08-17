## Context

Der `RecipeSearchDialog` ist der zentrale Einstiegspunkt zum Hinzufügen von Rezepten zu Mahlzeiten im Food-Frontend. Er wird von `MealSlot.tsx` und direkt aus der Planungsansicht geöffnet. Die Bugs wurden durch Code-Review entdeckt — einige sind seit der Entstehung des Dialogs vorhanden (onClick fehlt, Schema-Mismatch), andere entstanden durch spätere Änderungen (snack-Filter, Lint-Suppress).

Alle Fixes sind isoliert auf zwei Dateien (Backend: `meal_plan.py`, Frontend: 5 Dateien) und haben keine API-Breaking-Changes.

## Goals / Non-Goals

**Goals:**
- Alle 10 identifizierten Bugs beheben
- Design-Token-Konformität in `RecipeSearchCard` herstellen
- `RecentlyUsedSection` funktional im Dialog integrieren
- Backend-Filterlogik korrekt reihen (SQL-WHERE vor Python-Slice)
- Schema-Konsistenz zwischen Backend und Frontend herstellen

**Non-Goals:**
- Neue Features aus der Explore-Session (Kosten-Filter, Vorbereitungszeit, Mehrfachauswahl Quellen etc.) — das ist ein separater Change
- Umbau der Dialog-Architektur oder Zustandsverwaltung
- Neue API-Endpunkte

## Decisions

### D1: `portions` statt `servings` im Frontend-Schema

Das `Recipe`-Model verwendet `portions` (Django-Feldname). Das Backend serialisiert konsequent `portions`. Das Zod-Schema hatte `servings` als Überbleibsel einer früheren Umbenennung. **Entscheidung:** Frontend-Schema auf `portions` anpassen — minimale Änderung, keine API-Anpassung nötig.

### D2: Tag-Filter ins SQL-Queryset — nicht als Python-Liste-Filterung

Aktuelle Implementierung: `[:limit]` zieht 20 Rezepte aus der DB, danach filtert Python-Code nach Tags. Das ist semantisch falsch (man bekommt weniger als `limit` Ergebnisse, obwohl mehr in der DB existieren).

**Entscheidung:** `exclude_nutritional_tag_ids` als `.exclude(nutritional_tags__id__in=...)` direkt ans Queryset hängen, vor dem `[:limit]`-Schnitt. `nutritional_tag_ids` als `.filter(nutritional_tags__id__in=...)`. Das ist auch performanter.

**Alternative verworfen:** Limit erhöhen und nachträglich filtern — führt zu unvorhersehbaren Ergebnismengen und ist kein Fix sondern ein Workaround.

### D3: RecentlyUsedSection — direkte Auswahl ohne Preview

Beim Klick auf ein "Kürzlich verwendet"-Rezept soll es direkt ausgewählt werden (kein Preview-Dialog). Begründung: Der Nutzer hat das Rezept bereits bewusst genutzt, ein zweiter Bestätigungsschritt ist Friction ohne Mehrwert. Die `onSelect`-Callback-Prop wird direkt aufgerufen.

### D4: RECIPE_TYPE_LABELS-Konsolidierung

`RECIPE_TYPE_LABELS` war doppelt definiert — in `CategoryPills.tsx` (als Export) und in `RecipeSearchCard.tsx` (lokal). **Entscheidung:** `RecipeSearchCard` importiert aus `CategoryPills`. `ingredient`-Eintrag wird in `CategoryPills.tsx` ergänzt — sowohl in `RECIPE_TYPES` (für den Chip) als auch in `RECIPE_TYPE_LABELS`.

### D5: Hardcodierte Farben → `bg-muted` + `text-muted-foreground`

Die Typ-Badges in `RecipeSearchCard` verwenden spezifische Tailwind-Farben (`bg-amber-100` etc.). Diese werden auf ein einheitliches `bg-muted text-muted-foreground`-Muster umgestellt, das dem Design-System entspricht. Ein einzelnes Muted-Badge für alle Typen ist ausreichend, da der Typ-Text bereits lesbar ist.

**Alternative:** Semantic-CSS-Variablen pro Typ definieren (z.B. `--recipe-type-breakfast`) — zu viel Aufwand für die aktuelle Codebasis, kein Mehrwert.

## Risks / Trade-offs

- **`portions`-Umbenennung im Schema** → Alle Konsumenten von `RecipeSearchResult.servings` müssen geprüft werden. Grep-Suche vor dem Commit erforderlich.
- **Tag-Filter-Umstellung im Backend** → Die Filterlogik ändert Ergebnismengen (bisher: zu wenig, danach: korrekt). Kein Migrations-Risiko, aber `fallback_applied`-Logik muss nach der Umstellung nochmal validiert werden.
- **`ingredient` in CategoryPills** → Der Chip erscheint neu in der UI. Nutzer sehen ihn beim nächsten Öffnen. Kein Breaking Change, aber kleine UX-Änderung.

## Migration Plan

Kein Deployment-Risiko. Alle Änderungen sind non-breaking:
1. Backend-Fix deployen (Tag-Filter vor Limit)
2. Frontend-Build deployen (Schema, Komponenten, Dialog)

Reihenfolge ist beliebig, da der Schema-Mismatch (`servings` → `portions`) das Feld bisher einfach ignoriert hat (optional im Schema).

## Open Questions

Keine.
