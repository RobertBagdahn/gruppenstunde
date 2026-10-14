# meal-plan-input-guardrails Specification

## Purpose
TBD - created by archiving change meal-plan-input-guardrails. Update Purpose after archive.
## Requirements
### Requirement: Plan-Einstellungen haben feste Wertebereiche
Das System SHALL beim Anlegen, Ändern und Duplizieren eines Essensplans folgende Wertebereiche durchsetzen (Vorschlagswerte, vom Owner freizugeben): `reserve_factor` von 1,0 bis 2,0, `activity_factor` von 1,0 bis 2,5, jeder Wert in `day_part_factors` von 0 bis 1, Summe aller `day_part_factors` höchstens 1,5, `norm_portions` größer 0 bis 1000. Werte außerhalb MUST mit HTTP 422, einer deutschen Meldung mit dem erlaubten Bereich und `fields` abgelehnt werden; es wird nichts gespeichert. Bei PATCH SHALL nur die gesendeten Felder geprüft werden.

#### Scenario: Negativer Reservefaktor
- **GIVEN** ein angemeldeter Nutzer mit Bearbeitungsrecht für einen Plan
- **WHEN** er `PATCH /api/meal-plans/{id}/` mit `reserve_factor = -100` sendet
- **THEN** antwortet das System mit HTTP 422 und `fields` enthält `reserve_factor`
- **AND** der gespeicherte Reservefaktor bleibt unverändert

#### Scenario: Unrealistischer Aktivitätsfaktor
- **WHEN** ein Plan mit `activity_factor = 1e9` angelegt wird
- **THEN** antwortet das System mit HTTP 422 und legt keinen Plan an

#### Scenario: Negativer Tagesanteil
- **WHEN** `day_part_factors` den Wert `{"breakfast": -0.5}` enthält
- **THEN** antwortet das System mit HTTP 422 und `fields` enthält `day_part_factors`

#### Scenario: Summe der Tagesanteile zu groß
- **WHEN** `day_part_factors` die Werte 0,6 / 0,6 / 0,5 für Frühstück, Mittag und Abend enthält (Summe 1,7)
- **THEN** antwortet das System mit HTTP 422

#### Scenario: Gültige Grenzwerte
- **WHEN** ein Plan mit `reserve_factor = 2.0`, `activity_factor = 1.0` und `norm_portions = 1000` angelegt wird
- **THEN** wird der Plan gespeichert

#### Scenario: Duplizieren mit negativen Normportionen
- **WHEN** ein angemeldeter Nutzer `POST /api/meal-plans/{id}/duplicate/` mit `norm_portions = -5e9` sendet
- **THEN** antwortet das System mit HTTP 422 und legt keinen Plan an

#### Scenario: Unveränderter Altwert blockiert keine andere Änderung
- **GIVEN** ein Bestandsplan hat `reserve_factor = 3.0`
- **WHEN** der Nutzer nur den Plannamen ändert
- **THEN** wird die Änderung gespeichert

#### Scenario: Nicht angemeldet
- **WHEN** ein nicht angemeldeter Client einen Plan mit gültigen Werten anlegen will
- **THEN** antwortet das System mit HTTP 401

### Requirement: Mahlzeiten haben begrenzte Portionen und Tagesanteile
Das System SHALL für eine Mahlzeit `override_portions` als ganze Zahl von 1 bis 1000 oder `null` und `day_part_factor` von 0 bis 1 akzeptieren (Vorschlagswerte). Werte außerhalb MUST mit HTTP 422 und `fields` abgelehnt werden.

#### Scenario: Portionen-Override 0
- **WHEN** ein Nutzer mit Bearbeitungsrecht `override_portions = 0` für eine Mahlzeit sendet
- **THEN** antwortet das System mit HTTP 422 und die Mahlzeit bleibt unverändert

#### Scenario: Override zurücksetzen
- **WHEN** der Nutzer `override_portions = null` sendet
- **THEN** gilt wieder `norm_portions` des Plans

#### Scenario: Soll über 100 %
- **WHEN** `day_part_factor = 1.4` gesendet wird
- **THEN** antwortet das System mit HTTP 422

### Requirement: Mengen und Portionsgewichte sind begrenzt
Die Menge einer Einzelzutat SHALL größer 0 sein, und ihre aufgelöste Grammmenge pro Person (`quantity_g`) SHALL höchstens 100 000 g betragen (Vorschlagswert). Das gilt für das Anlegen und Ändern von MealItems, die Frühstücks- und Buffet-Wizard-Endpunkte und Referenzmahlzeit-Items. Ein Portionsgewicht `weight_g` SHALL größer 0 und höchstens 100 000 g sein. Zu große Werte MUST mit HTTP 422 statt mit einem Datenbankfehler beantwortet werden.

