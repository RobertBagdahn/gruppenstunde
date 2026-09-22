## ADDED Requirements

### Requirement: PortionPicker ersetzt natives Portions-Select

Der `PortionPicker` SHALL als gemeinsame Komponente fuer die Portionsauswahl dienen und das native `<select>` im `InlineIngredientEditor` sowie das shadcn `Select` im `IngredientQuantityDialog` ersetzen. Er SHALL ohne Suchfeld auskommen und gruppierte Abschnitte (Zutat / Standardmengen / Gramm) anzeigen. Jede Option SHALL den Portionsnamen (oder einen Fallback-Namen) links und das Gewicht (`formatGramsShort`) rechts darstellen.

#### Scenario: Portionen sortiert mit Name und Gewicht anzeigen
- **WHEN** eine Zutat mit Portionen `[{id: 5, name: "kleine (50g)", rank: 1, weight_g: 50}, {id: 6, name: "Stück", rank: 2, weight_g: 100, is_weight_trusted: false}]` im Picker geoeffnet wird
- **THEN** erscheinen beide Portionen im Abschnitt "Zutat" sortiert nach `rank`
- **THEN** jede Zeile zeigt links den Portionsnamen und rechts das Gewicht ("50 g" bzw. "100 g")

#### Scenario: Portion ohne vertrauenswuerdiges Gewicht
- **WHEN** eine Portion `is_weight_trusted: false` oder `weight_g == null` hat
- **THEN** zeigt die Zeile die Kennzeichnung "Gewicht fehlt"
- **THEN** die Option bleibt SHALL dennoch waehlbar sein

#### Scenario: Auswahl einer Portion
- **WHEN** der Nutzer eine Zutat-Portion im Picker auswaehlt
- **THEN** ruft der Picker `onSelect(portionId)` auf und schliesst sich

#### Scenario: Portion ohne Namen
- **WHEN** eine Portion keinen Namen hat
- **THEN** zeigt der Picker als Fallback den `measuring_unit_name` (bzw. "Gramm", wenn auch dieser fehlt)

#### Scenario: Mobile Nutzbarkeit
- **WHEN** der Picker auf einem Viewport ab 320px Breite geoeffnet wird
- **THEN** SHALL die Optionsliste scrollbar und ohne horizontales Abschneiden bedienbar sein

### Requirement: Portionswechsel bei unbekanntem Gewicht faellt auf 1 Portion zurueck

Waehlt der Nutzer im Editor eine neue Portion, waehrend das aktuelle Gesamtgewicht unbekannt ist (`<= 0` oder nicht-endlich), SHALL die neue Menge auf genau 1 Portion gesetzt werden statt auf 0.

#### Scenario: Wechsel von ungewichteter Portion
- **WHEN** ein Item mit unbekanntem Gewicht (Anzeige "Gewicht unbekannt") auf die Portion "kleine (50g)" mit `weight_g: 50` gewechselt wird
- **THEN** SHALL die neue Menge 1 (eine Portion) sein und die Zeile 50 g Gesamtgewicht ergeben

#### Scenario: Wechsel auf metrische Direktportion
- **WHEN** ein Item mit unbekanntem Gewicht auf eine metrische Direktportion mit `weight_g: 100` gewechselt wird
- **THEN** SHALL die neue Menge deren Grammwert (100) sein

### Requirement: Gramm-Abschnitt fuer direkte Gramm-Eingabe

Der Picker SHALL einen Abschnitt "Gramm" mit einem Eintrag fuer die direkte Gramm-Eingabe anbieten. Bei Auswahl SHALL das Item auf die `g`-Fallback-Portion der Zutat wechseln; existiert keine, SHALL `portion_id` auf `null` gesetzt werden (Gramm-Interpretation laut Model).

#### Scenario: Gramm-Eintrag gewaehlt
- **WHEN** der Nutzer den Eintrag "Gramm" im Abschnitt "Gramm" waehlt
- **THEN** SHALL das Item die `g`-Portion der Zutat (rank 9999) oder `portion_id: null` verwenden
- **THEN** SHALL die Mengeneingabe in Gramm erfolgen

#### Scenario: Zutat ohne g-Portion
- **WHEN** die Zutat keine `g`-Fallback-Portion besitzt
- **THEN** SHALL das Item mit `portion_id: null` arbeiten und die Menge direkt als Gramm interpretiert werden

### Requirement: Stueck-artige Portionen werden als Anzahl gezaehlt

Das Backend SHALL fuer jede Portion das Feld `is_piece_like` liefern (klassifiziert per `is_piece_like_name` aus dem Portionsnamen, unabhaengig von der Maßeinheit). Im Editor SHALL eine stueck-artige Portion immer als Anzahl interpretiert werden: Menge 1 bedeutet 1 Stueck, auch wenn die Maßeinheit der Portion Gramm ist.

#### Scenario: Stueck-Portion mit Gramm-Einheit
- **WHEN** eine Portion "kleine (50g)" mit `measuring_unit_name: "Gramm"` und `is_piece_like: true` gewaehlt wurde
- **THEN** zeigt die Zeile bei Menge 1 ein Gesamtgewicht von 50 g
- **THEN** wird beim Speichern `quantity: 1` uebermittelt (nicht der Grammwert)

#### Scenario: Wechsel auf eine Stueck-Portion ohne Gramm-Basis
- **WHEN** ein Item mit unbekanntem Gewicht auf eine stueck-artige Portion gewechselt wird
- **THEN** SHALL die Menge auf 1 (ein Stueck) gesetzt werden

#### Scenario: Gramm-Erhalt beim Wechsel zwischen gewichtsbekannten Stueck-Portionen
- **WHEN** ein Item mit bekanntem Gewicht von einer Stueck-Portion auf eine andere Stueck-Portion gewechselt wird
- **THEN** SHALL die Menge so umgerechnet werden, dass das Gesamtgewicht erhalten bleibt (100 g = 2 × "kleine (50g)")

#### Scenario: Metrische Portion ohne Stueck-Semantik
- **WHEN** eine Portion "100g" ohne `is_piece_like` gewaehlt ist
- **THEN** bleibt die bisherige Gramm-/Mengen-Interpretation unveraendert
