## ADDED Requirements

### Requirement: Cost Calculation Overview Page
Eine eigenständige Seite unter `/cost-calculation` zeigt aggregierte Kosteninformationen über alle Rezepte und MealPlans.

#### Scenario: Nutzer öffnet Kostenkalkulation
- **WHEN** Nutzer navigiert zu `/cost-calculation`
- **THEN** Seite zeigt drei Sektionen: Rezeptkosten, Wochenplan-Kosten, Frühstückskosten

#### Scenario: Rezeptkosten werden angezeigt
- **WHEN** Rezepte mit `cached_price_total > 0` existieren
- **THEN** Sektion "Rezeptkosten" zeigt eine Liste aller Rezepte mit Namen und Gesamtpreis

#### Scenario: Keine Rezepte vorhanden
- **WHEN** keine Rezepte existieren
- **THEN** Sektion zeigt "Keine Rezepte gefunden"

#### Scenario: Wochenplan-Kosten werden angezeigt
- **WHEN** MealPlans existieren
- **THEN** Sektion "Wochenplan-Kosten" zeigt pro Plan: Name, Gesamtkosten, Kosten pro Tag, pro Person, pro Pers./Tag

#### Scenario: Frühstückskosten werden angezeigt
- **WHEN** MealPlans mit Frühstücks-Mahlzeiten existieren
- **THEN** Sektion "Frühstückskosten" zeigt aggregierte Kosten für alle Breakfast-Meals

#### Scenario: Keine Frühstücke vorhanden
- **WHEN** keine Frühstücks-Mahlzeiten existieren
- **THEN** Sektion zeigt "Keine Frühstücke gefunden"

### Requirement: Preisverwaltungs-Hinweis
Ein Banner am Seitenende verweist auf die Zutatendatenbank zur Preisverwaltung.

#### Scenario: Hinweis wird angezeigt
- **WHEN** Nutzer ist auf der Kostenkalkulations-Seite
- **THEN** Banner zeigt "Preise verwalten — Zutatenpreise kannst du in der Zutatendatenbank hinterlegen." mit Link zu `/ingredients`

### Requirement: Suche und Preise-Button
Header der Seite enthält ein Suchfeld und einen "Preise verwalten"-Button.

#### Scenario: Rezeptsuche
- **WHEN** Nutzer tippt in das Suchfeld
- **THEN** Rezeptkosten-Liste wird nach Name gefiltert

#### Scenario: Preise verwalten Button
- **WHEN** Nutzer klickt "Preise verwalten"
- **THEN** Navigation zur Zutatendatenbank (`/ingredients`)

### Requirement: Navigation
Kostenkalkulation ist über die Sidebar erreichbar.

#### Scenario: Menüeintrag sichtbar
- **WHEN** Nutzer ist eingeloggt
- **THEN** Sidebar zeigt "Kostenkalkulation" unter Tools-Sektion
