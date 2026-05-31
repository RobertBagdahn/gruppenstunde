## 1. Backend: Management Command für Prod-Normalisierung

- [x] 1.1 Management Command `normalize_recipe_servings` erstellen in `backend/recipe/management/commands/normalize_recipe_servings.py` mit Drei-Kategorien-Heuristik (bereits normalisiert / Gesamtmengen / kaputte Daten), `--dry-run` Flag, und Cache-Neuberechnung nach Änderungen
- [x] 1.2 Command lokal mit `--dry-run` testen und Ausgabe prüfen
- [x] 1.3 Command auf Prod-DB ausführen via cloud-sql-proxy (vorher DB-State dokumentieren)

## 2. Backend: Shopping-Service defensiv durch recipe.servings teilen

- [x] 2.1 `supply/services/shopping_service.py:98` ändern: `weight_g = ri.quantity * (ri.portion.weight_g or 0) * mi.factor * scaling / recipe.servings`
- [x] 2.2 `shopping/api.py` From-Recipe Endpoint: Berechnung analog anpassen (`weight_g / recipe.servings`)
- [x] 2.3 Raw-Quantity-Berechnung in `shopping_service.py:102` ebenfalls durch `recipe.servings` teilen

## 3. Backend: API-Validierung servings=1

- [x] 3.1 Recipe Create API: `servings=1` serverseitig erzwingen unabhängig vom übergebenen Wert
- [x] 3.2 Recipe Update API: `servings=1` serverseitig erzwingen unabhängig vom übergebenen Wert

## 4. Frontend-Food: Import-Stepper Portionsvalidierung

- [x] 4.1 In `CreateRecipePage.tsx`: Nach URL-Import Portionsvalidierungs-UI einbauen — zeige erkannte `servings` und Original-Mengen, lasse User bestätigen oder korrigieren
- [x] 4.2 Normalisierungslogik: Wenn User bestätigt und `servings > 1`, alle importierten Mengen durch `servings` teilen und `servings=1` setzen vor dem Befüllen des Formulars
- [x] 4.3 Wenn `servings=1` erkannt wird, Validierungsschritt überspringen

## 5. Frontend-Food: Save-Normalisierung sicherstellen

- [x] 5.1 In `InlineIngredientEditor.tsx` prüfen, dass beim Speichern immer `servings=1` gesetzt wird (ist bereits der Fall, Verifikation)
- [x] 5.2 In `CreateRecipePage.tsx` beim Speichern sicherstellen, dass `servings` immer `1` ist
