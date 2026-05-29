## 1. InlineIngredientEditor bereinigen

- [x] 1.1 `editServings`-State entfernen und durch Konstante `1` ersetzen
- [x] 1.2 UI-Block "Servings Editor" (Zeilen 266-278) entfernen
- [x] 1.3 `handleServingsChange`-Funktion entfernen
- [x] 1.4 Beim Speichern `servings: 1` hart setzen (statt `editServings`)
- [x] 1.5 Mengen-Normierung: Wenn `servings`-Prop > 1, beim Initialisieren alle Zutatenmengen durch `servings` teilen

## 2. Props und Aufrufer anpassen

- [x] 2.1 `servings`-Prop aus `InlineIngredientEditor` beibehalten (für initiale Normierung)
- [x] 2.2 Aufrufer in `RecipeDetailPage.tsx` unverändert – übergibt weiterhin `servings` für Normierung

## 3. Testen

- [x] 3.1 Rezept mit `servings = 1` bearbeiten – Mengen bleiben unverändert
- [x] 3.2 Rezept mit `servings > 1` bearbeiten – Mengen werden korrekt normiert
- [x] 3.3 Speichern setzt `servings = 1` in der API
