# breakfast-wizard-direct-meal Specification

## Purpose
Defines requirements for saving breakfast wizard output directly into a specific Meal (instead of as a RefMeal).

## ADDED Requirements

### Requirement: Wizard-Direktspeicher-Endpoint

Das System SHALL einen Batch-Endpoint bereitstellen, der eine Liste von MealItems atomar in einem bestehenden Meal speichert und dabei alle existierenden Items ersetzt.

```
POST /api/meal-plans/{plan_id}/meals/{meal_id}/wizard-items/
```

**Request Body:**
```json
{
  "items": [
    {
      "ingredient_id": 123,
      "quantity": 150.0,
      "measuring_unit_id": 5,
      "factor": 1.0
    },
    {
      "recipe_id": 456,
      "factor": 1.5
    },
    {
      "display_name": "Kaffee",
      "quantity": 12,
      "measuring_unit_id": 3
    }
  ]
}
```

**Response Body:** `WizardItemsOut` mit `meal_id` und der Liste aller jetzt im Meal vorhandenen `MealItemOut`-Objekte.

#### Scenario: Leeres Meal mit Wizard-Items befüllen
- **WHEN** der Nutzer sendet POST `/api/meal-plans/1/meals/5/wizard-items/` mit 3 Items
- **THEN** werden alle 3 MealItems erstellt und das Meal enthält genau diese 3 Items
- **AND** der Response enthält `meal_id: 5` und die 3 erstellten `MealItemOut`-Objekte

#### Scenario: Meal mit bestehenden Items wird überschrieben
- **WHEN** Meal 5 hat bereits 2 existierende MealItems und der Nutzer sendet 4 neue Items
- **THEN** werden die 2 alten Items gelöscht und die 4 neuen Items erstellt
- **AND** das Meal enthält danach genau 4 Items

#### Scenario: Wird als Transaktion ausgeführt
- **WHEN** eines der Items im Array ist ungültig (z.B. fehlendes `recipe_id` und `ingredient_id`)
- **THEN** werden keine Items erstellt und die existierenden Items bleiben unverändert
- **AND** der Response hat Status 422 mit einer Fehlerbeschreibung

#### Scenario: Meal existiert nicht
- **WHEN** `meal_id` verweist auf ein nicht existierendes Meal
- **THEN** Response 404

#### Scenario: Meal gehört nicht zum Plan
- **WHEN** `meal_id` gehört zu einem anderen MealPlan als `plan_id`
- **THEN** Response 404

#### Scenario: Batch-Response enthält Nährwerte
- **WHEN** der Batch-Endpoint 3 Items erstellt hat
- **THEN** jedes Item im Response hat `energy_kcal` und `cost_eur` berechnet (basierend auf ingredient/recipe-Nährwerten und Mengen/Faktoren)

### Requirement: Wizard-Direktspeicher-Frontend

Das System SHALL den existierenden BreakfastWizardPage-Component so erweitern, dass er in zwei Save-Modes arbeitet: `refMeal` (bestehend) und `directMeal` (neu). Der Mode wird durch die URL-Route bestimmt.

```
/meal-plans/:id/ref-meals/breakfast/wizard        → saveMode = "refMeal"
/meal-plans/:id/meals/:mealId/breakfast-wizard     → saveMode = "directMeal"
```

#### Scenario: Wizard im directMeal-Mode speichert über Wizard-Endpoint
- **WHEN** der Wizard über `/meal-plans/1/meals/5/breakfast-wizard` aufgerufen wird und der Nutzer "Frühstück speichern" klickt
- **THEN** ruft `handleSave` den `useSaveDirectMeal`-Hook auf, der `POST /api/meal-plans/1/meals/5/wizard-items/` mit allen Wizard-Items sendet
- **AND** nach erfolgreichem Save navigiert die App zu `/meal-plans/1`

#### Scenario: Wizard im directMeal-Mode hat keinen "RefMeal existiert"-Check
- **WHEN** der Wizard im `directMeal`-Mode geladen wird
- **THEN** wird kein RefMeal geladen oder auf Existenz geprüft (kein `existingRefMeal`-State nötig)

#### Scenario: RefMeal-Mode bleibt unverändert
- **WHEN** der Wizard über `/meal-plans/1/ref-meals/breakfast/wizard` aufgerufen wird
- **THEN** verhält er sich exakt wie vor dieser Änderung (RefMeal-Erstellung/Update)
- **AND** nach erfolgreichem Save navigiert die App zu `/meal-plans/1/ref-meals/breakfast`

### Requirement: Überschreib-Warnung vor Wizard-Start

Das System SHALL vor dem Öffnen des Wizards im `directMeal`-Mode prüfen, ob das Ziel-Meal bereits Items enthält, und bei vorhandenen Items eine Bestätigung anfordern.

#### Scenario: Warnung bei bestehenden Items
- **WHEN** ein MealSlot für Frühstück bereits Items enthält (`meal.items.length > 0`) und der Nutzer auf "Frühstücksassistent" klickt
- **THEN** öffnet ein Bestätigungsdialog mit dem Text "Dieses Frühstück enthält bereits Einträge. Der Assistent wird alle vorhandenen Einträge ersetzen. Fortfahren?"
- **AND** die Buttons sind "Abbrechen" und "Trotzdem ersetzen"

#### Scenario: Bestätigung führt zum Wizard
- **WHEN** der Nutzer im Warn-Dialog "Trotzdem ersetzen" klickt
- **THEN** navigiert die App zu `/meal-plans/{planId}/meals/{mealId}/breakfast-wizard`

#### Scenario: Abbrechen schließt nur den Dialog
- **WHEN** der Nutzer im Warn-Dialog "Abbrechen" klickt
- **THEN** schließt der Dialog und es passiert nichts weiter

#### Scenario: Keine Warnung bei leerem Meal
- **WHEN** ein MealSlot für Frühstück leer ist (`meal.items.length === 0`) und der Nutzer auf "Frühstücksassistent" klickt
- **THEN** navigiert die App direkt zu `/meal-plans/{planId}/meals/{mealId}/breakfast-wizard` ohne Dialog
