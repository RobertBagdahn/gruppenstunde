## ADDED Requirements

### Requirement: Gramm-basierte Brotsteuerung (Schritt 1)

Das System SHALL im Schritt Basis die Gesamtmenge Brot in Gramm pro Person erfassen und über Schieberegler auf die gewählten Basis-Sorten verteilen. Die Verteilungssumme MUSS 100% betragen. Aus Gramm-Anteil und `energy_kcal_pro_100g` SHALL das System Gramm- und kcal-Werte pro Sorte berechnen.

Der Begriff "BE" oder "Broteinheit" DARF an keiner Stelle des Wizards vorkommen.

#### Scenario: Basis-Verteilung in Gramm
- **WHEN** 150g Brot/Person mit 60% Bauernbrot (60g/Scheibe) und 40% Brötchen gewählt sind
- **THEN** zeigt das System 90g Bauernbrot und 60g Brötchen mit kcal-Werten

#### Scenario: Verteilungssumme wird auf 100% gehalten
- **WHEN** der Nutzer einen Basis-Schieberegler verändert
- **THEN** passt das System die übrigen ungesperrten Sorten so an, dass die Summe 100% bleibt

### Requirement: Gramm-basierte Belag-Deckung (Schritt 2)

Das System SHALL im Schritt Belag einen globalen Intensitäts-Schalter (Knapp/Normal/Üppig) anbieten, der pro Belag-Zutat die zugehörige Portion ("Belag knapp/normal/üppig") wählt. Die Belag-Sorten werden über Schieberegler verteilt (Summe 100%). Das System SHALL pro Sorte Gramm und kcal anzeigen.

Der Doppelcheck Belag-Deckung SHALL das Verhältnis Brot:Belag in Gramm prüfen. Bei einer signifikanten Abweichung vom erwarteten Verhältnis SHALL das System eine Warnung anzeigen, ohne den Fortschritt zu blockieren.

#### Scenario: Intensität ändert Belag-Gramm
- **WHEN** der Nutzer die Intensität von "Normal" (Käse 25g) auf "Üppig" (Käse 35g) wechselt
- **THEN** steigt das Käse-Gewicht und die kcal

#### Scenario: Belag-Verteilung berechnet Gramm
- **WHEN** 100g Belag-Deckung mit 40% Gouda, 30% Salami, 30% Nutella konfiguriert sind
- **THEN** zeigt das System 40g Gouda, 30g Salami, 30g Nutella mit kcal-Werten

#### Scenario: Gramm-basierte Deckungswarnung
- **WHEN** Brot 150g und Belag nur 20g pro Person beträgt
- **THEN** zeigt das System einen Hinweis auf unausgewogenes Brot:Belag-Verhältnis
- **AND** der Nutzer kann dennoch fortfahren

### Requirement: Frühtücks-Soll auf 30% Tagesbedarf

Das System SHALL das Energie-Soll für Frühstück als `NORM_PERSON_DAILY_KCAL × 0.30` berechnen. Der default `day_part_factor` für Frühstück SHALL 0.30 betragen. Der Wert MUSS im MealPlan-Settingspanel überschreibbar bleiben.

#### Scenario: Soll basiert auf 30%
- **WHEN** kein override im Panel gesetzt ist
- **THEN** beträgt das Frühstücks-Soll 701 kcal (2335 × 0.30)

#### Scenario: Panel-Override überschreibt Default
- **WHEN** der Nutzer im Settingspanel 0.25 für Frühstück eingestellt hat
- **THEN** beträgt das Frühstücks-Soll 584 kcal (2335 × 0.25)

### Requirement: Extras fließen ins Energie-Ist

Das System SHALL warme Gerichte und Extra-Zutaten in das Energie-Ist des Cockpits einrechnen. Warme Gerichte liefern kcal über `cached_energy_kcal`. Extra-Zutaten (Gemüse) liefern kcal über einen Backend-Endpoint, der `energy_kcal` aus `ingredient.energy_kcal × quantity` berechnet.

#### Scenario: Warmes Gericht im Energie-Ist
- **WHEN** Brot+Belag 400 kcal und ein warmes Gericht 150 kcal pro Person ergeben
- **THEN** zeigt der Cockpit-Balken Ist: 550 kcal

#### Scenario: Extra-Zutat liefert kcal
- **WHEN** eine Extra-Zutat mit 50g und energy_kcal=30/100g hinzugefügt wird
- **THEN** zeigt das Cockpit Ist inkl. 15 kcal aus der Extra-Zutat

### Requirement: Normalisieren skaliert Brot- und Belag-Gramm

Das System SHALL beim Normalisieren auf das Soll Brot-Gramm und Belag-Gramm proportional mit dem Faktor `Soll/Ist` multiplizieren. Getränke, warme Gerichte und Extras MÜSSEN dabei unverändert bleiben. Das Brot:Belag-Verhältnis MUSS erhalten bleiben.

#### Scenario: Normalisieren skaliert Brot+Belag-Gramm
- **WHEN** Ist 450 kcal und Soll 700 kcal beträgt (Faktor 1,56)
- **THEN** werden Brot-Gramm und Belag-Gramm mit Faktor 1,56 skaliert
- **AND** warme Gerichte und Getränke bleiben unverändert

### Requirement: Cockpit zeigt Gramm + natürliche Einheiten

Das System SHALL im Cockpit (Schritt 5) Brot-Items als `{gramm}g ({portionszahl} Scheibe)` und Belag-Items als `{gramm}g ({portionszahl} Portion)` anzeigen. Der Begriff "BE" oder "Broteinheit" DARF nicht vorkommen. Getränke SHALL weiterhin in natürlichen Einheiten (Tasse, Schuss) angezeigt werden.

#### Scenario: Cockpit zeigt Gramm + Scheiben
- **WHEN** Brot mit 158g Gesamtgewicht und 2,64 Scheiben konfiguriert ist
- **THEN** zeigt die Tabelle "158g (2,64 Scheibe)" 

#### Scenario: Cockpit zeigt Gramm + Portion
- **WHEN** Belag mit 42g und 1,20 Portionen konfiguriert ist
- **THEN** zeigt die Tabelle "42g (1,20 Portion)"

#### Scenario: KEIN BE im Cockpit
- **WHEN** der Nutzer im Cockpit ist
- **THEN** wird "Broteinheit", "BE" oder ähnliches nirgendwo angezeigt

### Requirement: Ampel im Cockpit (dreistufig)

Das System SHALL die Energie-Coverage im Cockpit als dreistufige Ampel darstellen:
- < 80%: rot (Warnung: zu wenig Energie)
- 80–110%: grün (optimal)
- > 110%: gelb (etwas über Plan)
- > 120%: rot mit Warnhinweis (Überplanung)

#### Scenario: Ampel zeigt grün bei optimaler Deckung
- **WHEN** Coverage bei 95% liegt
- **THEN** ist der Balken grün

#### Scenario: Ampel zeigt rot bei Unterdeckung
- **WHEN** Coverage bei 65% liegt
- **THEN** ist der Balken rot

#### Scenario: Ampel zeigt gelb bei Überdeckung
- **WHEN** Coverage bei 115% liegt
- **THEN** ist der Balken gelb

#### Scenario: Überplanung zeigt Warnhinweis
- **WHEN** Coverage über 120% liegt
- **THEN** ist der Balken rot UND es erscheint ein Warnhinweis mit der Empfehlung zu normalisieren
