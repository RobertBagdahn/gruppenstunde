# breakfast-wizard-direct-meal Specification

## Purpose
Defines requirements for saving breakfast wizard output directly into a specific Meal (instead of as a RefMeal).
## Requirements
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

### Requirement: Frühstücks-Extras behalten ihre ausgewählte Portion

Die Single- und Bulk-Wizard-Endpunkte SHALL eine über `portion_id` gewählte Portion auflösen, validieren, dass sie eine aktive Portion der ausgewählten Zutat ist, und sie am `MealItem` speichern; `measuring_unit` bleibt dabei leer, die angezeigte Einheit ergibt sich aus der Portion (`unit_label`/`unit_kind`). Der Food-Frontend-Wizard SHALL die Menge und Portion eines Extras beim Speichern mitsenden und beim Wiederöffnen Namen und Portion wiederherstellen. Das gilt auch für Extras, die frei über die Zutatensuche gewählt wurden und nicht im Frühstückskatalog stehen. Für die kcal-Berechnung SHALL das Frontend das vertrauenswürdige Portionsgewicht in Gramm verwenden; unbekanntes Gewicht SHALL nicht als Grammmenge geraten werden.

#### Scenario: Extra mit Stückportion speichern

- **GIVEN** ein Frühstücks-Extra hat eine aktive Portion `Stück` mit vertrauenswürdigem Gewicht 50 g
- **WHEN** der Nutzer 2 Stück als Extra auswählt und den Frühstücks-Wizard speichert
- **THEN** SHALL das MealItem die ausgewählte `portion_id` und Menge 2 enthalten, ohne `measuring_unit`
- **AND** SHALL die für die Vorschau verwendete Grammmenge 100 g betragen

#### Scenario: Portion gehört zu anderer Zutat

- **GIVEN** eine Anfrage enthält eine Portion, die nicht zu der ausgewählten Zutat gehört
- **WHEN** der Wizard speichert
- **THEN** SHALL der Backend-Endpunkt HTTP 422 zurückgeben und keine teilweise Änderung vornehmen

#### Scenario: Extra beim Wiederöffnen wiederherstellen

- **GIVEN** ein Frühstücks-Extra wurde mit Namen und Stückportion gespeichert
- **WHEN** der Frühstücks-Wizard erneut geöffnet wird
- **THEN** SHALL die Extra-Zeile den echten Zutatennamen, die ausgewählte Portion und die gespeicherte Menge zeigen

#### Scenario: Frei gesuchtes Extra außerhalb des Katalogs

- **GIVEN** der Nutzer fügt über „+ Zutat“ eine Zutat hinzu, die nicht im Frühstückskatalog steht, und wählt 2 EL
- **WHEN** der Wizard gespeichert und erneut geöffnet wird
- **THEN** SHALL das MealItem die gewählte Portion und Menge 2 enthalten
- **AND** SHALL das Extra beim Wiederöffnen mit „2 EL“ erscheinen und beim nächsten Speichern nicht gelöscht werden
