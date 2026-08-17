## MODIFIED Requirements

### Requirement: Kochplan verwendet aktive Meal-Plan-Daten

Der Kochplan SHALL dieselben aktiven Items, Overrides und `effective_portions` wie die übrigen
Food-Ausgaben verwenden. Ausgeschlossene Items fehlen vollständig; Mengen-Overrides und
konsistente Ausgabe-Rundung werden angewendet.

#### Scenario: Kochplan übernimmt Override
- **WHEN** ein MealItem ein ausgeschlossenes oder mengenüberschriebenes RecipeItem enthält
- **THEN** entspricht der Kochplan der gemeinsamen Berechnung
