# meal-plan-suggestion-context Specification

## Purpose
TBD - created by archiving change meal-suggestion-panel. Update Purpose after archive.
## Requirements
### Requirement: Optional context fields on MealPlan
Der MealPlan SHALL optionale Felder für Altersgruppen (Kleinkinder, Kinder, Jugendliche, Erwachsene; Mehrfachauswahl), Veranstaltungsart (Zeltlager, Hausfahrt, Tagesaktion, Gruppenstunde, Wanderung, Sonstiges), Kochmöglichkeiten (Herd/Ofen, Gas-Kocher, Lagerfeuer, Grill, nichts; Mehrfachauswahl), Kühlmöglichkeit (Kühlschrank, Kühlbox, keine) und Jahreszeit/Wetter besitzen. Budget und Ernährungsformen SHALL die vorhandenen Felder `budget_per_person_per_day` und `nutritional_tags` nutzen.

#### Scenario: Fields optional
- **WHEN** ein Plan ohne Kontextfelder erstellt wird
- **THEN** ist die Erstellung erfolgreich und alle Felder sind leer

#### Scenario: Save context
- **WHEN** ein Manager `setting=camp` und `cooking_sources=[campfire, gas]` setzt
- **THEN** werden die Werte persistiert und in der Plan-Antwort geliefert

### Requirement: Age derived from members
Ist keine Altersgruppe gesetzt, SHALL das System sie aus `GroupMember`s bzw. Teilnehmern des Events ableiten; fehlen auch diese, SHALL der Assistent danach fragen.

#### Scenario: Derived from group
- **WHEN** der Plan eine Gruppe mit Stufe „Wölflinge“ enthält und keine Altersgruppe gesetzt ist
- **THEN** wird „Kinder“ abgeleitet und nicht erneut gefragt

### Requirement: Season default
Ist keine Jahreszeit gesetzt, SHALL sie aus dem Startdatum des Plans abgeleitet werden.

#### Scenario: Winter start
- **WHEN** der Plan im Januar beginnt
- **THEN** gilt „kalt“ als Standard und warme Getränke werden höher gewichtet

### Requirement: Editable in event UI
Event-Wizard und Event-Seite SHALL die Kontextfelder optional anbieten und in den verknüpften MealPlan schreiben.

#### Scenario: Wizard sets context
- **WHEN** ein Nutzer im Event-Wizard „Zeltlager“ wählt
- **THEN** hat der verknüpfte MealPlan `setting=camp`

### Requirement: Quick mode defaults
Im Schnellmodus SHALL das System mit Standardannahmen vorschlagen und einen Hinweis „Kontext ergänzen“ anzeigen, wenn relevante Felder fehlen.

#### Scenario: Missing context banner
- **WHEN** das Panel ohne gesetzte Kochmöglichkeit geöffnet wird
- **THEN** werden Vorschläge ohne Kochquellen-Filter gezeigt und `missing_context` enthält `cooking_sources`
