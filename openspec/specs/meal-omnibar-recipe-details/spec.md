# meal-omnibar-recipe-details Specification

## Purpose
Anforderungen an meal omnibar recipe details: Rezept im Suchdialog prüfen; Vollständige Zutatenliste mit Mengen; Volle Beschreibung und Hinweise.
## Requirements
### Requirement: Rezept im Suchdialog prüfen
Der Suchdialog (`MealOmnibarDialog`) SHALL für das aktive Rezept „Rezept ansehen“ als Link in einem neuen Tab auf die Rezeptdetailseite anbieten, ohne den Dialog zu schließen.

#### Scenario: Rezept ansehen
- **WHEN** der Nutzer „Rezept ansehen“ wählt
- **THEN** öffnet sich die Rezeptseite in einem neuen Tab und der Dialog bleibt mit unveränderter Auswahl offen

### Requirement: Vollständige Zutatenliste mit Mengen
Die Vorschau SHALL eine ausklappbare Liste aller Zutaten mit Mengen für die Normportionen des Plans zeigen.

#### Scenario: Zutaten ausklappen
- **WHEN** der Nutzer „Alle Zutaten“ ausklappt
- **THEN** erscheinen alle Zutaten mit Menge für die Normportionen, nicht nur acht Namen

### Requirement: Volle Beschreibung und Hinweise
Die Beschreibung MUST ungekürzt geliefert und ab einer Länge mit „Mehr“ eingeklappt werden. Ernährungstags und Allergen-Chips SHALL unter dem Titel stehen.

#### Scenario: Lange Beschreibung
- **WHEN** die Beschreibung länger als drei Zeilen ist
- **THEN** wird sie eingeklappt dargestellt und über „Mehr“ vollständig gezeigt

### Requirement: Mobile Detailansicht
Auf kleinen Viewports SHALL ein Tipp auf „Details“ ein Bottom-Sheet mit denselben Inhalten wie die Desktop-Vorschau öffnen.

#### Scenario: Handy 320 px
- **WHEN** der Nutzer auf einem 320-px-Viewport „Details“ tippt
- **THEN** öffnet ein Bottom-Sheet mit Zutaten, Beschreibung, Tags und „Hinzufügen“

### Requirement: Mehr Treffer im Alle-Reiter
Im Reiter „Alle“ SHALL jede Gruppe bis zu 8 Treffer zeigen.

#### Scenario: Mehr als 8 Rezepte
- **WHEN** mehr als 8 Rezepte passen
- **THEN** zeigt die Gruppe 8 Treffer und „Alle N Rezepte anzeigen“
