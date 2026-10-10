## ADDED Requirements

### Requirement: Rollenmenge in jeder Einheit
Die Menge pro Person einer Buffet-Rolle SHALL in Gramm (bei Getränken Milliliter), in einer gemeinsamen Portion oder in einem Standardmaß angezeigt und eingegeben werden können. Gemeinsame Portion heißt: ein Portionsname, den alle gewählten Zutaten-Items mit Gewicht haben (Rezept-Items: „Portion“ = Rezeptportion). Gespeichert und berechnet wird die Rollenmenge weiter in Gramm/ml (`Meal.buffet_role_amounts`), zusätzlich mit der Anzeige-Einheit der Rolle (`{ amount_g, unit }`). Eine Eingabe „n {Einheit}/Person“ MUST nach Item-Anteilen verteilt und pro Item mit dessen eigenem Gewicht umgerechnet werden. Die Rollen-Optionen SHALL im Backend-Preview mitgeliefert werden. Wird ein Item ohne die Rollen-Portion hinzugewählt, MUST die Rolle mengenerhaltend auf Gramm wechseln und einen Hinweis zeigen.

#### Scenario: Brot in Stück pro Person
- **GIVEN** die Rolle „Brot“, gewählt „Brötchen“ (Stück 60 g) und „Laugenbrötchen“ (Stück 80 g) zu je 50 %
- **WHEN** ein angemeldeter Nutzer mit Bearbeitungsrecht „2 Stück/Person“ eingibt
- **THEN** SHALL die Vorschau 140 g pro Person zeigen, Gramm sichtbar: „2 Stück (140 g)“

#### Scenario: Portion nicht bei allen Items
- **GIVEN** die Rolle „Brot“ steht auf „2 Stück/Person“
- **WHEN** „Bauernbrot“ ohne Portion „Stück“ hinzugewählt wird
- **THEN** SHALL die Rolle auf Gramm wechseln, die Menge bleibt erhalten, und ein Hinweis erscheint

#### Scenario: Wiederherstellung
- **GIVEN** ein gespeichertes Buffet mit „Brot: 2 Stück/Person“
- **WHEN** der Wizard erneut geöffnet wird
- **THEN** SHALL die Rolle wieder „2 Stück (140 g)/Person“ zeigen

### Requirement: Item-Einheit und Speicherung mit Einheit
Jedes gewählte Zutaten-Item SHALL eine Einheit haben. Startwert: Rollen-Einheit, falls das Item sie hat, sonst Standardportion mit Gewicht, sonst Gramm/ml. Der Nutzer kann sie im Wizard frei wählen und Item-Mengen darin eingeben; das Frontend rechnet in den Anteil der Rolle zurück. `BuffetSaveIn.selections[]` SHALL optional `portion_id` oder `standard_measure_key` tragen. Beim Speichern MUST das Zutaten-`MealItem` diese Einheit mit `quantity = Gramm pro Person ÷ Gewicht der Einheit` (zwei Nachkommastellen) erhalten, ohne Einheit Gramm bzw. Milliliter.

#### Scenario: Brötchen als Stück gespeichert
- **GIVEN** die Rolle „Brot“ mit 120 g pro Person, „Brötchen“ (Stück 60 g) mit 75 % Anteil und Einheit „Stück“
- **WHEN** ein angemeldeter Nutzer mit Bearbeitungsrecht das Buffet speichert
- **THEN** SHALL das `MealItem` „Brötchen“ Portion „Stück“ und `quantity = 1.5` haben
- **AND** die Einkaufsliste weist dieselben Gramm aus wie bei Speicherung in Gramm

#### Scenario: Ohne Bearbeitungsrecht
- **WHEN** ein Nutzer ohne Bearbeitungsrecht oder ein nicht angemeldeter Client das Buffet speichern will
- **THEN** MUST die API mit 403 bzw. 401 antworten
