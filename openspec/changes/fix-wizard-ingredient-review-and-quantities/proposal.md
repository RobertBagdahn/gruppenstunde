# Zutaten-Review im Rezept-Wizard: Bedienung und Mengenumrechnung

## Why

Beim Produktivtest wurden im Zutaten-Review des Rezept-Wizards zwei Gruppen von Fehlern sichtbar.

Bedienung:
- „Zutat ändern“ setzt den Fokus in das Suchfeld, ohne den vorhandenen Text zu markieren. Eingaben werden angehängt („TomateTomaten gesch“) statt zu ersetzen.
- Nach dem Wählen einer vorhandenen Zutat (Alternative) bleibt das Formular „Neue Zutat prüfen“ sichtbar, weil `new_ingredient_draft` nicht gelöscht wird.
- Das Dropdown mit den Warengruppen-Chips läuft bei 1024 px über den Viewport hinaus.
- Werden Zutaten nach der KI-Schrittgenerierung entfernt, erwähnen die Zubereitungsschritte sie weiter („Tomaten und etwas Salz hinzugeben“), ohne Hinweis.

Mengen:
- „1 Zwiebel“ wird zu 1,25 × mittelgroße Zwiebel (100 g), „2 EL Olivenöl“ zu 1,84 EL (27,6 g), „Salz“ zu 1,67 Prisen. Ursache in `UnitGramConverter.convert_to_portion_count`: Die Menge wird erst über allgemeine Maße/Dichte in Gramm umgerechnet und dann durch das Gewicht der Rang-1-Portion geteilt. Stimmt die Einheit mit der eigenen Portion der Zutat überein (EL ↔ Portion EL, Stück ↔ Portion Zwiebel), geht dabei die Eins-zu-eins-Beziehung verloren.

## What Changes

- Fokus auf „Zutat ändern“ markiert den vorhandenen Text, sodass Tippen ihn ersetzt.
- Beim Auswählen einer vorhandenen Zutat wird `new_ingredient_draft` gelöscht und das Formular „Neue Zutat prüfen“ ausgeblendet. Beim bewussten „Neu anlegen“ bleibt es.
- Der Autocomplete-Dropdown und die Warengruppen-Chips umbrechen oder scrollen innerhalb der Spaltenbreite, ohne horizontalen Seitenüberlauf (ab 320 px).
- Die Mengenumrechnung bevorzugt eine passende eigene Portion: Entspricht die importierte Einheit dem Namen oder der Messeinheit einer aktiven Portion der Zutat, ist die Portionszahl gleich der Menge (2 EL → 2 × Portion EL). Stück/leere Einheit mit Stückportion: Menge = Portionszahl.
- Werden im Wizard Zutaten entfernt oder ersetzt, nachdem Zubereitungsschritte generiert wurden, zeigt der Schritt „Zubereitung“ einen Hinweis „Zutaten wurden geändert – bitte Schritte prüfen“.

## Capabilities

### Modified Capabilities
- `recipe-ingredient-review`: Fokus-/Ersetzverhalten, Auswahl räumt Neu-Formular auf, Layout ohne Überlauf.
- `recipe-ai-quantity-estimate`: Einheit mit passender eigener Portion wird eins zu eins übernommen.
- `recipe-creation-wizard`: Hinweis auf veraltete Zubereitungsschritte nach Zutatenänderung.

## Impact

- **Backend:** `backend/recipe/services/unit_gram_conversion.py` (`convert_to_portion_count`), `backend/recipe/services/ingredient_review_service.py` (`_suggested_portion_count`), Tests in `backend/recipe/tests/`.
- **Frontend (frontend-food):** `components/recipe/RecipeIngredientReviewStep.tsx` (`focusSearch`, `selectIngredient`), `components/recipe/IngredientAutocomplete.tsx` (Layout), Wizard-Schritt Zubereitung (`WizardStepSteps.tsx`/Wizard-Context).
- **Schemas:** unverändert erwartet.
