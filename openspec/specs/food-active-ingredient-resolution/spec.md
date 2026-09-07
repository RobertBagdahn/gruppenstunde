# food-active-ingredient-resolution Specification

## Purpose

Die Auflösung aktiver Rezept-Zutaten (Austausch-Gruppen, optionale Zutaten, Overrides,
soft-gelöschte Portionen) wird an einer kanonischen Stelle definiert und von allen
Berechnungs-Konsumenten einheitlich verwendet: Einkaufsliste (`shopping_service`),
Nährwert-Cockpit (`nutrition_aggregation`), `nutrition-summary` und `cost-summary`.

## Requirements

### Requirement: Kanonischer Resolver in allen Konsumenten

Das System SHALL `resolve_active_recipe_items` / `active_recipe_items` aus
`planner/services/calculation_context.py` als einzige Quelle für die Auswahl aktiver
Rezept-Zutaten verwenden. `nutrition_summary` und `cost_summary` MÜSSEN diese Funktion
nutzen, anstatt die Auswahl-Logik inline zu duplizieren.

#### Scenario: nutrition_summary nutzt kanonischen Resolver

- **GIVEN** einen MealPlan mit einem Rezept, das Austausch-Gruppen und optionale Zutaten enthält
- **WHEN** `GET /api/meal-plans/{id}/nutrition-summary/` aufgerufen wird
- **THEN** SHALL die Zutatenauswahl mit `active_recipe_items()` identisch zur Einkaufsliste sein

#### Scenario: cost_summary nutzt kanonischen Resolver

- **GIVEN** einen MealPlan mit einem Rezept, das Austausch-Gruppen und optionale Zutaten enthält
- **WHEN** `GET /api/meal-plans/{id}/costs/` aufgerufen wird
- **THEN** SHALL die Zutatenauswahl mit `active_recipe_items()` identisch zur Einkaufsliste sein

### Requirement: Default ohne Variantenauswahl

Wenn `MealItem.active_recipe_item_ids` leer ist, SHALL das System folgende Defaults in
allen Konsumenten identisch anwenden: bei Austausch-Gruppen ist nur das Mitglied mit
`exchange_position == 0` aktiv, und optionale Zutaten (`is_optional=True`) gelten als
eingeschlossen (100 % da) — konsistent mit `recipe-optional-items`.

#### Scenario: Austausch-Gruppe ohne Variantenauswahl

- **GIVEN** ein Rezept mit einer Austausch-Gruppe (Default = Zutat A `position 0`, Alternative = Zutat B `position 1`)
- **AND** einen MealItem ohne `active_recipe_item_ids`
- **WHEN** Einkaufsliste, Nährwert- und Kostenübersicht berechnet werden
- **THEN** SHALL Zutat A in allen drei Ansichten enthalten sein
- **AND** SHALL Zutat B in keiner Ansicht enthalten sein

#### Scenario: Optionale Zutat ohne Variantenauswahl

- **GIVEN** ein Rezept mit einer optionalen Zutat (Chili, `is_optional=True`)
- **AND** einen MealItem ohne `active_recipe_item_ids`
- **WHEN** Einkaufsliste, Nährwert- und Kostenübersicht berechnet werden
- **THEN** SHALL die optionale Zutat in allen drei Ansichten für alle Portionen enthalten sein

### Requirement: Soft-deleted Portionen in Rezept-Aggregation ausgeschlossen

Rezept-Aggregationen (`get_recipe_nutritional_values`, `recalculate_recipe_cache`) SHALL
RecipeItems mit soft-gelöschten Portionen (`portion.deleted_at IS NOT NULL`) ausschließen,
konsistent mit `active_recipe_items`.

#### Scenario: Soft-deleted Portion trägt nicht zur Nährwertberechnung bei

- **GIVEN** ein Rezept, dessen RecipeItem auf eine soft-gelöschte Portion zeigt
- **WHEN** die Rezept-Nährwerte aggregiert oder der Cache neu berechnet wird
- **THEN** SHALL diese Zutat weder Gewicht noch Nährwerte beitragen

### Requirement: Portionsoptionen ohne soft-deleted Portionen

Die Einkaufslisten-Anzeige (`_enrich_display_fields` in `shopping_service`) SHALL
soft-gelöschte Portionen aus `natural_portions` und `portion_options` ausschließen.

#### Scenario: Gelöschte Portion erscheint nicht in Portionsoptionen

- **GIVEN** eine Zutat mit einer aktiven und einer soft-gelöschten Portion
- **WHEN** die Einkaufsliste generiert wird
- **THEN** SHALL nur die aktive Portion in `portion_options` und `natural_portions` erscheinen
