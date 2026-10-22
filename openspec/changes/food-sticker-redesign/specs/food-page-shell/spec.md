# Spec Delta

## Purpose

Beschreibt das gemeinsame Seitengerüst des Food-Frontends, damit jede Seite auf Handy und Desktop gleich aufgebaut, bedienbar und vorhersagbar ist: Kopfzeile, Navigation, Seitenkopf, Container, Aktionsleiste, Brotkrumen und Footer.

## ADDED Requirements

### Requirement: Kopfzeile auf weißem Grund
Das Food Frontend SHALL eine Kopfzeile mit Logo und Profilmenü auf allen Seiten zeigen. Auf Viewports ab 768 px enthält sie zusätzlich die vier Hauptpunkte. Die Kopfzeile MUST auf weißem Grund liegen, eine untere Trennlinie (`--line`) tragen und beim Scrollen sichtbar bleiben (sticky). Das Logo MUST der einzige Verweis zur Startseite sein.

#### Scenario: Desktop-Kopfzeile
- **WHEN** eine Seite auf 1440 px Breite geladen wird
- **THEN** zeigt die Kopfzeile Logo, vier Hauptpunkte und das Profilmenü auf weißem Grund

#### Scenario: Mobile Kopfzeile
- **WHEN** eine Seite auf 390 px Breite geladen wird
- **THEN** zeigt die Kopfzeile Logo und Profilmenü und die Hauptpunkte stehen in der unteren Leiste

### Requirement: Untere Leiste auf dem Handy
Auf Viewports unter 768 px SHALL das Food Frontend eine untere Leiste mit den vier Hauptpunkten zeigen. Jeder Punkt MUST Icon und Beschriftung tragen und mindestens 44 × 44 px groß sein; der aktive Punkt MUST eine Pille in `--primary-soft` zeigen. Die Leiste MUST den Safe-Area-Abstand unten berücksichtigen und Seiteninhalt nie verdecken. In Abläufen mit eigener Hauptaktion (Kochmodus, Assistenten, Einkaufsmodus, Rezeptdetail) SHALL die Leiste durch die Aktionsleiste der Seite ersetzt werden.

#### Scenario: Aktiver Punkt
- **WHEN** der Nutzer die Rezeptliste öffnet
- **THEN** ist „Rezepte“ als aktiv markiert (`aria-current="page"`)

#### Scenario: Ablauf mit Hauptaktion
- **WHEN** der Nutzer den Kochmodus öffnet
- **THEN** ersetzt die Aktionsleiste „Zurück / Weiter“ die untere Navigation

### Requirement: Seitenkopf-Muster
Jede Seite SHALL genau einen Seitenkopf nach einem von drei Mustern zeigen: Listenkopf (Brotkrumen, H1, Beschreibung, Anzahl, Aktionen), Detailkopf (Zurück-Pille mit Zielname bzw. Brotkrumen, H1, Kennzahlen, Aktionen) oder Ablaufkopf (Schließen-Knopf, Titel, Fortschritt). „Zurück“ MUST als Pille mit dem Namen des Ziels erscheinen; Abläufe zum Abbrechen MUST ein Schließen-Symbol verwenden.

#### Scenario: Detailseite
- **WHEN** ein Rezept geöffnet wird
- **THEN** zeigt der Kopf eine Zurück-Pille „Rezepte“, den H1 mit dem Titel und die Kennzahlen Zeit, Schwierigkeit, Kosten und Nährwert

#### Scenario: Ablauf
- **WHEN** der Rezept-Assistent geöffnet ist
- **THEN** zeigt der Kopf ein Schließen-Symbol, den Titel und den Fortschritt „Schritt 4 von 7“

### Requirement: Seitencontainer und Raster
Seiteninhalt SHALL in einem zentrierten Container mit maximal 1280 px Breite (`max-w-7xl`) und seitlichem Abstand von 16 px mobil und 24 px ab `sm` liegen. Detailseiten dürfen ab `lg` zwei Spalten nutzen (Inhalt und Zutatenkarte); unter 1024 px MUST die Reihenfolge Zusammenfassung, Zutaten, Zubereitung, Weiteres lauten. Kein Inhalt SHALL horizontal über den Container hinaus scrollen, außer ausdrücklich scrollbaren Chip-Leisten und Wochenrastern.

#### Scenario: Container
- **WHEN** eine Seite auf 1440 px Breite geladen wird
- **THEN** ist der Inhalt auf 1280 px begrenzt und zentriert

#### Scenario: Reihenfolge mobil
- **WHEN** ein Rezept auf 390 px Breite geladen wird
- **THEN** folgen Zusammenfassung, Zutaten, Zubereitung und ähnliche Rezepte in dieser Reihenfolge untereinander

### Requirement: Aktionsleiste am unteren Rand
Seiten mit einer Hauptaktion (Rezeptdetail, Rezept-Assistent, Planassistent, Kochmodus) SHALL auf Viewports unter 768 px eine feste Aktionsleiste am unteren Rand zeigen, höchstens eine Hauptaktion (`--primary`) und eine Nebenaktion. Die Leiste MUST den Safe-Area-Abstand berücksichtigen und darf Inhalt nicht verdecken.

#### Scenario: Rezeptdetail mobil
- **WHEN** ein Rezept auf 390 px Breite geöffnet ist
- **THEN** zeigt die Leiste „Zum Essensplan“ als Hauptaktion und „Kochen starten“ als Nebenaktion

### Requirement: Brotkrumen auf Listen- und Detailseiten
Listen- und Detailseiten SHALL Brotkrumen über dem H1 zeigen (z. B. „Rezepte / Warme Mahlzeit / Chili sin Carne“). Brotkrumen MUST aus echten Links (`<a href>`) bestehen, das letzte Glied ist nicht verlinkt und trägt `aria-current="page"`.

#### Scenario: Brotkrumen auf der Detailseite
- **WHEN** ein Rezept geöffnet wird
- **THEN** zeigt die Seite Brotkrumen mit Links zu „Rezepte“ und dem Rezepttyp und dem Titel als letztem Glied

### Requirement: Footer für Besucher ohne Anmeldung
Der Footer SHALL auf Viewports ab 768 px unter dem Inhalt erscheinen und Verweise auf die Bereiche, Impressum und Datenschutz enthalten. Auf dem Handy entfällt der Footer; Impressum und Datenschutz MUST dort über das Profilmenü oder die Startseite erreichbar sein.

#### Scenario: Footer Desktop
- **WHEN** eine Seite auf 1440 px Breite bis ans Ende gescrollt wird
- **THEN** sind Links zu Impressum und Datenschutz sichtbar
