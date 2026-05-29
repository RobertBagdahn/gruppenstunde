## ADDED Requirements

### Requirement: Rezept-Detailseite zeigt vollständige Analyse

Die Rezept-Detailseite unter `/recipes/:slug` zeigt alle verfügbaren Analysen und Metadaten eines Rezepts an.

#### Scenario: Nutzer öffnet Rezept-Detailseite
- **WHEN** ein Nutzer `/recipes/:slug` aufruft
- **THEN** werden Titel, Beschreibung, Titelbild, Zutatenliste, Zubereitungstext, NutriScore, Gesamtpreis, Nährwert-Breakdown, Verbesserungsvorschläge und positive Gesundheits-Traits angezeigt

#### Scenario: NutriScore-Anzeige
- **WHEN** das Rezept einen cached_nutri_class-Wert hat
- **THEN** wird der NutriScore als farbiger Badge (A-E) in der Sidebar (Desktop) bzw. im Header (Mobile) angezeigt

#### Scenario: Preis-Anzeige
- **WHEN** das Rezept einen cached_price_total-Wert hat
- **THEN** wird der Gesamtpreis in Euro pro Portion angezeigt

#### Scenario: Portionen skalieren
- **WHEN** der Nutzer die Portionszahl ändert
- **THEN** werden Zutatenliste und Preise entsprechend umgerechnet

#### Scenario: Mobile Layout
- **WHEN** die Viewport-Breite < 768px ist
- **THEN** wird das Layout gestapelt dargestellt mit sticky Action-Bar am unteren Rand

### Requirement: Rezept-Listenpage mit Pagination

Die Rezept-Übersicht unter `/recipes` zeigt alle veröffentlichten Rezepte paginiert an.

#### Scenario: Rezeptliste laden
- **WHEN** ein Nutzer `/recipes` aufruft
- **THEN** werden Rezepte als Cards mit Bild, Titel, NutriScore-Badge und Preis angezeigt, paginiert mit "Mehr laden"-Button

#### Scenario: Rezept aus Liste öffnen
- **WHEN** ein Nutzer eine Rezeptkarte anklickt
- **THEN** wird das Rezept in einem neuen Tab geöffnet (EntityLinkContext "list")
