# recipe-add-to-meal-plan Specification

## Purpose
Anforderungen an recipe add to meal plan: Rezept von der Detailseite in einen Essensplan legen; Nur beschreibbare Pläne wählbar; Mehrfachauswahl von Mahlzeiten und Portionen.
## Requirements
### Requirement: Rezept von der Detailseite in einen Essensplan legen
Die Rezeptdetailseite SHALL im Kopfband und in der Mobile-Aktionsleiste die Aktion „Zum Essensplan“ anbieten. Die Aktion SHALL nicht in Rezeptlisten oder `RecipeCard` erscheinen.

#### Scenario: Eingeloggter Nutzer öffnet den Dialog
- **WHEN** ein eingeloggter Nutzer auf „Zum Essensplan“ tippt
- **THEN** öffnet sich ein Dialog mit den Schritten Plan, Tag/Mahlzeit und Portionen

#### Scenario: Anonymer Besucher
- **WHEN** ein nicht eingeloggter Besucher auf „Zum Essensplan“ tippt
- **THEN** wird er zum Login geleitet und danach zur Rezeptseite zurückgeführt

### Requirement: Nur beschreibbare Pläne wählbar
Der Dialog MUST ausschließlich Pläne anbieten, für die der Nutzer Bearbeitungsrecht (`can_edit`) hat.

#### Scenario: Geteilter Plan ohne Schreibrecht
- **WHEN** der Nutzer einen Plan nur lesen darf
- **THEN** erscheint dieser Plan nicht in der Auswahl

#### Scenario: Kein Plan vorhanden
- **WHEN** der Nutzer keinen beschreibbaren Plan hat
- **THEN** bietet der Dialog „Neuen Plan anlegen“ an und legt nach dem Anlegen mit der Auswahl fort

### Requirement: Mehrfachauswahl von Mahlzeiten und Portionen
Der Nutzer SHALL mehrere Mahlzeiten eines Plans in einem Vorgang auswählen können. Die Portionszahl MUST mit den Normportionen des Plans vorbelegt und änderbar sein.

#### Scenario: Zwei Mahlzeiten gleichzeitig
- **WHEN** der Nutzer Mittagessen an Tag 1 und Tag 3 auswählt und bestätigt
- **THEN** wird das Rezept in beide Mahlzeiten mit den gewählten Portionen eingefügt

### Requirement: Duplikate pro Mahlzeit blockieren
Ein Rezept MUST pro Mahlzeit höchstens einmal vorkommen. Bereits belegte Mahlzeiten SHALL im Dialog deaktiviert und erklärt werden; das Backend MUST einen doppelten Eintrag ablehnen (bestehende Prüfung `raise_if_duplicate_meal_item`, HTTP 422).

#### Scenario: Rezept liegt schon in der Mahlzeit
- **WHEN** das Rezept bereits in der Mahlzeit liegt
- **THEN** ist die Mahlzeit nicht auswählbar und zeigt den Hinweis „Bereits enthalten“

### Requirement: Rückmeldung nach dem Hinzufügen
Nach erfolgreichem Hinzufügen SHALL ein Toast mit „Zum Plan“ und „Rückgängig“ erscheinen; der Nutzer bleibt auf der Rezeptseite.

#### Scenario: Rückgängig
- **WHEN** der Nutzer innerhalb der Rückgängig-Frist auf „Rückgängig“ tippt
- **THEN** werden die soeben angelegten Einträge wieder entfernt
