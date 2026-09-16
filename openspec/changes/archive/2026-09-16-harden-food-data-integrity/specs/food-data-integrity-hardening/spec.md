## ADDED Requirements

### Requirement: Trusted weight basis
Das System SHALL für technische Gewichtsberechnungen ausschließlich positive, vertrauenswürdige Portionengewichte verwenden. Für stückartige Portionen ohne bestätigtes Gewicht SHALL kein impliziter `1 g`-Wert erzeugt werden.

#### Scenario: Unbestätigte Stückportion wird gespeichert
- **WHEN** ein Nutzer eine stückartige Portion ohne bestätigtes positives Gewicht über den normalen Create- oder Update-Endpunkt speichert
- **THEN** SHALL die API den Vorgang mit HTTP 422 ablehnen
- **THEN** SHALL kein berechenbares `weight_g=1` gespeichert werden

#### Scenario: Bestätigte Stückportion wird gespeichert
- **WHEN** ein berechtigter Nutzer eine Portion über den Bestätigungsflow mit positivem Gewicht bestätigt
- **THEN** SHALL die Portion als vertrauenswürdig markiert werden
- **THEN** SHALL die API Gewicht, Quelle, Bestätigungszeitpunkt und Status zurückgeben

#### Scenario: Unbekanntes Repair-Gewicht
- **WHEN** ein Repair-Finding kein vertrauenswürdiges Ausgangs- oder Zielgewicht besitzt
- **THEN** SHALL das Finding den Status `pending_review` erhalten oder behalten
- **THEN** SHALL kein RecipeItem automatisch verschoben oder umgerechnet werden

### Requirement: Complete calculation reporting
Preis-, Nährwert-, Planner- und Einkaufslistenberechnungen SHALL fehlende Preise und unbestätigte Gewichte strukturiert ausweisen, anstatt erfundene Werte zu verwenden.

#### Scenario: Teilweise berechenbares Rezept
- **WHEN** ein Rezept mindestens ein berechenbares und mindestens ein unvollständiges RecipeItem enthält
- **THEN** SHALL die Antwort den Status `partial`, eine Abdeckungsquote und die betroffenen Items enthalten
- **THEN** SHALL das unvollständige Item nicht mit einem künstlichen Grammwert in die technische Summe eingehen

#### Scenario: Vollständig berechenbares Rezept
- **WHEN** alle relevanten Preise und Portionengewichte vertrauenswürdig vorhanden sind
- **THEN** SHALL die Antwort den Status `complete` und eine vollständige Abdeckungsquote liefern

### Requirement: Consistent price status
Preisquellen SHALL in allen Ingredient-, Data-Quality-, Rezept- und Planner-Responses auf `manual`, `ai_accepted` oder `missing` beschränkt sein. `NULL`, `0` und negative Preise SHALL als fehlend behandelt werden.

#### Scenario: Fehlender Preis
- **WHEN** ein Ingredient keinen positiven Preis besitzt
- **THEN** SHALL die API `price_source="missing"` liefern
- **THEN** SHALL der Preis nicht in Kosten- oder Preisstatistiken einfließen

#### Scenario: Akzeptierter KI-Preis
- **WHEN** ein Nutzer einen offenen KI-Preisvorschlag bestätigt
- **THEN** SHALL die API `price_source="ai_accepted"` liefern
- **THEN** SHALL abhängige Rezept- und Meal-Plan-Caches neu berechnet oder invalidiert werden

### Requirement: Consistent PDF scaling
Recipe-PDF und Cooking-Schedule-PDF SHALL Mengen, Kosten, Nährwerte und strukturierte Schrittangaben mit demselben Exportkontext skalieren, ohne gespeicherte Normportionen zu verändern.

#### Scenario: Leerer Kochplan
- **WHEN** ein authentifizierter Nutzer einen MealPlan ohne Mahlzeiten exportiert
- **THEN** SHALL der Endpoint HTTP 404 mit einer deutschen Fehlermeldung zurückgeben

#### Scenario: Kochplan mit Reservefaktor
- **WHEN** ein Kochplan ein Rezept mit effektiver Personenzahl und `reserve_factor` enthält
- **THEN** SHALL Zutaten, Schritte, Kosten und Nährwerte denselben definierten Skalierungsfaktor verwenden

#### Scenario: Direktes Gramm-Item in einem Step
- **WHEN** ein strukturierter RecipeStep auf ein RecipeItem ohne Portion verweist
- **THEN** SHALL der Placeholder mit der skalierten Grammmenge aufgelöst werden
- **THEN** SHALL ein Fehler bei einem einzelnen unbekannten Placeholder die übrigen Step-Inhalte nicht auf unskalierte Originaldaten zurücksetzen

### Requirement: Safe concurrent mutations
Material- und Ingredient-Replacement-Mutationen SHALL atomar, berechtigungsgeprüft und gegen widersprüchliche Paralleländerungen geschützt sein.

#### Scenario: Ungültige Material-Reihenfolge
- **WHEN** ein Nutzer eine Reorder-Liste mit doppelten, fehlenden oder fremden IDs sendet
- **THEN** SHALL die API HTTP 400 zurückgeben
- **THEN** SHALL keine bestehende Reihenfolge verändern

#### Scenario: Identische Ingredient-Ersetzung
- **WHEN** ein Nutzer ein RecipeItem auf dieselbe aktive Zielportion ersetzen möchte, die bereits gespeichert ist
- **THEN** SHALL die API den bestehenden Zustand idempotent zurückgeben
- **THEN** SHALL keine unnötige Cache-Neuberechnung oder Duplicate-Operation ausführen

#### Scenario: Unzulässige Replacement-Rundung
- **WHEN** die automatisch berechnete Zielmenge nach Rundung die definierte technische Grammtoleranz überschreitet
- **THEN** SHALL die API HTTP 422 verlangen
- **THEN** SHALL das ursprüngliche RecipeItem unverändert bleiben

### Requirement: Auditable regression coverage
Die kritischen Food-Flows SHALL durch Backend-Integrations- und echte browserbasierte Playwright-Tests abgedeckt sein.

#### Scenario: Portion- und Repair-Integration
- **WHEN** die Test-Suite Portion-Bestätigung, unsicheres Repair, Rollback und idempotente erneute Anwendung ausführt
- **THEN** SHALL sie Datenbankzustand, Status, RecipeItems und Cache-Folgen prüfen

#### Scenario: Food-E2E-Workflow
- **WHEN** ein Playwright-Test Rezeptwizard, Preisbestätigung, Materialbearbeitung, Ingredient-Replacement oder PDF-Export ausführt
- **THEN** SHALL er HTTP-only Session-Auth, API-Fehlerzustände, sichtbare deutsche Rückmeldungen und den finalen UI-Zustand prüfen
- **THEN** SHALL der Workflow auf einem 320px-Viewport ohne horizontales Überlaufen bestehen
