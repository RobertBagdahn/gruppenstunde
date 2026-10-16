## Why

Peter hat beim Testen fünf Lücken gemeldet: Ein Rezept lässt sich nicht direkt aus der Rezeptseite in einen Essensplan legen, im Suchdialog kann man ein Rezept vor dem Hinzufügen nicht prüfen, Zutaten wie „Zwiebel“ / „Speisezwiebel“ werden in Buffet und Rezeptsuche nicht gefunden, „1 Liter à 980 ml“ widerspricht sich, und der Button „Menge und Portion“ im Rezept-Review tut nichts. Alle Punkte treffen den Kernablauf Rezept → Plan → Einkauf.

## What Changes

- **Rezept → Essensplan**: Hauptbutton „Zum Essensplan“ im Kopfband und in der Mobile-Aktionsleiste der `RecipeDetailPage`. Dialog Plan → Tag → Mahlzeit mit Mehrfachauswahl, nur Pläne mit Schreibrecht, Portionen = Normportionen des Plans (änderbar), Duplikat in derselben Mahlzeit wird blockiert, danach Toast mit „Zum Plan“ und „Rückgängig“. Ohne Plan: „Neuen Plan anlegen“ im Dialog. Anonyme Besucher sehen den Button, Klick führt zum Login.
- **Rezept prüfen im Suchdialog** (`MealOmnibarDialog`): „Rezept ansehen“ (neuer Tab), ausklappbare vollständige Zutatenliste mit Mengen für die Normportionen, volle Beschreibung mit „Mehr“, Ernährungstags und Allergen-Chips unter dem Titel, mobil ein Bottom-Sheet „Details“, Alle-Reiter zeigt 8 statt 5 Treffer je Gruppe.
- **Einheitliche Food-Suche**: Eine gemeinsame Suchlogik (Teilstring, Aliase, Umlautvarianten) für Omnibar, Buffet und Rezept-Zutatenautocomplete. Ranking exakt → beginnt mit → Wortanfang → enthält, dann `usage_count`. Das Buffet zeigt Nicht-Standalone-Zutaten immer (hinter Standalone-Treffern, Badge „Zutat zum Kochen“); die Checkbox „Auch Backzutaten & Gewürze“ entfällt. Die Omnibar zeigt zusätzlich eigene Entwurfs-Zutaten (Badge „Entwurf“).
- **Mengenanzeige**: Ist der Portionsname selbst eine Volumen- oder Masseneinheit (Liter, ml, g, kg), zeigt die Pille statt „à 980 ml“ das Gewicht, z. B. „1 Liter (≈ 1.020 g)“. Ein Management-Command erzeugt einen Dry-run-Report für Zutaten mit Volumen-Portion und abweichender Dichte; Korrekturen nur nach ausdrücklichem OK.
- **Review-Dialog „Menge und Portion“**: Backend liefert `selected_ingredient_slug` für KI-Vorschläge (bereits behoben), `UnknownIngredientDialog` reicht den Slug durch (bereits behoben). Neu: Dialog öffnet immer mit Skeleton, bei Ladefehler Meldung und „Erneut versuchen“; alle Zutaten-Dialoge im Wizard werden geprüft.

## Capabilities

### New Capabilities
- `recipe-add-to-meal-plan`: Rezept von der Detailseite in eine oder mehrere Mahlzeiten eines Essensplans legen.
- `meal-omnibar-recipe-details`: Rezeptdetails (Zutaten mit Mengen, Beschreibung, Tags, Link) im Suchdialog vor dem Hinzufügen.
- `unified-food-search`: Gemeinsame Suchlogik und Ranking für Zutaten in Omnibar, Buffet und Rezeptautocomplete.
- `portion-unit-display-consistency`: Widerspruchsfreie Mengen-/Gewichtsanzeige bei Volumen- und Masseneinheiten als Portionsname.
- `ingredient-review-quantity-dialog`: Verlässliches Öffnen und Fehlerverhalten des Dialogs „Menge und Portion“ im Review.

### Modified Capabilities

(keine; bestehende Specs `meal-planner-omnibar-search`, `buffet-builder`, `ingredient-search`, `portion-weight-display`, `recipe-ingredient-review` werden durch die neuen Capabilities ergänzt)

## Impact

- **Backend**: `planner/api/meal_plan.py` (Rezeptsuche, Beschreibung ungekürzt, Zutaten mit Mengen, Allergene; Zutatensuche), `supply/services/buffet_catalog.py` (Filter, Ranking, Badge), `supply/api/ingredients.py` (gemeinsame Suche), `recipe/services/ingredient_review_service.py` und `recipe/api/items.py` (Slug), neues Management-Command unter `supply/management/commands/`.
- **Pydantic ↔ Zod**: Such-Response der Omnibar (`planner/schemas/meal_plan.py` ↔ `frontend-food/src/schemas/mealPlan.ts`: Beschreibung, `ingredients_preview` mit Mengen, Allergene), Buffet-Suchitem (`supply` ↔ `schemas/buffet.ts`: Badge-Feld), Review-Row (`selected_ingredient_slug`).
- **Frontend (nur `frontend-food/`)**: `RecipeDetailPage`, `RecipeMobileActionBar`, neuer Dialog „Zum Essensplan“, `MealOmnibarDialog`, `BuffetBuilder`, `IngredientAutocomplete`, `IngredientList` / `lib/ingredientAmount.ts`, `RecipeIngredientReviewStep`.
- **Migrationen**: keine Schema-Migration erwartet; Datenkorrekturen nur über den Dry-run-Report und nach OK (siehe Prod-Rollout-Plan).
- **Laufende Changes**: Nachträge in `unified-buffet-wizard` (Buffet-Suche) und `switchable-quantity-units` (Mengenanzeige).
