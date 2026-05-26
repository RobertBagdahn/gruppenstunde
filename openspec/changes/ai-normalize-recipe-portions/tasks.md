## 1. Management Command

- [x] 1.1 Erstelle `recipe/management/commands/normalize_recipe_portions.py` — lädt alle Rezepte, baut pro Rezept den Prompt, ruft Gemini mit Structured Output auf, aktualisiert RecipeItem.quantity per Index-Matching
- [x] 1.2 Stdout-Ausgabe: Tabelle mit Rezeptname, Zutat, alt → neu
- [x] 1.3 Nach jedem Rezept-Update: `recalculate_recipe_cache(recipe)` aufrufen
- [x] 1.4 Option `--dry-run` die nur die Tabelle ausgibt ohne DB-Änderungen
