### Requirement: Wizard-Einstieg über RefMeal-Frühstück
Das System SHALL auf der Route `/meal-plans/:id/ref-meals/breakfast` den Frühstücks-Wizard öffnen, wenn der Nutzer "Referenz-Mahlzeit erstellen" wählt. Existiert bereits ein RefMeal für Frühstück, SHALL ein "Frühstücksassistent"-Button den Wizard mit den vorhandenen Mengen vorausgefüllt öffnen.

#### Scenario: Wizard ohne vorhandenes RefMeal öffnen
- **WHEN** kein RefMeal für `meal_type=breakfast` existiert und der Nutzer "Referenz-Mahlzeit erstellen" klickt
- **THEN** öffnet sich der Frühstücks-Wizard bei Schritt 1 (Basis) mit leerem Zustand
- **AND** es wird noch kein RefMeal in der Datenbank erstellt

#### Scenario: Wizard für vorhandenes RefMeal vorausgefüllt öffnen
- **WHEN** ein RefMeal für Frühstück existiert und der Nutzer "Frühstücksassistent" klickt
- **THEN** öffnet sich der Wizard mit aus den MealItems rekonstruierten Mengen und Verteilungen

### Requirement: Brot-Einheit als Recheneinheit
Das System SHALL eine Brot-Einheit (BE) als belegbare Fläche definieren: 1 Scheibe = 1 BE, ½ Brötchen = 1 BE, ganzes Brötchen = 2 BE. Eine Belag-Portion SHALL genau 1 BE decken.

#### Scenario: Ganzes Brötchen liefert 2 BE
- **WHEN** der Nutzer 1 ganzes Brötchen als Basis wählt
- **THEN** trägt es 2 BE zur Basis-Summe bei

#### Scenario: Belag-Portion deckt 1 BE
- **WHEN** die Basis 3 BE pro Person beträgt
- **THEN** entspricht eine vollständige Belag-Deckung 3 Belag-Portionen pro Person

### Requirement: Schritt 1 — Basis mit Sortenverteilung
Das System SHALL im Schritt Basis die Gesamtmenge in BE pro Person erfassen und über Schieberegler auf die gewählten Basis-Sorten verteilen. Die Verteilungssumme MUSS 100% betragen. Aus Scheibengewicht (`standard_recipe_weight_g`) und Anteil SHALL das System Gramm- und kcal-Werte pro Sorte berechnen.

#### Scenario: Basis-Verteilung berechnet Gramm
- **WHEN** 3 BE/Person mit 50% Bauernbrot (60g/Scheibe) und 50% Brötchen gewählt sind
- **THEN** zeigt das System 1,5 Bauernbrot-Scheiben (90g) und die entsprechende Brötchenmenge mit Gramm und kcal

#### Scenario: Verteilungssumme wird auf 100% gehalten
- **WHEN** der Nutzer einen Basis-Schieberegler verändert
- **THEN** passt das System die übrigen ungesperrten Sorten so an, dass die Summe 100% bleibt

### Requirement: Schritt 2 — Belag mit Intensität und Verteilung
Das System SHALL einen globalen Intensitäts-Schalter (Knapp/Normal/Üppig) anbieten, der pro Belag-Zutat die zugehörige Portion ("Belag knapp/normal/üppig") wählt; "Normal" ist Default. Die Belag-Sorten werden über Schieberegler verteilt (Summe 100%). Das System SHALL pro Sorte Gramm und kcal anzeigen.

#### Scenario: Intensität ändert nur das Gewicht
- **WHEN** der Nutzer die Intensität von "Normal" (Käse 25g) auf "Üppig" (Käse 35g) wechselt
- **THEN** steigt das Käse-Gewicht und die kcal, die Belag-Deckung in BE bleibt unverändert

#### Scenario: Belag-Verteilung berechnet Portionen
- **WHEN** 3 BE Deckung mit 40% Gouda, 30% Salami, 30% Nutella konfiguriert sind
- **THEN** zeigt das System 1,2 Gouda-, 0,9 Salami- und 0,9 Nutella-Portionen mit Gramm und kcal

### Requirement: Schieberegler mit Auto-Rebalance und Lock
Das System SHALL bei Änderung eines Schiebereglers die Differenz proportional auf die ungesperrten Sorten verteilen, sodass die Summe 100% bleibt. Gesperrte Sorten (Lock) MÜSSEN unverändert bleiben.

#### Scenario: Proportionales Rebalance
- **WHEN** drei Sorten bei 40/30/30 stehen und der Nutzer die erste auf 60% schiebt
- **THEN** werden die beiden anderen proportional auf 20/20 reduziert (Summe 100%)

#### Scenario: Gesperrte Sorte bleibt fix
- **WHEN** eine Sorte gesperrt ist und der Nutzer eine andere ändert
- **THEN** bleibt die gesperrte Sorte unverändert und nur die übrigen ungesperrten rebalancen

### Requirement: Doppelcheck Belag-Deckung
Das System SHALL die Summe der Belag-Portionen mit der Basis-BE-Summe vergleichen und bei Abweichung warnen, ohne den Fortschritt zu blockieren.

#### Scenario: Unterdeckung wird gemeldet
- **WHEN** die Basis 3,0 BE und der Belag 2,7 Portionen pro Person ergibt
- **THEN** zeigt das System den Hinweis, dass 0,3 Brote pro Person unbelegt bleiben
- **AND** der Nutzer kann dennoch fortfahren

### Requirement: Doppelcheck Sortenrisiko
Das System SHALL bei mehr als zwei Sorten innerhalb einer Belag-Kategorie einen dezenten Hinweis auf erhöhtes Restrisiko anzeigen, ohne zu blockieren.

