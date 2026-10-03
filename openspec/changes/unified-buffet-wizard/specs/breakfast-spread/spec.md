## MODIFIED Requirements

### Requirement: Wizard-Schritt Streichfett
Das System SHALL einen Schritt „Preset wählen“ vor die bestehenden Frühstücksschritte Basis, Streichfett, Belag, Extras, Getränke und Cockpit setzen. Der Frühstückswizard hat damit sieben Schritte. Der Streichfett-Schritt SHALL weiterhin zwischen Basis und Belag liegen und für jedes `buffet-fat`-Ingredient plus „Kein Fett“ einen Share-Slider anzeigen.

#### Scenario: Frühstückspreset ist Schritt 1
- **WHEN** ein Nutzer den Frühstücksassistenten neu öffnet
- **THEN** heißt Schritt 1 „Frühstück wählen“ und zeigt die bestätigten Frühstücksprofile
- **THEN** folgen nach Auswahl die bisherigen Schritte Basis, Streichfett, Belag, Extras, Getränke und Abschluss

#### Scenario: Schritt Streichfett bei vorhandenen Zutaten
- **WHEN** der Katalog `fat_ingredients` enthält
- **THEN** heißt Schritt 3 „Streichfett“ und steht zwischen Basis und Belag

#### Scenario: Schritt Streichfett ohne passende Zutaten
- **WHEN** der Katalog keine `fat_ingredients` enthält
- **THEN** zeigt Schritt 3 den Hinweis „Keine Streichfette verfügbar — lege Zutaten mit dem Tag buffet-fat an“
- **AND** der „Weiter“-Button bleibt aktiv

#### Scenario: Default-Verteilung beim ersten Öffnen
- **WHEN** ein neues Frühstückspreset gewählt wird
- **THEN** bleibt die bestehende Default-Verteilung für Streichfette erhalten: erstes Fett = 50 %, „Kein Fett“ = 50 %, übrige Fette = 0 %

### Requirement: Speicherung als MealItems
Streichfette SHALL als `MealItem`s mit `quantity=gramsPerPerson`, `measuring_unit=g` und `factor=1.0` gespeichert werden. Der Rollen-Tag `buffet-fat` SHALL über die Ingredient-Tags lesbar bleiben. Vom direkten Frühstücksassistenten erzeugte `MealItem`s SHALL mit `is_breakfast_assistant=true` markiert werden, damit sie sicher von manuellen Einträgen unterscheidbar sind. Der direkte Meal-Modus SHALL die Auswahl pro Person und den gewählten Profil-Slug in der regulären Mahlzeit speichern; der Referenzmahlzeiten-Modus SHALL weiterhin ausschließlich die Referenzmahlzeit aktualisieren. Beim erneuten Öffnen des direkten Meal-Modus MUST das Profil sowie die gespeicherte Auswahl und deren Share-Verteilung rekonstruierbar sein.

#### Scenario: Streichfett-Quantity pro Person
- **WHEN** das Frühstück gespeichert wird
- **THEN** erscheint jedes aktive Streichfett als MealItem mit `quantity` gleich Gramm pro Person, Gramm-Einheit und `factor=1.0`
- **THEN** enthält `ingredient_tags` den Rollen-Slug `buffet-fat`

#### Scenario: Direkte Frühstücksmahlzeit speichern
- **GIVEN** der Assistent wurde aus einem Frühstücks-MealSlot geöffnet
- **WHEN** der Nutzer ein Preset konfiguriert und speichert
- **THEN** werden die resultierenden Items der direkten Mahlzeit zugeordnet und die Referenzmahlzeit bleibt unverändert

#### Scenario: Referenzmahlzeit bleibt getrennt
- **GIVEN** der Assistent wurde aus `/meal-plans/{id}/ref-meals/breakfast/wizard` geöffnet
- **WHEN** das Frühstück gespeichert wird
- **THEN** wird weiterhin nur die Frühstücks-Referenzmahlzeit gespeichert und keine reguläre Mahlzeit verändert

#### Scenario: Direkte Frühstücksauswahl wiederherstellen
- **GIVEN** ein direktes Frühstück wurde mit einem Profil und veränderten Shares gespeichert
- **WHEN** der Frühstücksassistent für dieselbe Mahlzeit erneut geöffnet wird
- **THEN** ist der gespeicherte Profilname erkennbar und die bestehende Auswahl sowie rekonstruierbare Share-Verteilung sind gesetzt

