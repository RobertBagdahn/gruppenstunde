## ADDED Requirements

### Requirement: RefMeal erstellen
Das System SHALL erlauben, pro MealPlan und meal_type maximal ein RefMeal (Meal mit `is_reference=True`) zu erstellen. Ein RefMeal hat keinen konkreten Zeitpunkt (`start_datetime=NULL`).

#### Scenario: RefMeal für Frühstück erstellen
- **WHEN** User ein RefMeal mit `meal_type=breakfast` für einen MealPlan erstellt
- **THEN** wird ein Meal mit `is_reference=True`, `start_datetime=NULL` und dem angegebenen `meal_type` erstellt

#### Scenario: Duplikat verhindern
- **WHEN** bereits ein RefMeal mit `meal_type=breakfast` für den Plan existiert und User ein zweites erstellen will
- **THEN** wird ein 409 Conflict zurückgegeben

### Requirement: Meals mit RefMeal verknüpfen
Das System SHALL erlauben, konkrete Meals mit einem RefMeal gleichen Typs zu verknüpfen (`ref_meal` FK + `is_synced=True`). Das Verknüpfen und Entkoppeln MUSS einzeln pro Meal möglich sein.

#### Scenario: Meal verknüpfen
- **WHEN** User ein konkretes Meal (breakfast) mit dem RefMeal (breakfast) verknüpft
- **THEN** wird `ref_meal` auf das RefMeal gesetzt und `is_synced=True`

#### Scenario: Meal entkoppeln
- **WHEN** User ein verknüpftes Meal entkoppelt
- **THEN** wird `is_synced=False` gesetzt, die bestehenden MealItems bleiben erhalten

#### Scenario: Alle Meals eines Typs verknüpfen
- **WHEN** User "alle verknüpfen" für einen meal_type wählt
- **THEN** werden alle Meals dieses Typs im Plan mit dem RefMeal verknüpft und synchronisiert

### Requirement: RefMeal synchronisieren
Das System SHALL bei explizitem Sync-Aufruf alle MealItems des RefMeals auf alle verknüpften Meals (is_synced=True) kopieren. Bestehende Items der Ziel-Meals werden dabei ersetzt.

#### Scenario: Sync auf verknüpfte Meals
- **WHEN** User den Sync-Endpunkt für ein RefMeal aufruft
- **THEN** werden bei allen Meals mit `ref_meal=dieses RefMeal` und `is_synced=True` die MealItems gelöscht und durch Kopien der RefMeal-Items ersetzt (gleiche recipe/ingredient FKs, gleiche Faktoren)

#### Scenario: Entkoppelte Meals werden nicht synchronisiert
- **WHEN** ein Meal `is_synced=False` hat aber `ref_meal` gesetzt
- **THEN** wird dieses Meal beim Sync ignoriert

### Requirement: RefMeal löschen
Das System SHALL beim Löschen eines RefMeals alle verlinkten Meals entkoppeln (ref_meal=NULL, is_synced=False) ohne deren Items zu löschen.

#### Scenario: RefMeal löschen entkoppelt Meals
- **WHEN** User ein RefMeal löscht
- **THEN** werden alle Meals mit `ref_meal=dieses RefMeal` auf `ref_meal=NULL, is_synced=False` gesetzt und behalten ihre aktuellen MealItems

### Requirement: MealItem-Faktor auf RefMeal
Das System SHALL MealItems auf RefMeals mit einem `factor`-Feld versehen, das bei der Synchronisation auf die Ziel-Meals übertragen wird. Der Faktor skaliert die Rezept-Portionen (z.B. ×1.2 bedeutet 120% einer Portion).

#### Scenario: Faktor wird synchronisiert
- **WHEN** ein RefMeal ein Item mit `factor=1.5` hat und synchronisiert wird
- **THEN** haben die kopierten MealItems auf den Ziel-Meals ebenfalls `factor=1.5`

### Requirement: „Für alle übernehmen"-Button propagiert Änderungen an alle synchronisierten Mahlzeiten

Der „Für alle übernehmen"-Button auf einer Referenzmahlzeit SHALL einen API-Call auslösen der alle `is_synced=True`-Mahlzeiten mit den Inhalten der Referenzmahlzeit aktualisiert. Nach dem API-Call SHALL der TanStack Query Cache für den betroffenen Essensplan invalidiert werden, sodass die Änderungen sofort sichtbar sind.

#### Scenario: Für-alle-übernehmen erfolgreich

- **WHEN** der Nutzer auf „Für alle übernehmen" klickt
- **THEN** wird `POST /api/meal-plans/{plan_id}/ref-meals/{ref_meal_id}/apply/` aufgerufen
- **THEN** alle Mahlzeiten mit `ref_meal=ref_meal_id` und `is_synced=True` erhalten die gleichen MealItems wie die Referenzmahlzeit
- **THEN** die Essensplan-Ansicht aktualisiert sich sofort (Cache-Invalidierung)

#### Scenario: Feedback nach erfolgreichem Sync

- **WHEN** der Sync erfolgreich abgeschlossen ist
- **THEN** erscheint eine Toast-Meldung: „{N} Mahlzeiten wurden aktualisiert"

#### Scenario: Keine synchronisierten Mahlzeiten

- **WHEN** der Nutzer auf „Für alle übernehmen" klickt aber keine `is_synced=True`-Mahlzeiten existieren
- **THEN** erscheint ein Hinweis: „Keine synchronisierten Mahlzeiten vorhanden"