#### Scenario: Drei Sorten lösen Hinweis aus
- **WHEN** in einer Belag-Kategorie drei oder mehr Sorten gewählt sind
- **THEN** zeigt das System einen Hinweis auf erhöhtes Restrisiko an

### Requirement: Reste-Transparenz über Packungen
Das System SHALL je Belag-Zutat den Gesamtbedarf (`Portionen × Portionsgewicht × norm_portions × verknüpfte Tage`) berechnen, auf ganze Packungen (Portion "Packung") aufrunden und den Rest in Gramm sowie in Euro (über `price_per_kg`) anzeigen.

#### Scenario: Rest geht vollständig auf
- **WHEN** der Nutella-Bedarf 1800g beträgt und ein Glas 450g fasst
- **THEN** zeigt das System 4 Gläser kaufen und 0g Rest

#### Scenario: Rest verbleibt und wird in Euro beziffert
- **WHEN** der Bedarf eines Aufstrichs 280g beträgt und ein Glas 180g fasst
- **THEN** zeigt das System 2 Gläser kaufen, 80g Rest und den zugehörigen Restwert in Euro

### Requirement: Schritt 3 — Extras und warme Gerichte
Das System SHALL im Schritt Extras Gemüse/Beilagen als Standalone-Zutaten (`is_standalone_food=True`) mit Portionsauswahl erfassen und warme Frühstücksgerichte als Rezept (mit Faktor) hinzufügbar machen. Der Portionsauswahl-Dialog (definiert in Capability `standalone-ingredient`) wird dabei wiederverwendet.

#### Scenario: Gemüse als Standalone-Zutat hinzufügen
- **WHEN** der Nutzer im Extras-Schritt "Tomate" wählt
- **THEN** öffnet sich der Portionsauswahl-Dialog mit den verfügbaren Portionen der Tomate
- **AND** die gewählte Portion wird als ingredient-MealItem in die Zusammenstellung aufgenommen

#### Scenario: Warmes Gericht als Rezept hinzufügen
- **WHEN** der Nutzer im Extras-Schritt ein warmes Frühstücksrezept (z.B. Rührei) wählt
- **THEN** wird es mit `recipe_id` und Faktor in die Zusammenstellung übernommen

### Requirement: Schritt 4 — Getränke mit Milch-Zusammenrechnung
Das System SHALL Getränke über Anteile (Kaffee/Kakao/Tee) und Mengen pro Person erfassen. Milch, die für mehrere Verwendungen (z.B. Kakao und Müsli) benötigt wird, MUSS zu einem einzigen Einkaufslisten-Eintrag zusammengerechnet werden.

#### Scenario: Milch wird zusammengerechnet
- **WHEN** Kakao 200ml Milch und Müsli 150ml Milch pro Person benötigen
- **THEN** weist das System 350ml Milch als einen Eintrag aus

### Requirement: Soll-Energie über Norm-Person-Konstante
Das System SHALL das Energie-Soll je Frühstück als `NORM_PERSON_DAILY_KCAL × day_part_factor` berechnen und Ist gegen Soll als Ampel darstellen. Der Wert 2335 (Norm-Person, PAL 1.75) MUSS als benannte Konstante `NORM_PERSON_DAILY_KCAL` zentral definiert und überall referenziert werden, statt als Magic Number mehrfach kodiert zu sein.

#### Scenario: Soll basiert auf Norm-Person und day_part_factor
- **WHEN** `day_part_factor = 0.25` gilt
- **THEN** beträgt das Frühstücks-Soll ca. 584 kcal (NORM_PERSON_DAILY_KCAL × 0.25)

#### Scenario: Energie-Ist enthält Zutaten-Items
- **WHEN** das Frühstück aus Zutaten-Items (Basis, Belag, Gemüse, Getränke) besteht
- **THEN** fließen alle Zutaten-Items in das Energie-Ist ein (nicht nur Rezept-Items)

### Requirement: Normalisieren skaliert Basis, Belag und Getränke
Das System SHALL beim Normalisieren auf das Soll Basis-BE, Belag-Portionen und Getränke mit dem Faktor `Soll/Ist` multiplizieren. Gemüse/Extras und warme Rezepte MÜSSEN dabei unverändert bleiben. Die Belag-Deckung MUSS erhalten bleiben.

#### Scenario: Normalisieren erhält Belag-Deckung
- **WHEN** Ist 480 kcal und Soll 600 kcal beträgt (Faktor 1,25)
- **THEN** werden Basis-BE und Belag-Portionen gleich skaliert, sodass die Deckung 100% bleibt
- **AND** Gemüse und Extras bleiben unverändert

### Requirement: Abschluss-Cockpit und Speichern
Das System SHALL vor dem Speichern ein Cockpit mit allen Doppelchecks und einer Transparenz-Tabelle (Komponente, Menge, Gewicht, kcal, Anteil) sowie der Hochrechnung (× Personen × Tage) anzeigen. Erst bei Bestätigung SHALL das RefMeal erstellt und die Zusammenstellung als MealItems gespeichert werden.

#### Scenario: RefMeal wird erst beim Abschluss erstellt
- **WHEN** der Nutzer im Cockpit "Frühstück speichern" wählt
- **THEN** wird ein RefMeal mit `meal_type=breakfast` erstellt und die Komponenten als MealItems (Zutaten mit Gramm/ml-Menge, warme Gerichte mit recipe_id + Faktor) gespeichert

#### Scenario: Abbrechen hinterlässt keine Daten
- **WHEN** der Nutzer den Wizard ohne Abschluss verlässt
- **THEN** wird kein RefMeal und werden keine MealItems erstellt
