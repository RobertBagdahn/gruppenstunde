## ADDED Requirements

### Requirement: Varianten als eigenständige MealItems

Das System SHALL Rezept-Varianten (Austausch-Gruppen-Kombinationen und optionale Zutaten) als eigenständige `MealItem`-Einträge speichern, nicht über ein separates Split-Model. Jede Variante hat einen eigenen Faktor (Anteil an `effectivePortions`) und eine Liste der aktiven RecipeItem-IDs.

#### Scenario: Recipe mit Austausch-Gruppe erzeugt zwei Varianten-Items

- **WHEN** ein Planer ein Rezept mit einer Austausch-Gruppe (Parmesan, Hefeflocken) und 25 Portionen in eine Mahlzeit einplant und 15 Portionen Parmesan, 10 Portionen Hefeflocken verteilt
- **THEN** erstellt das System zwei `MealItem`-Einträge: Parmesan mit `factor=0.6` und `active_recipe_item_ids=[parmesan_id]`, Hefeflocken mit `factor=0.4` und `active_recipe_item_ids=[hefe_id]`

#### Scenario: Recipe mit optionaler Zutat erzeugt zwei Varianten-Items

- **WHEN** ein Planer ein Rezept mit optionalem Harzer Käse und 25 Portionen einplant und 18 Portionen mit Käse, 7 ohne Käse verteilt
- **THEN** erstellt das System zwei `MealItem`-Einträge: "mit Harzer Käse" mit `factor=0.72` und `active_recipe_item_ids=[kaese_id]`, "ohne Harzer Käse" mit `factor=0.28` und `active_recipe_item_ids=[]` (Käse nicht aktiv)

#### Scenario: Kombinierte Varianten bei mehreren Austausch-Gruppen

- **WHEN** ein Rezept zwei Austausch-Gruppen (Käse: Parmesan/Hefeflocken, Gemüse: Brokkoli/Spinat) und eine optionale Zutat hat
- **THEN** zeigt der Dialog alle 2×2×2=8 Kombinationen an. Der Planer verteilt 25 Portionen über die Slider. Beim Speichern werden nur Varianten mit portions > 0 als MealItems angelegt.

### Requirement: Factor als Verhältnis

`factor` auf `MealItem` SHALL den Anteil der `effectivePortions` repräsentieren, den dieses Item abdeckt. Ein factor von 0,33 bedeutet 33% der Personen/Portionen erhalten diese Variante.

#### Scenario: Factor = energy_kcal-Skalierung

- **WHEN** der Nutzer ein Varianten-Item mit `factor=0.5` und `effectivePortions=20` im Tagesplan betrachtet
- **THEN** zeigt das System Energie/Kosten basierend auf dem Rezept-Cache × 0.5 an (mit Delta für aktive RecipeItems)

### Requirement: Batch-Erzeugung von Varianten

Das System SHALL einen `POST /api/meal-plans/{id}/meals/{mealId}/items/batch/`-Endpunkt bereitstellen, der mehrere MealItems atomar in einer Transaktion erzeugt. Alle Items erhalten automatisch dieselbe `variant_group_id` (UUID).

#### Scenario: Batch-Erzeugung erfolgreich

- **WHEN** ein Planer 3 Varianten-Items per Batch-API sendet
- **THEN** werden alle 3 Items atomar erstellt, jedes mit derselben `variant_group_id`, und als Array von `MealItemOut`-Objekten zurückgegeben

#### Scenario: Batch-Erzeugung mit factor < 0.01

- **WHEN** ein Planer ein Varianten-Item mit `factor=0.005` sendet
- **THEN** gibt das Backend HTTP 422 zurück mit Fehlermeldung "Der Faktor muss mindestens 0,01 betragen."

### Requirement: Inline Factor-Edit

Das System SHALL es ermöglichen, den Factor eines MealItems direkt im Tagesplan zu editieren. Der bestehende `PATCH /api/meal-plans/{id}/meal-items/{itemId}/`-Endpunkt akzeptiert dazu den Parameter `factor`.

#### Scenario: Factor erfolgreich aktualisiert

- **WHEN** ein Planer den Factor eines Varianten-Items von 0,33 auf 0,5 ändert
- **THEN** wird der neue Factor gespeichert, und die Energie/Kosten des Items werden neu berechnet

#### Scenario: Factor außerhalb gültigen Bereichs

- **WHEN** ein Planer factor < 0.0 oder factor > 1.0 setzt
- **THEN** gibt das Backend HTTP 422 zurück

### Requirement: Ausblenden von Items mit Faktor < 0.01

Die Frontend-Tagesplan-Ansicht SHALL MealItems mit `factor < 0.01` standardmäßig ausblenden. Die Items bleiben in der Datenbank erhalten.

#### Scenario: Item mit very small factor unsichtbar

- **WHEN** ein MealItem `factor=0.005` hat
- **THEN** wird es in der Tagesplan-Ansicht nicht angezeigt

### Requirement: Darstellung eingerückt unter Rezept

Das Frontend SHALL MealItems mit gleicher `variant_group_id` eingerückt unter dem Rezept-Titel anzeigen. Das erste Item (nach `id`) dient als "Header" und zeigt den Rezept-Titel; alle weiteren Items mit derselben `variant_group_id` werden eingerückt dargestellt.

#### Scenario: Varianten eingerückt im Tagesplan

- **WHEN** eine Mahlzeit ein Rezept mit 5 Varianten-Items (gleiche `variant_group_id`) enthält
- **THEN** zeigt der Tagesplan das erste Item als "Nudelauflauf" (volle Breite) und die übrigen 4 Items eingerückt darunter: "mit Parmesan", "mit Hefeflocken", etc.
