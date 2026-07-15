# meal-plan Specification

## Purpose

This specification defines the meal plan data model, API schemas, permissions, and frontend behavior for the meal planning feature.
## Requirements
### Requirement: cost_summary recipe cost_per_person nutzt effective_portions

Das System SHALL `cost_per_person` pro Rezept im `cost_summary`-Endpunkt auf Basis der `effective_portions` der jeweiligen Mahlzeit berechnen — nicht durch das globale `norm_portions` des Plans teilen.

#### Aktuell (falsch)

```python
"cost_per_person": rc["total_cost"] / norm_portions
```

Das dividiert alle Rezept-Gesamtkosten durch `norm_portions`, auch wenn das Rezept in einer Mahlzeit mit `override_portions=20` verwendet wurde.

#### Korrekt

`cost_per_person` pro Rezept ist die Summe der je-Mahlzeit-Pro-Person-Kosten für dieses Rezept:

```python
# In der Meal-Loop:
recipe_cost_per_person = recipe_item_cost / effective_portions
recipe_costs[rid]["cost_per_person"] += recipe_cost_per_person

# Im Output:
"cost_per_person": rc["cost_per_person"]  # keine weitere Division
```

#### Szenario: Rezept in Mahlzeit mit override_portions

- **GIVEN** ein Plan mit `norm_portions=10`
- **AND** eine Mahlzeit mit `override_portions=20`
- **AND** ein Rezept in dieser Mahlzeit mit Gesamtkosten 40€
- **WHEN** `GET /api/meal-plans/{id}/costs/` aufgerufen wird
- **THEN** soll `recipe.cost_per_person = 40 / 20 = 2.00€` sein (nicht `40 / 10 = 4.00€`)

#### Szenario: Rezept in mehreren Mahlzeiten mit unterschiedlichen Portionen

- **GIVEN** ein Rezept in Mahlzeit A (`effective_portions=10`, Kosten=20€) und Mahlzeit B (`effective_portions=20`, Kosten=40€)
- **THEN** soll `recipe.cost_per_person = 20/10 + 40/20 = 2 + 2 = 4.00€` sein

### Requirement: cost_summary Direktzutat-Gewicht über kanonischen Helper

Das System SHALL für Direktzutaten (`MealItem.ingredient`) im `cost_summary`-Endpunkt `_resolve_ingredient_weight_g` aus `planner/services/meal_item_helpers.py` verwenden — konsistent mit `nutrition_summary`.

#### Scenario: Direktzutat mit ml-Einheit in cost_summary

- **GIVEN** ein `MealItem` mit `ingredient` (`price_per_kg=2.50`, `density=1.0`), `quantity=500`, `measuring_unit.name="ml"`, `factor=1.0`
- **AND** `effective_portions=10`
- **WHEN** `cost_summary` berechnet wird
- **THEN** SHALL `weight_g = 500 * 1.0 * 1.0 * 10 = 5000g` für die Preisberechnung gelten
- **AND** SHALL `price = 2.50 / 1000 * 5000 = 12.50 EUR` sein

#### Scenario: Konsistenz nutrition_summary und cost_summary bei Direktzutaten

- **GIVEN** dieselbe Direktzutat in einem Plan
- **WHEN** `nutrition_summary` und `cost_summary` aufgerufen werden
- **THEN** SHALL das interne `weight_g` für diese Zutat in beiden Endpunkten identisch sein

### Requirement: Rezepte mit portions=0 werden in allen Berechnungen geskippt

Das System SHALL Rezepte mit `portions=0` oder `portions=None` aus allen Berechnungen (nutrition_summary, cost_summary, shopping_service) ausschließen und ein Warning loggen. Ein stilles Normieren auf `portions=1` ist nicht mehr erlaubt.

#### Scenario: Rezept mit portions=0 trägt nicht zur Nährwertberechnung bei

- **GIVEN** ein `MealItem` mit einem Rezept das `portions=0` hat
- **WHEN** `nutrition_summary` berechnet wird
- **THEN** SHALL dieses Rezept keinen Beitrag zu `energy_kcal` oder anderen Nährwerten liefern

#### Scenario: Rezept mit portions=0 erscheint nicht auf Einkaufsliste

- **GIVEN** ein `MealItem` mit einem Rezept das `portions=0` hat
- **WHEN** Einkaufsliste generiert wird
- **THEN** SHALL keine Zutaten dieses Rezepts auf der Einkaufsliste erscheinen

#### Scenario: Warning wird geloggt

- **GIVEN** ein Rezept mit `portions=0` ist in einem Plan enthalten
- **WHEN** eine beliebige Berechnung über diesen Plan ausgeführt wird
- **THEN** SHALL `logger.warning` mit Rezept-ID und -Titel aufgerufen werden

### Requirement: norm_portions wird aus GroupMembers automatisch abgeleitet

Das System SHALL `meal_plan.norm_portions` aus der Summe der Norm-Faktoren aller `MealPlanGroupMember`s berechnen, sobald mindestens ein GroupMember existiert. Der bisherige manuelle Wert wird in `previous_norm_portions` gesichert und beim Löschen aller GroupMembers wiederhergestellt.

