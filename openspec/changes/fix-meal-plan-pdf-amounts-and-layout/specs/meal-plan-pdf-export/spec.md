## ADDED Requirements

### Requirement: Zeitplan nur als Tabelle
Das PDF SHALL den Zeitplan nur als Tabelle ausgeben; die doppelte Kartenansicht der Essenszeiten MUST entfallen.

#### Scenario: Ein Zeitplan
- **WHEN** das PDF generiert wird
- **THEN** enthält es genau eine Zeitplan-Übersicht in Tabellenform

### Requirement: Gerichte offen bei leeren Mahlzeiten
Mahlzeiten ohne Gerichte SHALL im Zeitplan mit „Gerichte offen" statt Kochstart und Dauer erscheinen.

#### Scenario: Leere Mahlzeit
- **WHEN** eine Mahlzeit keine Items hat
- **THEN** zeigt die Tabelle „Gerichte offen" und keine Kochstart-Uhrzeit

### Requirement: Frühstückskarte
Ein Frühstück, das ausschließlich aus Direktzutaten besteht, SHALL als eine Karte mit Zutatentabelle (Zutat, Gesamt, p. P.) und 3–5 Aufbau-Schritten ausgegeben werden.

#### Scenario: Frühstück aus Direktzutaten
- **WHEN** ein Frühstück 13 Direktzutaten und keine Rezepte hat
- **THEN** erscheint eine Karte statt 13 Einzelkarten mit „Servierfertig"

### Requirement: Hinweis bei fehlenden Zubereitungsschritten
Ein Rezept ohne Schritte SHALL den Hinweis „Für dieses Rezept sind noch keine Zubereitungsschritte hinterlegt." zeigen; eine einzelne unnummerierte Beschreibungszeile MUST NOT als „Schritt 1" gedruckt werden. Direktzutaten ohne Rezept SHALL „Servierfertig" zeigen.

#### Scenario: Rezept ohne Schritte
- **WHEN** ein Rezept 0 Schritte und nur einen Beschreibungssatz hat
- **THEN** erscheint der Hinweis und der Satz als Kurzbeschreibung

#### Scenario: Direktzutat
- **WHEN** ein Item keine Rezeptreferenz hat
- **THEN** erscheint „Servierfertig"

### Requirement: Faktor-Beschriftung
Hat ein Item einen Faktor ungleich 1, SHALL die Karte „N Personen × F Portionen" zeigen statt der multiplizierten Personenzahl.

#### Scenario: Burger mit Faktor 1,5
- **WHEN** ein Item bei 37 Personen den Faktor 1,5 hat
- **THEN** steht auf der Karte „37 Personen × 1,5 Portionen" und nicht „56 Pers."

### Requirement: Notizen ohne Leerseiten
Der Küchen-Notizen-Block SHALL direkt unter der letzten Karte einer Mahlzeit stehen und MUST NOT eine eigene Seite erzeugen.

#### Scenario: Notizblock am Seitenende
- **WHEN** die letzte Karte einer Mahlzeit die Seite füllt
- **THEN** wird der Notizblock mit mindestens einer Karte zusammengehalten und es entsteht keine Seite nur mit Notizen

### Requirement: Deckblatt mit Kurzübersicht
Das Deckblatt SHALL zusätzlich Gesamtkosten, eine Zeitplan-Kurzfassung und einen Allergen-Hinweis enthalten.

#### Scenario: Deckblatt
- **WHEN** das PDF generiert wird
- **THEN** zeigt Seite 1 Eckdaten, Gesamtkosten, Kurzzeitplan und Allergen-Hinweis

### Requirement: Allergen-Badges und Matrix
Jede Rezept- und Frühstückskarte SHALL Allergen-Badges der enthaltenen EU-Allergene zeigen; am Ende SHALL die Allergen-Matrix stehen, sofern Allergene vorhanden sind und Allergene nicht ausgeschlossen wurden.

#### Scenario: Gericht mit Gluten
- **WHEN** ein Gericht Zutaten mit dem Tag Gluten enthält
- **THEN** zeigt die Karte das Badge „Gluten" und die Matrix markiert den Tag
