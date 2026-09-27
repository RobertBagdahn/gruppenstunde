## ADDED Requirements

### Requirement: Keine automatische Portionsanlage beim Speichern von Mahlzeit-Einträgen
Die Endpunkte zum Speichern von Mahlzeit-Einträgen (`POST /api/meal-plans/{plan_id}/meals/{meal_id}/wizard-items/`, `.../meals/wizard-items/bulk/`) MUST NOT Portionen anlegen. Wird eine Zutat mit einer Einheit gespeichert, die weder Gramm noch Milliliter ist und für die die Zutat keine aktive Portion besitzt, MUST das System mit 422 und der Meldung „Einheit {Einheit} ist für {Zutat} nicht definiert.“ antworten.

#### Scenario: Unbekannte Einheit
- **WHEN** ein Eintrag „Bauernbrot“ mit Einheit „Tasse“ gespeichert wird und „Bauernbrot“ keine Tassen-Portion hat
- **THEN** antwortet das System mit 422 und legt keine Portion an

#### Scenario: Gramm ist immer erlaubt
- **WHEN** ein Eintrag mit Einheit Gramm gespeichert wird
- **THEN** wird er ohne Portionsprüfung gespeichert

#### Scenario: Nicht angemeldeter Nutzer
- **WHEN** ein nicht angemeldeter Nutzer den Endpunkt aufruft
- **THEN** antwortet das System mit 403 („Sitzung nicht gefunden“) und legt nichts an

### Requirement: Plausibilitätswarnung pro Person
Das System SHALL für Zutaten-Einträge in Mahlzeiten Warnungen erzeugen, wenn die aufgelöste Menge pro Person mehr als **1500 g** beträgt oder bei stückartigen Portionen (Stück, Scheibe, Brötchen o. Ä.) die Anzahl pro Person **50** übersteigt. Warnungen MUST das Speichern nicht verhindern. Eine Warnung `QuantityWarningOut` MUST `meal_item_id`, `ingredient_name`, `per_person_value`, `per_person_unit`, `total_value`, `total_unit` und eine deutsche Meldung enthalten. Die Prüfung MUST in einem Service (`planner/services/quantity_plausibility.py`) liegen und von allen genannten Stellen verwendet werden.

#### Scenario: Stück statt Gramm
- **WHEN** ein Eintrag „Brötchen“ mit `quantity=800` und Einheit „Stück“ für 10 Personen gespeichert wird
- **THEN** enthält die Antwort eine Warnung „Brötchen: 800 Stück pro Person (8000 insgesamt) – bitte Menge und Einheit prüfen.“

#### Scenario: Große, aber plausible Menge
- **WHEN** ein Eintrag „Kartoffeln“ mit 400 g pro Person gespeichert wird
- **THEN** enthält die Antwort keine Warnung

### Requirement: Warnungen an Mahlzeit, Buffet und Einkaufsliste
Die Antworten der Mahlzeit-Eintrag-Endpunkte, des Buffet-Endpunkts und der Einkaufslisten-Erzeugung aus einem Essensplan SHALL ein Feld `warnings: list[QuantityWarningOut]` enthalten. Das Frontend SHALL Warnungen im MealSlot am betroffenen Eintrag (Warn-Icon mit Text) und in der Einkaufsliste als Hinweisbox oberhalb der Liste anzeigen.

#### Scenario: Einkaufsliste mit Ausreißer
- **WHEN** eine Einkaufsliste aus einem Plan erzeugt wird, der einen Eintrag mit 2 kg Kartoffeln pro Person enthält
- **THEN** zeigt die Einkaufsliste oberhalb der Positionen „1 Menge wirkt unplausibel“ mit Link zur Mahlzeit

#### Scenario: Keine Warnungen
- **WHEN** alle Einträge plausibel sind
- **THEN** ist `warnings` eine leere Liste und es wird kein Hinweis angezeigt
