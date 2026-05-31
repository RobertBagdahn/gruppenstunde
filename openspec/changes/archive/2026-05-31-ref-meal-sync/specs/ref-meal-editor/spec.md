## ADDED Requirements

### Requirement: Baukasten-Ansicht für RefMeal
Das System SHALL eine eigene UI-Ansicht (RefMeal-Editor) bereitstellen, in der Mini-Rezepte als Kacheln angezeigt und per Klick zum RefMeal hinzugefügt werden können.

#### Scenario: Kacheln nach Kategorie gruppiert anzeigen
- **WHEN** User den RefMeal-Editor öffnet
- **THEN** werden verfügbare Rezepte nach `recipe_type` gruppiert angezeigt (breakfast, snack, drink) als klickbare Kacheln

#### Scenario: Mini-Rezept per Klick hinzufügen
- **WHEN** User eine Kachel (z.B. "Brot + Nutella") anklickt
- **THEN** wird das Rezept als MealItem mit `factor=1.0` zum RefMeal hinzugefügt und erscheint in der Auswahl-Liste

#### Scenario: Mini-Rezept entfernen
- **WHEN** User ein Rezept aus der Auswahl-Liste entfernt
- **THEN** wird das MealItem vom RefMeal gelöscht

### Requirement: Faktor pro Item anpassen
Das System SHALL im RefMeal-Editor erlauben, den Faktor jedes MealItems individuell anzupassen.

#### Scenario: Faktor ändern
- **WHEN** User den Faktor eines Items von 1.0 auf 1.5 ändert
- **THEN** wird der `factor` des MealItems aktualisiert und die Kalorienanzeige neu berechnet

### Requirement: Energie-Übersicht anzeigen
Das System SHALL im RefMeal-Editor die Gesamtenergie pro Person (Summe aller Items × factor) und den Soll-Wert (basierend auf `day_part_factor` × Tagesbedarf) anzeigen.

#### Scenario: Ist vs. Soll Kalorien
- **WHEN** User Items zum RefMeal hinzugefügt hat
- **THEN** wird angezeigt: Gesamt-kcal pro Person, Soll-kcal (z.B. 2400 × 0.25 = 600 kcal), und die prozentuale Abweichung

### Requirement: Energie-Normalisierung
Das System SHALL einen Button "Normalisieren" bereitstellen, der alle Faktoren proportional so skaliert, dass die Gesamtenergie dem Soll-Wert entspricht.

#### Scenario: Normalisieren drücken
- **WHEN** User "Normalisieren" klickt bei Ist=850kcal und Soll=600kcal
- **THEN** werden alle Faktoren mit dem Verhältnis 600/850 multipliziert (proportionale Reduktion)

### Requirement: Verknüpfungs-Übersicht
Das System SHALL im RefMeal-Editor anzeigen, welche konkreten Meals aktuell verknüpft sind (Anzahl und Tage) und die resultierende Gesamt-Portionenzahl (Personen × verknüpfte Tage).

#### Scenario: Verknüpfungs-Info anzeigen
- **WHEN** RefMeal mit 4 von 5 Frühstücken verknüpft ist bei 30 Portionen
- **THEN** wird angezeigt: "Verknüpft: 4/5 Frühstücke · 30 Personen × 4 Tage = 120 Portionen"
