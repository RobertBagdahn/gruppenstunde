## Why

Der Essensplan-PDF-Export „Bundesrat 2026" (Plan 18, Prod) zeigt falsche Mengen und hat Layout-Lücken. `RecipeItem.quantity` und `MealItem.quantity` sind Vielfache ihrer Portion („0,3 × 100g Gurke" = 30 g), das PDF druckt aber `quantity × Skalierung` neben dem Einheitennamen „Gramm". Die Rezeptkarten sind dadurch um den Portionsfaktor falsch (Salatgurke 10,5 g statt 1,05 kg, Hummus 105 ml statt 1,05 l, Jackfruit 44,4 g statt 4,44 kg), während die Einkaufsliste das Gewicht richtig rechnet. Zusätzlich fehlen Zubereitungsschritte (Burger-Rezept 523 hat 0 Schritte), leere Mahlzeiten erscheinen mit Standardzeiten, und das PDF hat Leerseiten und doppelte Zeitpläne. Peters Plandaten bleiben unverändert; es geht nur um Darstellung und fehlende Rezeptschritte.

## What Changes

- Mengen auf Rezeptkarten werden aus dem vertrauenswürdigen Portionsgewicht berechnet und als Gewicht plus Stückzahl dargestellt (z. B. „7 Stück (≈ 2,8 kg)"); gilt auch für Direktzutaten (`MealItem.portion`) und für aufgelöste Schritt-Platzhalter.
- Auf Rezept- und Frühstückskarten steht zusätzlich eine kleine Pro-Person-Angabe („à 16 g p. P.").
- Die Einkaufsliste im PDF nutzt dasselbe Format wie die App („8,8 kg · 18 × 500-g-Packung"); Stückzahlen werden auf ganze Stück aufgerundet.
- Schritt-Platzhalter im Essensplan-PDF werden mit dem Skalierungsfaktor aufgelöst.
- Das Frühstück wird als eine kompakte Karte mit 3–5 Aufbau-Schritten statt je einer Karte pro Direktzutat ausgegeben.
- Direktzutaten behalten den Hinweis „Servierfertig"; Rezepte ohne Schritte bekommen einen ehrlichen Hinweis statt einer Beschreibung als „Schritt 1".
- Burger-Faktor 1,5 wird als „37 Personen × 1,5 Portionen" statt „56 Pers." beschriftet.
- Mahlzeiten ohne Gerichte zeigen „Gerichte offen" statt Kochzeit.
- Layout: Zeitplan nur noch als Tabelle, Küchen-Notizen unter der letzten Karte statt auf eigener Seite, Deckblatt mit Kurzübersicht und Kosten, Allergen-Badges je Gericht plus Matrix am Ende.
- Daten (separater Prod-Schritt, Dry-run, `--apply` nur nach Roberts OK): Schritte aus den Duplikaten 514/515 in Rezept 523 ergänzen.
- Nicht enthalten: Dubletten und falsche Abteilungen der Zutaten bleiben unverändert; keine Plandaten-Änderungen.

## Capabilities

### New Capabilities
- `pdf-amount-formatting`: Gewichtsbasierte Mengenformatierung für gedruckte Exporte (Rezeptkarten, Direktzutaten, Schritt-Platzhalter, Pro-Person-Angabe, Einkaufsliste im App-Format).

### Modified Capabilities
- `meal-plan-pdf-export`: Layout (Deckblatt, Zeitplan nur als Tabelle, Notizen, Frühstückskarte, Allergen-Badges), Schritt-Hinweise, Faktor-Beschriftung und „Gerichte offen".

## Impact

- Backend: `backend/planner/services/pdf_export.py` (`_get_recipe_ingredients`, `_format_scaled_direct_quantity`, `_get_recipe_steps`, `_aggregate_shopping_list`, `_build_meal_context`-Prefetch für `items__portion__measuring_unit`), `backend/planner/services/cooking_schedule_pdf.py`, `backend/recipe/services/step_helpers.py` (`_format_quantity` portionsbewusst, Skalierung), `backend/planner/templates/planner/meal_plan_pdf.html`, neues `backend/supply/services/amount_formatting.py`.
- Keine API-, Pydantic- oder Zod-Schema-Änderungen; keine Migrationen.
- Tests: `backend/planner/tests/test_pdf_export.py`, `test_cooking_schedule_pdf.py`, `backend/recipe/tests/test_step_helpers.py`, neue Tests für `amount_formatting`.
- Daten: Management Command für Rezept 523 (Dry-run/`--apply`), Teil des gesammelten Prod-Rollouts.
