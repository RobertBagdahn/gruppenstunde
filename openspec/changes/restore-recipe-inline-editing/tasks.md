## 1. Rezept-Pages wiederherstellen

- [ ] 1.1 Gelöschte Dateien aus Git-History wiederherstellen: `git checkout 485870d~1 -- frontend/src/pages/recipes/`
- [ ] 1.2 Prüfen ob `RecipeCookingMode.tsx` ebenfalls wiederhergestellt wurde (wurde von RecipeDetailPage importiert)

## 2. Routen in App.tsx wiederherstellen

- [ ] 2.1 Rezept-Routen in `frontend/src/App.tsx` wieder einfügen (`/recipes`, `/recipes/my-recipes`, `/recipes/import`, `/recipes/new`, `/recipes/:slug/edit`, `/recipes/:slug`)
- [ ] 2.2 Imports für die Recipe-Pages am Anfang von App.tsx hinzufügen

## 3. Broken Imports fixen

- [ ] 3.1 TypeScript-Build ausführen (`npm run build` im frontend) und Fehler identifizieren
- [ ] 3.2 Fehlende Abhängigkeiten fixen (z.B. falls MealPlan- oder ShoppingList-Imports in RecipeDetailPage referenziert werden, diese entfernen oder durch bedingte Imports ersetzen)
- [ ] 3.3 Erneut builden und sicherstellen dass keine Fehler mehr auftreten

## 4. Funktionstest

- [ ] 4.1 Dev-Server starten und `/recipes` aufrufen — Seite lädt
- [ ] 4.2 Rezept-Detail aufrufen — Inline-Editing als Admin testen
- [ ] 4.3 AI-Zauberstab für Zutaten-Mengen testen
