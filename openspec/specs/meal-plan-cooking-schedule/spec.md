## Purpose
Diese Spec definiert die chronologische Kochplan-Ausgabe und ihre konsistente Berechnung.

## Requirements

### Requirement: Kochplan verwendet aktive Meal-Plan-Daten

Der Kochplan SHALL dieselben aktiven Items, Overrides und `effective_portions` wie die übrigen
Food-Ausgaben verwenden. Ausgeschlossene Items fehlen vollständig; Mengen-Overrides und
konsistente Ausgabe-Rundung werden angewendet.

#### Scenario: Kochplan übernimmt Override
- **WHEN** ein MealItem ein ausgeschlossenes oder mengenüberschriebenes RecipeItem enthält
- **THEN** entspricht der Kochplan der gemeinsamen Berechnung

### Requirement: Kochplan-Endpunkt liefert chronologische Zubereitungsübersicht

Das System SHALL einen Endpunkt `GET /api/meal-plans/{id}/cooking-schedule/` bereitstellen, der für einen Essensplan eine nach Tagen gruppierte, chronologisch nach berechneter Startzeit sortierte Liste aller zu kochenden Rezepte zurückgibt.

Zusätzlich zu den bestehenden Feldern SHALL jeder Tages-Eintrag (CookingScheduleDay) folgende Felder enthalten:
- `day_start_time` (str): Uhrzeit der frühesten Startzeit an diesem Tag
- `day_end_time` (str): Uhrzeit der spätesten Servierzeit an diesem Tag
- `day_duration_minutes` (int): Gesamt-Kochdauer in Minuten (von erster Startzeit bis letzte Servierzeit)
- `portions` (float): Personenanzahl aus `effective_portions`
- `day_nutritional_tags` (list): Alle NutritionalTags die an diesem Tag in Rezepten oder Zutaten vorkommen

Zusätzlich SHALL der Response-Header (CookingScheduleOut) folgende Felder enthalten:
- `total_cost_eur` (float): Gesamtkosten aller Rezepte
- `total_cost_with_reserve` (float): Gesamtkosten inkl. Reservefaktor
- `total_energy_kcal` (float): Gesamtenergie aller Rezepte
- `norm_portions` (float): Planweite Referenz für die Ausgabe

#### Scenario: Erfolgreicher Abruf des Kochplans mit neuen Feldern

- **WHEN** ein authentifizierter Nutzer mit Zugriff auf den Essensplan den Endpunkt aufruft
- **THEN** liefert das System eine Liste von Tagen, jeweils mit den zu kochenden Rezepten dieses Tages
- **AND** jeder Tag enthält `day_start_time`, `day_end_time`, `day_duration_minutes`, `portions`, `day_nutritional_tags`
- **AND** der Response enthält `total_cost_eur`, `total_cost_with_reserve`, `total_energy_kcal`, `norm_portions`

#### Scenario: Essensplan existiert nicht

- **WHEN** ein Nutzer den Endpunkt mit einer nicht existierenden Essensplan-ID aufruft
- **THEN** antwortet das System mit HTTP 404

#### Scenario: Kein Zugriff auf den Essensplan

- **WHEN** ein Nutzer den Endpunkt für einen Essensplan aufruft, auf den er keinen Zugriff hat
- **THEN** antwortet das System mit HTTP 403

### Requirement: Startzeit rückwärts von der Servierzeit berechnen

Das System SHALL die Startzeit jedes Rezepts als `Servierzeit − (preparation_time + execution_time)` berechnen, wobei die Zubereitungszeit-Buckets auf ihre Obergrenzen in Minuten abgebildet werden.

#### Scenario: Bucket-Obergrenzen für execution_time

- **WHEN** ein Rezept eine `execution_time` von `less_30`, `30_60`, `60_90` oder `more_90` hat
- **THEN** rechnet das System mit 30, 60, 90 bzw. 120 Minuten

#### Scenario: Bucket-Obergrenzen für preparation_time

- **WHEN** ein Rezept eine `preparation_time` von `none`, `less_15`, `15_30`, `30_60` oder `more_60` hat
- **THEN** rechnet das System mit 0, 15, 30, 60 bzw. 90 Minuten

#### Scenario: Startzeit ergibt sich aus Summe von Vorbereitung und Kochzeit

- **WHEN** ein Rezept um 18:00 Uhr serviert wird, mit `preparation_time=15_30` (30 min) und `execution_time=30_60` (60 min)
- **THEN** berechnet das System eine Startzeit von 16:30 Uhr (90 Minuten vor der Servierzeit)

### Requirement: Gruppierung pro Tag

