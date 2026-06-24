### Requirement: Frühstücks-Seed-Rezepte bereitstellen
Das System SHALL über einen Management Command einen Katalog vordefinierter **warmer** Frühstücks-Rezepte mit `recipe_type=breakfast` erstellen (z.B. Rührei, Pfannkuchen). Brot+Belag-Kombinationen sowie reine Getränke werden NICHT mehr als Rezepte angelegt — sie laufen über den Frühstücks-Wizard.

#### Scenario: Seed-Command erstellt nur warme Gerichte
- **WHEN** `uv run python manage.py seed_breakfast_recipes` ausgeführt wird
- **THEN** werden ausschließlich warme Frühstücks-Rezepte (idempotent, Slug-basierte Dedup) erstellt

### Requirement: Extras-Rezepte
Das System SHALL warme Extra-Rezepte für das Frühstück bereitstellen:
- Rührei
- Pfannkuchen

Kalte Extras (Joghurt, Obst, gekochtes Ei) werden im Wizard-Schritt Extras als Zutaten erfasst, nicht als Rezepte.

#### Scenario: Warme Extras vorhanden
- **WHEN** Seed-Command gelaufen ist
- **THEN** existieren warme Extra-Rezepte (z.B. Rührei, Pfannkuchen) mit `recipe_type=breakfast`
