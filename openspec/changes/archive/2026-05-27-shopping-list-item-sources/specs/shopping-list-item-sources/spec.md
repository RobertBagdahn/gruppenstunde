## ADDED Requirements

### Requirement: Source tracking for aggregated shopping list items
Jedes aggregierte Einkaufslisten-Item muss seine Herkunft (Rezept + Mahlzeit + Teilmenge) nachvollziehbar speichern und anzeigen können.

#### Scenario: Transiente Einkaufsliste aus MealPlan generieren
- **WHEN** eine Einkaufsliste für einen MealPlan generiert wird
- **THEN** enthält jedes Item ein `sources`-Array mit Einträgen pro Rezept/Mahlzeit (recipe_id, recipe_name, recipe_slug, meal_label, quantity_g)

#### Scenario: Persistierte Einkaufsliste aus MealPlan erstellen
- **WHEN** eine Einkaufsliste aus einem MealPlan in der DB persistiert wird
- **THEN** werden pro ShoppingListItem die zugehörigen ShoppingListItemSource-Einträge angelegt (recipe FK, meal FK, quantity_g, meal_label)

#### Scenario: Frontend zeigt Sources per Expand/Collapse
- **WHEN** ein Nutzer auf ein Einkaufslisten-Item tippt/klickt
- **THEN** klappt eine Liste der Sources auf mit Rezeptname (verlinkt), Mahlzeit-Label und Teilmenge
- **WHEN** der Nutzer erneut tippt
- **THEN** klappt die Source-Liste wieder zu

#### Scenario: Rezept wird gelöscht
- **WHEN** ein Rezept gelöscht wird das in Sources referenziert ist
- **THEN** bleibt die Source erhalten mit recipe=NULL, der Rezeptname wird weiterhin angezeigt (aus cached recipe_name)

#### Scenario: Items ohne Sources (manuell erstellt)
- **WHEN** ein Item manuell zur Einkaufsliste hinzugefügt wurde
- **THEN** hat es ein leeres `sources`-Array und zeigt keinen Expand-Button
