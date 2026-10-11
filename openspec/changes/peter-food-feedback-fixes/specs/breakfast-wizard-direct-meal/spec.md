## ADDED Requirements

### Requirement: Frühstücks-Extras behalten ihre ausgewählte Portion

Die Single- und Bulk-Wizard-Endpunkte SHALL eine über `portion_id` gewählte Portion auflösen, validieren, dass sie zu der ausgewählten Zutat gehört, und sie am `MealItem` speichern. Die Portionseinheit SHALL die gespeicherte Einheit bestimmen. Der Food-Frontend-Wizard SHALL die Menge und Portion eines Extras beim Speichern mitsenden und beim Wiederöffnen Namen und Portion wiederherstellen. Für die kcal-Berechnung SHALL das Frontend das vertrauenswürdige Portionsgewicht in Gramm verwenden; unbekanntes Gewicht SHALL nicht als Grammmenge geraten werden.

#### Scenario: Extra mit Stückportion speichern

- **GIVEN** ein Frühstücks-Extra hat eine aktive Portion `Stück` mit vertrauenswürdigem Gewicht 50 g
- **WHEN** der Nutzer 2 Stück als Extra auswählt und den Frühstücks-Wizard speichert
- **THEN** SHALL das MealItem die ausgewählte `portion_id`, Menge 2 und die Einheit der Stückportion enthalten
- **AND** SHALL die für die Vorschau verwendete Grammmenge 100 g betragen

#### Scenario: Portion gehört zu anderer Zutat

- **GIVEN** eine Anfrage enthält eine Portion, die nicht zu der ausgewählten Zutat gehört
- **WHEN** der Wizard speichert
- **THEN** SHALL der Backend-Endpunkt HTTP 422 zurückgeben und keine teilweise Änderung vornehmen

#### Scenario: Extra beim Wiederöffnen wiederherstellen

- **GIVEN** ein Frühstücks-Extra wurde mit Namen und Stückportion gespeichert
- **WHEN** der Frühstücks-Wizard erneut geöffnet wird
- **THEN** SHALL die Extra-Zeile den echten Zutatennamen, die ausgewählte Portion und die gespeicherte Menge zeigen