Das System SHALL die Rezepte pro Kalendertag (basierend auf der Servierzeit der Mahlzeit) gruppieren.

#### Scenario: Rezepte mehrerer Tage werden getrennt

- **WHEN** ein Essensplan Mahlzeiten an mehreren Tagen enthält
- **THEN** liefert das System für jeden Tag eine eigene Gruppe mit den Rezepten dieses Tages

#### Scenario: Deterministische Reihenfolge bei gleicher Startzeit

- **WHEN** zwei Rezepte am selben Tag dieselbe berechnete Startzeit haben
- **THEN** sortiert das System sie sekundär alphabetisch nach Rezeptname

### Requirement: Ausschluss nicht-kochbarer Mahlzeiten

Das System SHALL Mahlzeiten ohne Servierzeit (`start_datetime` ist null) und externe Mahlzeiten (`is_external=True`) aus dem Kochplan ausschließen.

#### Scenario: Mahlzeit ohne Servierzeit

- **WHEN** eine Mahlzeit keine `start_datetime` hat
- **THEN** erscheinen ihre Rezepte nicht im Kochplan

#### Scenario: Externe Mahlzeit

- **WHEN** eine Mahlzeit als extern markiert ist (`is_external=True`)
- **THEN** erscheinen ihre Rezepte nicht im Kochplan

### Requirement: Portionen pro Rezept ableiten

Das System SHALL die Portionen eines Kochplan-Eintrags aus `Meal.effective_portions` ableiten.

#### Scenario: Mahlzeit mit Portionen-Override

- **WHEN** eine Mahlzeit ein `override_portions` gesetzt hat
- **THEN** zeigt der Kochplan-Eintrag diese effektive Portionszahl

#### Scenario: Mahlzeit ohne Override

- **WHEN** eine Mahlzeit kein `override_portions` hat
- **THEN** zeigt der Kochplan-Eintrag die planweite `norm_portions` als effektive Portionszahl

### Requirement: Interaktive Kochplan-Ansicht im Frontend

Das System SHALL im Food-Frontend eine Kochplan-Seite bereitstellen, die pro Tag gruppiert die berechneten Einträge anzeigt, erreichbar über einen „Kochplan"-Button auf der Essensplan-Detailseite.

Zusätzlich zu den bestehenden Feldern SHALL die Seite anzeigen:
- Personenanzahl prominent im Header
- Allergen-Badges pro Rezept (aus `nutritional_tags`)
- Tägliche Gesamt-Kochzeit

#### Scenario: Kochplan-Seite anzeigen

- **WHEN** ein Nutzer auf der Essensplan-Detailseite den „Kochplan"-Button klickt
- **THEN** öffnet sich die Kochplan-Seite mit den pro Tag gruppierten Einträgen
- **AND** jede Zeile zeigt Startzeit, Servierzeit, Rezeptname (verlinkt zur Rezeptdetailseite), Zubereitungsdauer, Mahlzeit-Typ als Badge, Portionen und ggf. Allergen-Badges

#### Scenario: Hinweis bei ausgeschlossenen Mahlzeiten

- **WHEN** Mahlzeiten wegen fehlender Servierzeit aus dem Kochplan ausgeschlossen wurden
- **THEN** zeigt die Seite einen Hinweis, dass Mahlzeiten ohne Servierzeit nicht enthalten sind

### Requirement: Druckansicht des Kochplans

Das System SHALL eine dedizierte Druck-Route `/meal-plans/:id/cooking-schedule/print` bereitstellen, die ohne App-Layout und mit allen Sektionen ausgeklappt A4-optimiert darstellt. Die Druckansicht SHALL im Kochbuch-Layout erscheinen.

Jedes Rezept SHALL auf einer neuen Seite beginnen (`page-break-before: always`). Jede Rezeptkarte SHALL enthalten:
- Rezepttitel
- Zutatenliste mit skalierten Mengen, Einheiten und Notizen
- Strukturierte Zubereitungsschritte
- Allergen-Badges
- Kosten pro Rezept
- Nährwerte pro Portion (kcal, Protein, Fett, Kohlenhydrate)

Jeder Tag SHALL im Kopf enthalten:
- Personenanzahl
- Tägliche Gesamt-Kochzeit (von-bis)
- Allergen-Zusammenfassung des Tages

#### Scenario: Druckansicht öffnen

- **WHEN** ein Nutzer die Druckansicht des Kochplans öffnet
- **THEN** wird der Kochplan ohne FoodLayout, ohne Navigation und mit allen Rezepten vollständig ausgeklappt dargestellt
- **AND** jedes Rezept beginnt auf einer neuen Seite
