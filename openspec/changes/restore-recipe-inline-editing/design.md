## Context

Die Rezept-Seiten wurden in Commit `485870d` aus dem Router entfernt. Die zugehörigen Page-Dateien (`frontend/src/pages/recipes/`) wurden gelöscht. Alle unterstützenden Komponenten (`InlineEditor`, `IngredientList`, `RecipeSidebar`, etc.) und API-Hooks (`useUpdateRecipe`, `useAiSuggestIngredients`, etc.) existieren noch.

## Goals / Non-Goals

**Goals:**
- Rezept-Routen und Pages aus Git-History wiederherstellen
- Admin-Inline-Editing (Zutaten CRUD, AI Zauberstab, Text-Editing) funktionsfähig machen
- Rezepte löschen können

**Non-Goals:**
- Neue Features hinzufügen
- MealPlan/ShoppingList-Routen wiederherstellen (separates Thema)
- Refactoring der wiederhergestellten Seiten

## Decisions

1. **Git-Restore statt Neuschreiben**: Die gelöschten Dateien per `git checkout 485870d~1 -- frontend/src/pages/recipes/` wiederherstellen. Das ist der schnellste und sicherste Weg.
2. **Nur Rezept-Routen**: Wir stellen nur `/recipes`-Routen wieder her, nicht MealPlan oder Ingredients-Routen (können bei Bedarf separat folgen).
3. **Fehlende Imports prüfen**: Falls wiederhergestellte Pages auf gelöschte Abhängigkeiten referenzieren (z.B. ShoppingList-Hooks), diese Imports entfernen oder stubben.

## Risks / Trade-offs

- **Risk**: Pages referenzieren möglicherweise andere gelöschte Seiten (MealPlan, Ingredients). → Lösung: Broken Imports fixen nach Restore.
- **Trade-off**: Wir stellen den alten Code 1:1 wieder her statt zu modernisieren. Das ist akzeptabel da keine Rückwärtskompatibilität nötig ist und ein späterer Refactor jederzeit möglich.
