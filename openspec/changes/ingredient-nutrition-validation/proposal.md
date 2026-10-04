# Nährwert-Plausibilität beim Speichern von Zutaten

## Why

Beim Produktivtest wurde für eine Zutat „Protein 200 g/100 g“ mit 500 kcal gespeichert, und es wurde ein Nutri-Score B berechnet. Der Plausibilitäts-Service `supply.services.nutrition_plausibility` kennt diese Fälle bereits (`invalid_value`, `macro_sum_gt_100`, `sugar_gt_carbs`, `sat_fat_gt_fat`), wird aber nur in der Datenqualitäts-Auswertung genutzt, nicht beim Anlegen oder Bearbeiten. Unmögliche Werte verfälschen Rezept-Nährwerte, Ampelregeln und Scores.

## What Changes

- `POST /api/ingredients/` und `PATCH`/`PUT` auf Zutaten prüfen die Nährwerte mit `detect_nutrition_issues`. Physikalisch unmögliche Befunde werden mit `422` abgelehnt, mit Feldliste und deutscher Meldung: negative Werte, Gramm-Felder über 100, Makro-Summe über Grenzwert, Zucker größer als Kohlenhydrate, gesättigtes Fett größer als Fett.
- Weichere Befunde (Energie passt nicht zu den Makros, fehlende Makros) blockieren nicht. Die Antwort enthält sie als `nutrition_warnings`.
- Die Prüfung läuft nur, wenn sich ein Nährwert gegenüber dem gespeicherten Wert ändert (die Formulare senden immer alle Felder). Wer nur Name oder Preis einer Bestandszutat mit bereits schlechten Werten ändert, wird nicht blockiert.
- Der Nutri-Score wird nicht aus abgelehnten Werten berechnet, weil gar nicht gespeichert wird.
- Frontend (Erstellen und Bearbeiten): gleiche Regeln clientseitig per Zod (sofortige Feldfehler), Server-422 wird den Feldern zugeordnet, Warnungen werden als Hinweis gezeigt.
- Das Rezept-Wizard-Dialogformular „Neue Zutat prüfen“ nutzt dieselbe Prüfung.

## Capabilities

### Modified Capabilities
- `ingredient-database`: Anforderung an Nährwertwerte bekommt Speicher-Validierung mit Ablehnung und Warnungen.

## Impact

- **Backend:** `backend/supply/api/ingredients.py` (`create_ingredient`, `update_ingredient`), `backend/supply/schemas/ingredients.py` (Antwort `nutrition_warnings`), Wiederverwendung von `backend/supply/services/nutrition_plausibility.py`.
- **Frontend (frontend-food):** `CreateIngredientPage.tsx`, `IngredientEditPage.tsx`, Dialog „Neue Zutat prüfen“ im Rezept-Wizard, Zod-Schemas synchron zu Pydantic.
- **Daten:** Keine Migration. Bestehende unplausible Zutaten (laut Cockpit aktuell 4) bleiben bestehen und werden über das Datenqualitäts-Cockpit repariert.