`norm_portions` ist ab dieser Änderung ein `FloatField` (vorher `IntegerField`), da Gruppensummen selten ganzzahlig sind.

#### Scenario: GroupMembers vorhanden → automatische Berechnung

- **GIVEN** ein MealPlan mit 3 GroupMembers (Summe der Norm-Faktoren = 3.7)
- **WHEN** `meal_plan.norm_portions` abgefragt wird
- **THEN** SHALL `norm_portions = 3.7` sein
- **AND** `previous_norm_portions` SHALL den letzten manuellen Wert enthalten

#### Scenario: Keine GroupMembers → manueller Wert

- **GIVEN** ein MealPlan ohne GroupMembers und `norm_portions=10` (manuell gesetzt)
- **WHEN** `meal_plan.norm_portions` abgefragt wird
- **THEN** SHALL `norm_portions = 10` sein (manueller Wert)

#### Scenario: norm_portions ist FloatField

- **WHEN** `meal_plan.norm_portions` in der Datenbank gespeichert wird
- **THEN** SHALL der Wert ein Float sein (z.B. 3.7, nicht auf 4 gerundet)

### Requirement: activity_factor am MealPlan

Das System SHALL ein `activity_factor` FloatField (Default: 1.5) am `MealPlan`-Modell bereitstellen. Dieser Wert dient als PAL für alle GroupMember-Berechnungen.

#### Scenario: activity_factor Default

- **WHEN** ein neuer MealPlan erstellt wird
- **THEN** SHALL `activity_factor` den Default-Wert 1.5 haben

#### Scenario: activity_factor in MealPlanDetailOut

- **WHEN** `GET /api/meal-plans/{id}/` aufgerufen wird
- **THEN** SHALL die Response `activity_factor` enthalten

#### Scenario: activity_factor in MealPlanUpdateIn

- **WHEN** der Nutzer PATCH `/api/meal-plans/{id}/` mit `{"activity_factor": 1.75}` sendet
- **THEN** SHALL `activity_factor` auf 1.75 aktualisiert werden
- **AND** falls GroupMembers existieren, SHALL `norm_portions` mit dem neuen PAL neu berechnet werden

### Requirement: List schema exposes can_edit and can_delete
The meal plan list item response schema SHALL include `can_edit: bool` and `can_delete: bool` fields in addition to the existing `is_owner` field. Values SHALL be resolved server-side based on the user's relationship to the meal plan (ownership, collaborator role, staff status).

#### Scenario: Meal plan list includes permission fields
- **WHEN** a client fetches `GET /api/meal-plans/`
- **THEN** each item in the response MUST include `can_edit` and `can_delete`
- **THEN** `can_edit` SHALL be `true` for plans the user can edit
- **THEN** `can_delete` SHALL be `true` for plans the user can delete
- **THEN** the existing `is_owner` field SHALL remain unchanged

### Requirement: List page guards actions with permissions
The meal plan list page SHALL only show destructive or privileged actions in the card dropdown menu when the user has the appropriate permission. The dropdown menu items "Löschen" and "Als Vorlage verwenden" SHALL be hidden when the user lacks permission.

#### Scenario: Owner views their plan card
- **WHEN** the plan owner views the meal plan list
- **THEN** the three-dot dropdown menu SHALL show "Als Vorlage verwenden" and "Löschen"

#### Scenario: Non-owner views another's plan card
- **WHEN** a non-owner user views the meal plan list
- **THEN** the three-dot dropdown menu SHALL NOT show "Löschen"
- **THEN** the three-dot dropdown menu SHALL NOT show "Als Vorlage verwenden" (unless they have editor/collaborator access)

### Requirement: MealItem schema exposes recipe image as image_url
`MealItemOut` and `CookingScheduleRecipeBlockOut` (`backend/planner/schemas/meal_plan.py`) SHALL expose the linked recipe's image under the field name `image_url` (not `recipe_image`), consistent with `RecipeListOut`/`ContentListOut` elsewhere in the platform.

#### Scenario: MealItem with a recipe that has an image
- **WHEN** a `MealItem` references a `Recipe` that has an uploaded image
- **THEN** the API response SHALL include `image_url` set to the recipe's image URL

#### Scenario: MealItem with a recipe that has no image
- **WHEN** a `MealItem` references a `Recipe` without an image
- **THEN** the API response SHALL include `image_url` set to `null`

#### Scenario: Cooking schedule recipe block exposes image_url
- **WHEN** a `CookingScheduleRecipeBlockOut` is serialized for the kitchen dashboard or PDF export
- **THEN** it SHALL expose the recipe's image under `image_url`, matching the same naming as `MealItemOut`

### Requirement: Cooking schedule PDF export service uses image_url naming
The `cooking_schedule_service.py` dataclass used for PDF export generation SHALL name its recipe-image field `image_url`, consistent with the API schema naming.

#### Scenario: PDF export dataclass field renamed
- **WHEN** the cooking schedule PDF export service builds its internal recipe-block dataclass
- **THEN** the image field SHALL be named `image_url` instead of `recipe_image`

