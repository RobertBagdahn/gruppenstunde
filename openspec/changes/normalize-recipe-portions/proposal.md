# Rezeptportionen normalisieren

## Why

Rezepte speichern Mengen pro Person (`portions=1`). Lokal haben 88 Rezepte (angelegt 2026-05-28 bis 2026-09-06, vor allem aus dem Prod-Import) noch `portions>1`. Planer, PDF und Einkaufsliste teilen deren Mengen durch `recipe.portions`, die Rezeptseite nicht – dieselbe Zutat erscheint dadurch mit unterschiedlichen Mengen. Die bestehende Gewichtsheuristik von `normalize_recipe_servings` ordnet laut Audit 12 von 88 Rezepten falsch ein (z. B. Suppe für 20 mit 485 g Gesamtgewicht würde auf 24 g pro Person geteilt) und schreibt ohne Flag direkt in die Datenbank. Gleichzeitig nimmt die API `portions` beliebig an und verwirft den Wert stillschweigend.

## What Changes

- `normalize_recipe_servings` bewertet das Gewicht typabhängig (Hauptgericht, Suppe/Salat, Frühstück, Nachtisch/Snack, Rezeptteil, Soße/Dip, Getränk), meldet unklare Fälle als „review“ und lässt sie unverändert.
- Neue Optionen `--ids`, `--treat-as-total`, `--treat-as-per-person`; Schreiben nur noch mit `--apply`, `--dry-run` bleibt als ausdrückliche Standard-Schreibweise erhalten.
- Beim Teilen werden alle `RecipeItem`-Mengen geteilt (auch optionale Zutaten und Austausch-Alternativen), `source_servings` übernimmt die alte Personenzahl, der Rezept-Cache wird neu berechnet. `RecipeStepIngredient.quantity_modifier` bleibt als relativer Faktor unverändert.
- **BREAKING**: `POST /api/recipes/` und `PATCH /api/recipes/{id}/` lehnen `portions != 1` mit 422 ab („Rezepte werden immer für 1 Person gespeichert. Bitte gib die Mengen pro Person an.“) statt den Wert still zu verwerfen. Ein mitgesendetes `portions=1` schreibt Altdaten nicht um.
- Im Django-Admin ist `portions` schreibgeschützt.
- Der Chefkoch-Import speichert `source_servings` zu den bereits geteilten Mengen.
- Frontend-Food: Payload-Typen erlauben für `portions` nur noch `1`.
- Keine Datenbank-Constraint, solange Prod noch Altdaten enthält.

## Capabilities

### Modified Capabilities
- `recipe-portion-normalization`: Ablehnung statt stiller Korrektur, typabhängige Einordnung, Overrides, Standard-Trockenlauf.

## Impact

- **Backend:** `recipe/management/commands/normalize_recipe_servings.py`, `recipe/schemas/recipes.py`, `recipe/api/recipes.py`, `recipe/admin.py`, `recipe/management/commands/import_chefkoch_urls.py`, Tests.
- **Frontend-Food:** `src/api/recipes.ts` (Payload-Typen).
- **Daten:** Audit in `/tmp/recipe-portions-audit.md`; Ausführung lokal/Prod erst nach Entscheidung des Owners.
- **Folgearbeiten:** Nach der Prod-Normalisierung alle Teilungen durch `recipe.portions` (Planer, PDF, Einkaufsliste, Nährwert-Analyse, Preis pro Portion) entfernen und eine DB-Constraint `portions = 1` ergänzen.
