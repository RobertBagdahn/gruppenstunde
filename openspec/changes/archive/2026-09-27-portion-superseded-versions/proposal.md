## Why

Tester-Feedback (Peter, 25.09.2026): „Wenn man die Einheiten bearbeitet, speichert der das immer als neue ab – habe Stück bearbeitet, dann erstellt der Stück neu und behält beide.“ Ursache ist die Schutzregel in `update_portion` (`backend/supply/api/ingredients.py:959`): Ändert sich das Gewicht einer von Rezepten genutzten Portion, legt `create_replacement_portion` eine neue Portion („Stück (neu)“) an und lässt die alte **aktiv und sichtbar**. Der Schutz alter Rezepte ist gewollt, die sichtbare Dublette nicht.

## What Changes

- Neuer Portionszustand **„abgelöst“**: `Portion.superseded_by` (FK auf Nachfolger) und `superseded_at`. Eine abgelöste Portion ist nicht gelöscht, erscheint aber in keiner Liste, keinem Picker und keiner Deduplizierung mehr.
- Gewichtsänderung an einer referenzierten Portion (durch jeden Nutzer mit Bearbeitungsrecht an der Zutat): neue Portion übernimmt **exakt** Name und Rang der alten; die alte wird abgelöst. Kein „(neu)“-Suffix mehr. Für den Nutzer existiert danach genau eine Portion.
- Bestehende Rezepte behalten die abgelöste Portion und damit ihre Grammzahlen (Nährwerte, Preise bleiben unverändert).
- Rezept-Editor zeigt bei Zutaten mit abgelöster Portion einen Hinweis „Veraltete Portion: Stück (50 g) → jetzt 60 g · Aktualisieren“. Aktualisieren übernimmt die aktuelle Portion, die **Anzahl** bleibt, die Gramm ändern sich. Zusätzlich „Alle aktualisieren“ pro Rezept.
- Zentrales QuerySet `Portion.objects.active()` (nicht gelöscht, nicht abgelöst) ersetzt verstreute `deleted_at__isnull=True`-Filter für Portionen.
- DB-Constraints `unique_portion_name_per_ingredient` und `unique_rank1_portion_per_ingredient` gelten nur noch für aktive (nicht gelöschte **und** nicht abgelöste) Portionen.
- Einmaliger Bereinigungsbefehl für bereits erzeugte „(neu)“-Dubletten.
- **BREAKING (intern)**: `PATCH /api/ingredients/{slug}/portions/{id}/` liefert bei Ablösung die neue Portion mit derselben `name` und dem Feld `replaced_portion_id`; Frontend-Caches müssen die alte ID entfernen.

## Capabilities

### New Capabilities
- `portion-superseded-versions`: Versionierung von Portionen bei Gewichtsänderung, Ausblenden abgelöster Portionen, Hinweis und Aktualisierung in Rezepten.

### Modified Capabilities
<!-- Keine Requirement-Änderung an bestehenden Specs: portion-data-integrity und portion-integrity-guardrails verlangen bereits „neue Portion statt In-place-Änderung“. Diese Change legt nur fest, wie die alte Portion danach behandelt wird. -->

## Impact

- **Backend**
  - `supply/models/ingredient.py` (`Portion`): Felder `superseded_by`, `superseded_at`; `PortionQuerySet` mit `active()`; Constraints anpassen → **Migration** (Schema + Constraint-Änderung, keine Datenänderung).
  - `supply/services/portion_integrity.py`: `create_replacement_portion` → `supersede_portion` (Name/Rang übernehmen, Pfadkompression).
  - `supply/api/ingredients.py` (`update_portion`, Portions-Listing), `recipe/api/items.py` (neuer Endpunkt „aktuelle Portionen übernehmen“).
  - ~90 Stellen mit `portions.filter(deleted_at__isnull=True)` bzw. `Portion.objects.filter(..., deleted_at__isnull=True)` auf `.active()` umstellen (u. a. `supply/api/ingredients.py`, `portion_integrity.py`, `portion_magic_wand.py`, `recipe/api/items.py`, `url_import_service.py`, `planner/services/meal_item_helpers.py`).
  - Pydantic: `PortionOut` + `superseded_by_id`; `RecipeItemOut` + `current_portion` (id, name, weight_g) wenn abgelöst; `PortionUpdateOut` bzw. Antwort mit `replaced_portion_id`.
  - Management-Command `merge_neu_portion_duplicates` (mit `--dry-run`).
- **Frontend (`frontend-food/`)**
  - Zod: `PortionSchema` (`schemas/supply.ts`), `RecipeItemSchema` (`schemas/recipe.ts`), `IngredientPortionSchema` (`schemas/mealPlan.ts`).
  - Rezept-Editor (`components/recipe/InlineIngredientEditor.tsx`) und Zutaten-Detail (Portionsliste) inkl. TanStack-Query-Invalidierung.
- **Abhängigkeit**: setzt `ingredient-status-visibility-unification` voraus (einheitliches Bearbeitungsrecht für Portionen über `food_access.can_edit`; verifizierte Zutaten nur Staff).
- **Daten**: lokal 1 bestehende „(neu)“-Dublette (`Kuhmilch 3,5 % Fett / 100g Milch (neu)`); Prod-Zahl vor Deployment per `--dry-run` ermitteln.
