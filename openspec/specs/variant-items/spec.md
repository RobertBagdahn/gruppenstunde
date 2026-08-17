# variant-items Specification

## Purpose

Varianten von Rezepten werden als eigenständige MealItems statt über ein Split-Modell verwaltet.

## Requirements

### Requirement: Varianten als MealItems

Das System SHALL jede Variante als eigenes `MealItem` mit `factor` und
`active_recipe_item_ids` speichern. `factor` beschreibt den Anteil der `effective_portions`,
den die Variante abdeckt.

#### Scenario: Austausch-Gruppe
- **WHEN** 15 von 25 Personen Parmesan und 10 Hefeflocken erhalten
- **THEN** werden zwei MealItems mit Faktoren `0.6` und `0.4` und den jeweiligen aktiven RecipeItem-IDs gespeichert

### Requirement: Varianten-Batch

Das System SHALL `POST /api/meal-plans/{id}/meals/{mealId}/items/batch/` atomar unterstützen.
Alle erzeugten Varianten erhalten dieselbe `variant_group_id`.

#### Scenario: Batch-Erzeugung
- **WHEN** mehrere Varianten über die Batch-API gespeichert werden
- **THEN** werden sie atomar erstellt und als `MealItemOut`-Liste zurückgegeben

### Requirement: Variantenberechnung

Kosten, Nährwerte und Einkaufsmengen SHALL nur aktive RecipeItems berücksichtigen und den
jeweiligen Variantenfaktor sowie `effective_portions` verwenden.

#### Scenario: Inaktive Zutat
- **WHEN** eine Variante eine RecipeItem-ID nicht in `active_recipe_item_ids` enthält
- **THEN** trägt diese Zutat nicht zu Kosten, Nährwerten oder Einkaufsliste bei

### Requirement: Variantenbearbeitung

Das Frontend SHALL Varianten derselben `variant_group_id` gruppiert anzeigen und den Faktor
über den bestehenden MealItem-PATCH-Endpoint bearbeiten können.

#### Scenario: Faktor ändern
- **WHEN** der Faktor einer Variante geändert wird
- **THEN** werden die gespeicherte Verteilung sowie Energie und Kosten aktualisiert
