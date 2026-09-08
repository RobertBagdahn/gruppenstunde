## MODIFIED Requirements

### Requirement: Erkannte Personenzahl bei Importen und KI-Rezepten
Das System SHALL eine verlässlich erkannte Personenzahl aus der Smart-Eingabe-Analyse als Personen-Kontext übernehmen und im Schritt "Basis & Portionen" zur Bestätigung anzeigen, bevor Zutatenmengen dargestellt werden. Wenn keine verlässliche Personenzahl vorhanden ist, SHALL das System die manuelle Auswahl erzwingen, bevor der Schritt verlassen werden kann.

#### Scenario: URL-Eingabe liefert vier Portionen
- **GIVEN** die Analyse einer URL liefert `servings=4` und Mengen für das Originalrezept
- **WHEN** der Nutzer den Schritt "Basis & Portionen" erreicht
- **THEN** wird der Wert 4 vorbelegt angezeigt
- **AND** die importierten Gesamtmengen werden im Zutatenschritt nicht nochmals hochskaliert

#### Scenario: Analyse liefert keine Personenzahl
- **GIVEN** die Analyse liefert keine verlässliche Personenzahl
- **WHEN** der Nutzer den Schritt "Basis & Portionen" öffnet
- **THEN** muss der Nutzer eine Zahl zwischen 1 und 100 auswählen
- **AND** kann den Schritt erst danach verlassen

#### Scenario: Freitext-Idee liefert keine Personenzahl
- **GIVEN** die KI erzeugt aus einer Freitext-Idee ein Rezept ohne eindeutige Personenzahl
- **WHEN** der Nutzer den Schritt "Basis & Portionen" öffnet
- **THEN** muss der Nutzer den Personen-Kontext manuell festlegen
- **AND** wird der Zutatenschritt bis dahin nicht erreichbar

#### Scenario: Nutzer korrigiert die erkannte Personenzahl
- **GIVEN** die Analyse liefert eine falsche Personenzahl
- **WHEN** der Nutzer den Wert im Schritt "Basis & Portionen" korrigiert
- **THEN** werden die Mengen im Zutatenschritt im korrigierten Kontext angezeigt
- **AND** wird beim Speichern mit dem korrigierten Wert normiert

## ADDED Requirements

### Requirement: Personen-Kontext wird vor der Zutatenanzeige festgelegt
Der Personen-Kontext SHALL im Schritt "Basis & Portionen" festgelegt werden und nicht innerhalb des Zutatenschritts. Der Zutatenschritt SHALL erst mit festgelegtem Kontext erreichbar sein.

#### Scenario: Zutatenschritt ohne festgelegten Kontext
- **WHEN** der Personen-Kontext noch nicht festgelegt ist
- **THEN** SHALL der Zutatenschritt nicht erreichbar sein

#### Scenario: Zutatenschritt mit festgelegtem Kontext
- **WHEN** der Personen-Kontext festgelegt wurde
- **THEN** SHALL der Zutateneditor unmittelbar mit den Gesamtmengen für diesen Kontext geöffnet werden
- **THEN** SHALL keine erneute Abfrage der Personenzahl erscheinen

### Requirement: Hilfetext zur internen Normierung
Der Schritt "Basis & Portionen" SHALL einen deutschen Hilfetext anzeigen, der erklärt, dass Mengen intern auf eine Portion normiert werden, damit Rezepte in der Planung skaliert werden können.

#### Scenario: Hilfetext ist sichtbar
- **WHEN** der Schritt "Basis & Portionen" aktiv ist
- **THEN** SHALL ein deutscher Hilfetext die interne Normierung auf eine Portion erklären

#### Scenario: Hilfetext auf kleinen Viewports
- **WHEN** der Schritt bei einer Viewport-Breite von 320px gerendert wird
- **THEN** SHALL der Hilfetext ohne horizontales Scrollen lesbar sein
