# Auffällige Zutatenmengen früh erkennen

## Why

Im Plan „Bundesrat 2026“ (Peter, 10.10.2026) standen am Ende rund 11 kg Zwiebeln und „17,5 Stück“ Eisbergsalat auf der Einkaufsliste. Die Ursachen lagen in den Daten, nicht in der Hochrechnung (siehe `openspec/changes/meal-plan-ingredient-quantities/diagnosis-bundesrat-2026.md`):

- Beim Teilen eines Rezepts „für 4 Personen“ auf eine Person blieb eine Zeile ungeteilt (Sweet Onion Sauce: 2 Zwiebeln pro Person).
- Einzelne Rezeptzeilen hatten Mengen weit über dem Üblichen (1 Zwiebel pro Burger, 150 g Eisbergsalat pro Wrap).
- Die Import-Standardportion „1 Stück (150g)“ war bei Eisbergsalat nie bestätigt worden; ein Kopf wiegt 500–600 g.
- „Zwiebel“ und „Speisezwiebel“ existierten doppelt, obwohl „Zwiebel“ bereits Alias von „Speisezwiebel“ war.

Keine bestehende Prüfung hat das gemeldet: Die Mengen-Plausibilität im Plan greift erst ab 1500 g oder 50 Stück pro Person, `validate_recipe_data` prüft nur das Gesamtgewicht eines Rezepts (> 5 kg), und die Portions-Plausibilität im Datenqualitäts-Bereich nur das Rezeptgewicht pro Portion (< 100 g oder > 2000 g).

## What Changes

1. **Normalisierungs-Prüfung (Vorschlag 3):** Beim Teilen eines Rezepts durch `source_servings` (Import, `normalize_recipe_servings`) speichert jede Zeile ihre Originalmenge (`RecipeItem.source_quantity`). Eine Prüfung erkennt Zeilen, die vermutlich nicht geteilt wurden, und meldet sie im Import-Bericht, im Command und im Datenqualitäts-Bereich.
2. **Statistischer Mengenvergleich (Vorschlag 1):** Für jede Zutat werden Median und 90-%-Wert der Gramm pro Person über alle freigegebenen Rezepte berechnet (`IngredientQuantityStats`). Rezeptzeilen, die deutlich darüber liegen, werden als „auffällig hohe Menge“ markiert: in der Rezept-Ansicht und im Rezept-Editor (Bearbeiter), im Datenqualitäts-Bereich und als Report-Command.
3. **Plan-Check-Regel (Vorschlag 4):** Neue Regel „Auffällige Zutatenmenge“ im bestehenden Plan-Check. Sie nutzt dieselben Werte pro Mahlzeit und verlinkt auf die Mengen-Ansicht des Plans.
4. **Portionsgewichte und doppelte Zutaten (Vorschlag 5):** Datenqualitäts-Listen für unbestätigte Import-Standardportionen („1 Stück (150g)“), die in Rezepten verwendet werden, und für Alias-Konflikte (Zutatname ist Alias einer anderen Zutat). Zusammenführen über den vorhandenen Merge-Service.

Alle Prüfungen warnen nur; sie blockieren weder Speichern noch Import.

## Capabilities

### New Capabilities
- `recipe-quantity-outlier-checks`: Normalisierungs-Prüfung, statistische Mengen-Ausreißer, Plan-Check-Regel, verdächtige Portionsgewichte und Alias-Konflikte.

### Modified Capabilities
- keine bestehende Anforderung ändert sich; `meal-plan`-Plan-Check und Datenqualitäts-Bereich erhalten zusätzliche Regeln bzw. Listen.

## Impact

- **Backend:**
  - `recipe`: Feld `RecipeItem.source_quantity` (Migration), Setzen in `import_chefkoch_urls`, `import_cooklang`, `normalize_recipe_servings`; neuer Service `recipe/services/quantity_outliers.py`; `RecipeItemOut` erhält `quantity_outlier`.
  - `supply`: neues Model `IngredientQuantityStats` (Migration), Berechnung in `supply/services/ingredient_quantity_stats.py`, Command `recalculate_ingredient_quantity_stats`; Alias-Konflikt-Erkennung in `supply/services/ingredient_merge.py`.
  - `planner`: neue Regel in `planner/services/plan_check.py`.
  - `content/api/data_quality.py`: drei neue paginierte Admin-Endpunkte.
  - Commands: `check_recipe_quantities` (Bericht, ersetzt nicht `validate_recipe_data`).
- **Schemas:** Pydantic `QuantityOutlierOut`, `RecipeQuantityOutlierOut`, `SuspiciousPortionOut`, `AliasConflictOut`; `RecipeItemOut.quantity_outlier`. Zod-Gegenstücke in `frontend-food/src/schemas/recipe.ts` und `frontend-food/src/schemas/dataQuality.ts`.
- **Frontend-Food:** Hinweis an Rezeptzeilen (`RecipeDetailPage`, Rezept-Editor), neue Tabs in `DataQualityRecipesPage` („Auffällige Mengen“, „Ungeteilte Zeilen“) und `DataQualityIngredientsPage` („Stückgewichte“, „Alias-Konflikte“). Plan-Check-Alerts erscheinen ohne UI-Änderung in der bestehenden Liste.
- **Migrationen:** `recipe` (neues nullable Feld), `supply` (neues Model). Kein Daten-Backfill nötig; `source_quantity` bleibt für Altdaten leer.
- **Nicht im Umfang:** automatische Korrektur von Mengen, Grenzwerte von Hand pro Zutat (Vorschlag 2), nicht-lineare Skalierung.