### Requirement: Manuelle MealItems beim direkten Frühstücksspeichern
Im direkten Meal-Modus SHALL der Nutzer beim Speichern wählen können, ob manuelle Items außerhalb des Assistenten erhalten bleiben (`preserve`) oder alle bisherigen Items ersetzt werden (`replace`). Erkannte Frühstücks-Assistenten-Items werden beim Ersetzen durch die neue Auswahl ersetzt. Unbekannte manuelle Items SHALL bei `preserve` erhalten bleiben. Der Referenzmahlzeiten-Modus bleibt von dieser Regel unberührt.

#### Scenario: Manuelle Items erhalten
- **GIVEN** eine direkte Mahlzeit enthält Frühstücks-Assistenten-Items und manuelle Einträge
- **WHEN** der Nutzer `preserve` auswählt
- **THEN** werden markierte Assistenten-Items ersetzt und manuelle Einträge beibehalten, auch wenn diese nur einen globalen Buffet-Tag tragen

#### Scenario: Alle Items ersetzen
- **GIVEN** eine direkte Mahlzeit enthält bestehende Einträge
- **WHEN** der Nutzer `replace` auswählt
- **THEN** werden alle bisherigen Einträge durch die Assistenten-Auswahl ersetzt

## ADDED Requirements

### Requirement: Frühstücksassistent im normalen MealSlot
Der MealSlot für `meal_type=breakfast` SHALL den bestehenden mehrstufigen Frühstücksassistenten mit Share-Slidern als regulären Einstieg anbieten. Der Ablauf SHALL denselben Wizard-Fortschritt, dieselbe Button-Anordnung und dieselben responsiven Design-Tokens wie der generische Buffet-Wizard verwenden. Die bestehenden Referenzmahlzeiten-Routen SHALL erhalten bleiben.

#### Scenario: Frühstücks-MealSlot öffnet den alten Assistenten
- **GIVEN** eine reguläre Mahlzeit hat `meal_type=breakfast`
- **WHEN** ein Nutzer „Buffet-Assistent“ öffnet
- **THEN** wird der bestehende Frühstücksassistent im direkten Meal-Modus geöffnet
- **THEN** der Spezialassistent für Referenzmahlzeiten bleibt zusätzlich unter seinem bisherigen Pfad erreichbar

#### Scenario: Andere Mahlzeitentypen verwenden den Buffet-Wizard
- **GIVEN** eine reguläre Mahlzeit hat `meal_type` ungleich `breakfast`
- **WHEN** ein Nutzer „Buffet-Assistent“ öffnet
- **THEN** wird der generische, mehrstufige Buffet-Wizard für diesen Mahlzeitentyp geöffnet

### Requirement: Frühstücks-Presets
Schritt 1 SHALL die folgenden fünf Profile als vollständige, vorausgewählte und anschließend änderbare Frühstücksoptionen zeigen: „Nur Müsli“, „Brot und Müsli“, „Brot pflanzlich“, „Brot vegetarisch“ und „Brot mit Fleisch“. „Freies Buffet“ SHALL als separate, immer verfügbare Option in den Buffet-Wizard wechseln. Die Profile SHALL vorhandene sichtbare Katalog-Items nutzen und SHALL vorab passende Basis-, Belag-, Streichfett-, Extras- und Getränke-Shares setzen.

#### Scenario: Nur Müsli
- **WHEN** ein Nutzer „Nur Müsli“ wählt
- **THEN** werden Müsli-/Haferflocken-Basis, passende Extras und passende Getränke vorausgewählt
- **THEN** kann der Nutzer alle Shares, Mengen und Items in den folgenden Schritten ändern

#### Scenario: Brot und Müsli
- **WHEN** ein Nutzer „Brot und Müsli“ wählt
- **THEN** werden Brot und eine Müsli-/Haferflocken-Auswahl mit passenden Beilagen vorausgewählt
- **THEN** kann der Nutzer alle Shares, Mengen und Items in den folgenden Schritten ändern

#### Scenario: Pflanzlich, vegetarisch oder mit Fleisch
- **WHEN** ein Nutzer eines der Profile „Brot pflanzlich“, „Brot vegetarisch“ oder „Brot mit Fleisch“ wählt
- **THEN** enthält die Vorauswahl nur passende Produkte für das gewählte Profil
- **THEN** bleibt die Auswahl vollständig manuell änderbar; die Profilwahl schreibt keine globalen Tags

#### Scenario: Profil und Free sind getrennt
- **WHEN** der Frühstücksassistent in Schritt 1 geöffnet wird
- **THEN** sind die fünf bestätigten Profile auswählbar und „Freies Buffet“ erscheint als separate Option
- **THEN** zählt „Freies Buffet“ nicht zu den fünf Frühstücksprofilen
