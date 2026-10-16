# Korrekte Einheiten in der Wizard-Vorschau

## Why

Im Produktivtest zeigte der letzte Schritt des Rezept-Wizards („Vorschau & Speichern“) Mengen pro Person mit falscher Einheit: Spaghetti als „1 g“ statt „1 Portion trocken (100 g)“ und Zwiebel als „0,31 g“ statt „0,31 mittelgroße Zwiebel (25 g)“. Die Detailseite nach dem Speichern zeigte dieselben Daten korrekt (100 g, 25 g). Wer die Vorschau prüft, sieht also fehlerhafte Mengen und kann falsche Entscheidungen treffen.

Ursache: `RecipeIngredientsTable.tsx` zeigt `quantity` mit `measuring_unit_name` und fällt auf „Gramm“ zurück. Bei Zutaten mit Portion ist `quantity` aber die Zahl der Portionen, die Einheit steht in `portion_name`.

## What Changes

- Die Vorschau zeigt pro Zutat die Menge mit Portionsname (z. B. „0,31 mittelgroße Zwiebel“) und das Gewicht in Gramm als Sekundärzeile, wenn die Primäranzeige keine Gramm-Einheit ist. Das entspricht der Regel der Detailseite.
- Hat eine Zutat weder Portion noch Einheit, wird die Einheit „—“ statt eines geratenen „Gramm“ angezeigt.
- Die Tabelle nutzt die gemeinsame Anzeige-Logik der Detailseite (`IngredientList`), sodass Vorschau und Detailseite nicht mehr auseinanderlaufen.
- Die Mengen in der Vorschau entsprechen der Pro-Person-Normierung, die beim Speichern gilt, und werden als solche beschriftet („pro Person“).

## Capabilities

### Modified Capabilities
- `recipe-creation-wizard`: Anforderung an Schritt „Vorschau & Speichern“ bekommt korrekte Mengen-/Einheitenanzeige.

## Impact

- **Frontend (frontend-food):** `components/recipe/RecipeIngredientsTable.tsx`, `components/recipe/WizardStepPreview.tsx`, ggf. Auslagerung des Formatters aus `components/supply/IngredientList.tsx`.
- **Backend:** keine Änderung, die Felder `portion_name` und `weight_g` liegen bereits im Item-Schema vor.
