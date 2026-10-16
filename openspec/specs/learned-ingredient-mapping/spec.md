# Learned Ingredient Mapping Specification

## Purpose
Ingredient choices confirmed in the recipe import review are stored and reused by the matcher.

## Requirements
### Requirement: Bestätigte Zuordnungen werden gelernt
Beim finalen Speichern eines importierten Rezepts SHALL das System für jede bestätigte Review-Zeile die Zuordnung „normalisierte Suchanfrage → Zutat“ speichern und einen Bestätigungszähler erhöhen. Anonyme Vorschauen MUST nichts speichern.

#### Scenario: Zuordnung wird gespeichert
- **GIVEN** ein angemeldeter Nutzer bestätigt `Feta-Käse` → `Feta`
- **WHEN** das Rezept gespeichert wird
- **THEN** existiert die gelernte Zuordnung `feta-käse` → `Feta` mit Zähler 1

#### Scenario: Anonyme Vorschau
- **GIVEN** ein nicht angemeldeter Besucher erzeugt eine Vorschau
- **WHEN** die Vorschau berechnet wird
- **THEN** wird keine gelernte Zuordnung gespeichert

### Requirement: Gelernte Zuordnung im Matching
Der Matcher SHALL eine gelernte Zuordnung vor allen anderen Stufen prüfen. Ab zwei Bestätigungen von mindestens zwei verschiedenen Nutzern MUST sie als Treffer gelten, darunter als vorbelegter Vorschlag mit Status „zu prüfen“. Zuordnungen auf gelöschte oder für den Nutzer nicht matchbare Zutaten MUST ignoriert werden.

#### Scenario: Mehrfach bestätigt
- **GIVEN** `feta-käse` → `Feta` wurde von zwei Nutzern bestätigt
- **WHEN** ein weiterer Import `200 g Feta-Käse` enthält
- **THEN** ist `Feta` ohne Prüfung gewählt

#### Scenario: Einmal bestätigt
- **GIVEN** die Zuordnung wurde einmal bestätigt
- **WHEN** sie erneut auftritt
- **THEN** ist die Zutat vorbelegt, die Zeile hat Status „zu prüfen“