#### Scenario: Zu große Menge
- **WHEN** ein Nutzer eine Einzelzutat mit 250 000 g hinzufügt
- **THEN** antwortet das System mit HTTP 422 und `fields` enthält `quantity`
- **AND** es entsteht kein HTTP 500

#### Scenario: Große Menge in Portionen
- **WHEN** ein Nutzer 2 000 Stück einer Portion mit 100 g hinzufügt (200 000 g)
- **THEN** antwortet das System mit HTTP 422

#### Scenario: Menge null oder negativ
- **WHEN** eine Einzelzutat mit `quantity = 0` oder negativ gesendet wird
- **THEN** antwortet das System mit HTTP 422

#### Scenario: Wizard mit einer ungültigen Menge
- **WHEN** der Bulk-Wizard mehrere Items speichert und eines davon die Obergrenze überschreitet
- **THEN** antwortet das System mit HTTP 422 und speichert keines der Items

### Requirement: Planlänge und Mahlzeitenzahl sind begrenzt
Ein Essensplan SHALL höchstens 60 Kalendertage umfassen und höchstens 500 Mahlzeiten enthalten (Vorschlagswerte). Das System MUST beim Anlegen, Ändern des Zeitraums und Duplizieren den Zeitraum prüfen, bevor Mahlzeiten erzeugt werden, und beim Hinzufügen einzelner Mahlzeiten die Gesamtzahl prüfen.

#### Scenario: Zeitraum zu lang
- **WHEN** ein Nutzer einen Plan vom 01.01. bis 31.12. anlegt
- **THEN** antwortet das System mit HTTP 422 und `fields` enthält `end_datetime`
- **AND** es werden keine Mahlzeiten erzeugt

#### Scenario: Mahlzeitenlimit erreicht
- **GIVEN** ein Plan enthält 500 Mahlzeiten
- **WHEN** der Nutzer eine weitere Mahlzeit hinzufügt
- **THEN** antwortet das System mit HTTP 422 mit dem Hinweis auf die Höchstzahl

### Requirement: Food-Frontend verhindert ungültige Plan-Eingaben
Plan-Einstellungen, Plan-Assistent, „Portionen ändern“, „Soll ändern“ und Mengen-Dialoge im Food-Frontend SHALL dieselben Grenzen wie das Backend verwenden (Zod-Schema `mealPlan.ts` synchron zu Pydantic). Ungültige Werte MUST am Feld mit dem erlaubten Bereich gemeldet werden, und Speichern SHALL erst mit gültigen Werten möglich sein. 422-`fields` vom Server SHALL den Feldern zugeordnet werden.

#### Scenario: Reservefaktor außerhalb des Bereichs
- **WHEN** ein Nutzer in den Plan-Einstellungen den Reservefaktor 2,5 eingibt
- **THEN** zeigt das Feld „Erlaubt: 1,0 bis 2,0“ und es wird kein Request gesendet

#### Scenario: Serverfehler am Feld
- **WHEN** der Server mit HTTP 422 und `fields: ["activity_factor"]` antwortet
- **THEN** zeigt das Aktivitätsfaktor-Feld die Meldung des Servers

#### Scenario: Mobile Ansicht
- **WHEN** die Plan-Einstellungen bei 320 px Breite geöffnet werden
- **THEN** sind Feld und Bereichshinweis ohne horizontales Scrollen lesbar

### Requirement: Bestandsdaten außerhalb der Grenzen bleiben berechenbar
Berechnungen (Skalierung, Tagesbedarf, Nährwerte, Kosten, Einkaufsliste) SHALL Bestandswerte außerhalb der Grenzen zur Laufzeit auf den erlaubten Bereich begrenzen, damit keine negativen oder unbegrenzten Mengen entstehen. Ein lesender Management-Command `report_meal_plan_bounds` SHALL betroffene Pläne, Mahlzeiten und Einträge auflisten, ohne Daten zu ändern.

#### Scenario: Altplan mit negativem Reservefaktor
- **GIVEN** ein Bestandsplan hat `reserve_factor = -100`
- **WHEN** die Einkaufsliste berechnet wird
- **THEN** wird mit dem Reservefaktor 1,0 gerechnet und es entstehen keine negativen Mengen

#### Scenario: Bericht ohne Änderungen
- **WHEN** ein Admin `report_meal_plan_bounds` ausführt
- **THEN** listet der Bericht alle Werte außerhalb der Grenzen und ändert keine Daten
