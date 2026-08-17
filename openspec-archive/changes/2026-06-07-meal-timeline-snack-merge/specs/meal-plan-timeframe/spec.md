# meal-plan-timeframe Specification — Delta

## MODIFIED Requirements

### Requirement: MealPlan hat Start- und End-Datetime

Ein MealPlan speichert `start_datetime` und `end_datetime` als optionale DateTimeFields.

#### Scenario: Neuer MealPlan mit Zeitraum erstellen
- **WHEN** ein MealPlan mit `start_datetime` und `end_datetime` erstellt wird
- **THEN** werden Tage aus dem Zeitraum abgeleitet und Meals automatisch generiert

#### Scenario: Erster Tag — Meals nach Startzeit filtern (ohne Drinks)
- **WHEN** `start_datetime.time()` nach dem Default-Start einer Mahlzeit liegt (z.B. Start 14:00, Frühstück 08:00)
- **THEN** wird diese Mahlzeit am ersten Tag NICHT generiert (betrifft alle 4 Mahlzeittypen: breakfast, lunch, dinner, snack, ohne drinks)

#### Scenario: Letzter Tag — Meals nach Endzeit filtern (ohne Drinks)
- **WHEN** `end_datetime.time()` vor dem Default-Ende einer Mahlzeit liegt (z.B. Ende 11:00, Mittagessen 13:00)
- **THEN** wird diese Mahlzeit am letzten Tag NICHT generiert (betrifft alle 4 Mahlzeittypen: breakfast, lunch, dinner, snack, ohne drinks)

#### Scenario: Mittlere Tage — voller Mahlzeiten-Satz
- **WHEN** ein Tag weder erster noch letzter Tag ist
- **THEN** werden alle Default-Meals generiert (Frühstück, Mittag, Abendessen, Snack)
