## MODIFIED Requirements

### Requirement: Cost Calculation Overview Page
Die Seite unter `/cost-calculation` zeigt eine Übersicht aller Kosten. Drei Sektionen: Rezeptkosten, Wochenplankosten, Frühstückskosten. Suchfeld filtert nach Rezeptname. "Preise verwalten"-Button verlinkt auf `/ingredients`. Banner am Ende verlinkt auf Zutatendatenbank.

#### Scenario: Rezeptkosten werden angezeigt
- **WHEN** Rezepte mit `cached_price_total > 0` existieren
- **THEN** Sektion "Rezeptkosten" zeigt eine Liste aller Rezepte mit Namen und Gesamtpreis

#### Scenario: Seite ist über Sidebar erreichbar
- **WHEN** User die Sidebar öffnet
- **THEN** ist "Kostenübersicht" unter "Tools" verlinkt auf `/cost-calculation`
