## REMOVED Requirements

### Requirement: Brot-Belag-Varianten
**Reason**: Brot+Belag werden nicht mehr als statische Kombi-Mini-Rezepte angelegt. Der Frühstücks-Wizard kombiniert Basis und Belag dynamisch aus Zutaten (1 Belag-Portion = 1 Brot-Einheit), wodurch die N×M-Rezeptexplosion vermieden wird.
**Migration**: Basis-Sorten werden als Ingredients mit Tag "frühstücks-basis" und Scheibengewicht bereitgestellt; Belag-Sorten als Ingredients mit Portionen "Belag knapp/normal/üppig" und "Packung". Siehe Capability `breakfast-wizard`.

### Requirement: Cerealien-Rezepte
**Reason**: Müsli/Cornflakes/Porridge/Overnight Oats werden als Basis-Zutaten im Wizard-Schritt Basis abgebildet, nicht als eigenständige Mini-Rezepte.
**Migration**: Als Basis-Ingredients mit Portionsmengen bereitstellen.

### Requirement: Getränke-Rezepte
**Reason**: Getränke werden im Wizard-Schritt Getränke über Anteile und Mengen erfasst (mit Milch-Zusammenrechnung), nicht als Mini-Rezepte.
**Migration**: Als Getränke-Zutaten bzw. über die Wizard-Getränkelogik abbilden.

## MODIFIED Requirements

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
