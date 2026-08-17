## ADDED Requirements

### Requirement: Eindeutige Rezepte pro Mahlzeit

Ein MealItem SHALL innerhalb eines Meals ein Rezept referenzieren, das nicht bereits durch ein anderes MealItem desselben Meals referenziert wird.

#### Scenario: Erfolgreiches Hinzufügen eines neuen Rezepts
- **WHEN** ein Benutzer ein Rezept zu einem Meal hinzufügt, das noch nicht in diesem Meal enthalten ist
- **THEN** wird das MealItem erfolgreich angelegt

#### Scenario: Duplikat eines Rezepts wird abgelehnt
- **WHEN** ein Benutzer versucht, ein Rezept zu einem Meal hinzuzufügen, das bereits als MealItem in diesem Meal existiert
- **THEN** erhält der Benutzer einen HTTP 422 mit der deutschen Fehlermeldung "Dieses Rezept ist bereits in dieser Mahlzeit enthalten"

#### Scenario: Duplikat eines Rezepts via Wizard
- **WHEN** ein Benutzer über den Wizard-Endpunkt mehrere Items atomar ersetzt und die Input-Liste zweimal dasselbe Rezept enthält
- **THEN** erhält der Benutzer einen HTTP 422 mit der Fehlermeldung "Rezept «Name» ist mehrfach angegeben"

### Requirement: Eindeutige Einzelzutaten pro Mahlzeit

Ein MealItem SHALL innerhalb eines Meals eine Zutat referenzieren, die nicht bereits durch ein anderes MealItem desselben Meals als Einzelzutat referenziert wird.

#### Scenario: Erfolgreiches Hinzufügen einer neuen Zutat
- **WHEN** ein Benutzer eine Einzelzutat zu einem Meal hinzufügt, die noch nicht als standalone MealItem in diesem Meal enthalten ist
- **THEN** wird das MealItem erfolgreich angelegt

#### Scenario: Duplikat einer Zutat wird abgelehnt
- **WHEN** ein Benutzer versucht, eine Einzelzutat zu einem Meal hinzuzufügen, die bereits als standalone MealItem in diesem Meal existiert
- **THEN** erhält der Benutzer einen HTTP 422 mit der deutschen Fehlermeldung "Diese Zutat ist bereits in dieser Mahlzeit enthalten"

#### Scenario: Zutat aus Rezept + standalone Zutat sind erlaubt
- **WHEN** ein Meal ein Rezept enthält, das eine bestimmte Zutat als RecipeItem führt, UND ein Benutzer versucht, dieselbe Zutat als standalone MealItem hinzuzufügen
- **THEN** wird das standalone MealItem erfolgreich angelegt (RecipeItems sind keine MealItems)

### Requirement: Bulk-Operationen mit Duplikat-Prüfung

Bulk-Endpunkte (sync_ref_meal, link_meal, copy_items_from_plan) SHALL vor dem Löschen bestehender Items prüfen, ob die Quell-Items Duplikate enthalten würden. Bei Duplikat SHALL die gesamte Operation mit einem Rollback abgebrochen werden.

#### Scenario: Sync eines RefMeals ohne Duplikate
- **WHEN** ein Benutzer ein RefMeal auf ein verknüpftes Meal synct und das RefMeal keine doppelten Rezepte/Zutaten enthält
- **THEN** werden alle Items im Ziel-Meal ersetzt

#### Scenario: Sync eines RefMeals mit Duplikaten
- **WHEN** ein Benutzer ein RefMeal auf ein verknüpftes Meal synct, aber das RefMeal selbst doppelte Rezepte oder Zutaten enthält
- **THEN** erhält der Benutzer einen HTTP 422 und keine Items werden geändert

### Requirement: Frontend-Visualisierung im RecipeSearchDialog

Der RecipeSearchDialog SHALL dem Benutzer anzeigen, welche Rezepte und Einzelzutaten bereits im aktuellen Meal enthalten sind.

#### Scenario: Bereits enthaltenes Rezept ist ausgegraut
- **WHEN** der RecipeSearchDialog geöffnet wird und ein Suchergebnis bereits als MealItem im aktuellen Meal existiert
- **THEN** wird das Ergebnis mit verminderter Opazität (opacity-50) dargestellt und ist nicht auswählbar, mit dem Hinweistext "Bereits enthalten"
