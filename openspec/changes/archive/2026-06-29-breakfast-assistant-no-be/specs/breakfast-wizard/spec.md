## REMOVED Requirements

### Requirement: Brot-Einheit als Recheneinheit

**Reason**: Das BE-Konzept (Broteinheit) wird komplett entfernt. Gramm-Mengen werden aus dem kcal-Ziel (`day_part_factor × NORM_PERSON_DAILY_KCAL`) und der kcal-Dichte der Zutaten abgeleitet, nicht mehr aus BE/P.

**Migration**: Keine Migration nötig — BE war ein reines Frontend-Konzept, nie in der DB.

### Requirement: Doppelcheck Belag-Deckung

**Reason**: Ohne BE gibt es keine "Deckung" mehr, die geprüft werden müsste. Brot- und Belag-Verteilungen sind unabhängige %-Verteilungen ohne Abhängigkeit.

**Migration**: Entfernen.

### Requirement: Reste-Transparenz über Packungen

**Reason**: Verschiebt sich ins MealPlan-Frontend (dort wo effective_portions und die tatsächlichen Gesamtmengen bekannt sind).

**Migration**: Entfernen aus Assistent. Wird separat im MealPlan-Frontend implementiert.

## MODIFIED Requirements

### Requirement: Schritt 1 — Basis mit Sortenverteilung

Das System SHALL im Schritt Basis nur die Verteilung der Brot-Sorten über Schieberegler erfassen (Summe 100%). Es gibt KEIN BE/P- oder Gramm/P-Eingabefeld mehr.

Die Gramm-Menge pro Brot-Sorte wird aus dem Soll-kcal-Wert abgeleitet:

```
brotKcalGesamt = verteilKcal × (brotAnteil / (brotAnteil + belagAnteil))
wobei: verteilKcal = (day_part_factor × NORM_PERSON_DAILY_KCAL) - fixKcal
       fixKcal = kcal aus warmen Gerichten + Extras + Getränken
```

Daraus Gramm pro Sorte:
```
grammProSorte = brotKcalGesamt × (sharePercent / 100) / (energyKcal100g / 100)
```

Das System SHALL pro Sorte Gramm und kcal anzeigen.

#### Scenario: Basis-Verteilung zeigt nur %
- **WHEN** der Nutzer Schritt 1 öffnet
- **THEN** sieht er nur %-Schieberegler für die Brot-Sorten und die Summe 100%
- **AND** es gibt kein BE/P-Eingabefeld

#### Scenario: Gramm wird aus kcal-Ziel abgeleitet
- **WHEN** day_part_factor=0.25, fixKcal=80, 50% Brot A (265 kcal/100g), 50% Brot B (250 kcal/100g)
- **THEN** beträgt brotKcalGesamt ca. (584-80) × (100/(100+100)) = 252 kcal pro Person
- **AND** Brot A erhält (252 × 0.5) / 2.65 ≈ 47,5g, Brot B erhält (252 × 0.5) / 2.5 ≈ 50,4g

#### Scenario: Verteilungssumme wird auf 100% gehalten
- **WHEN** der Nutzer einen Basis-Schieberegler verändert
- **THEN** passt das System die übrigen ungesperrten Sorten so an, dass die Summe 100% bleibt

### Requirement: Schritt 2 — Belag mit Intensität und Verteilung

Das System SHALL einen globalen Intensitäts-Schalter (Knapp/Normal/Üppig) anbieten, der pro Belag-Zutat die zugehörige Portion ("Belag knapp/normal/üppig") wählt; "Normal" ist Default. Die Belag-Sorten werden über Schieberegler verteilt (Summe 100%). Das System SHALL pro Sorte Gramm und kcal anzeigen.

Die Gramm-Menge pro Belag-Sorte wird aus dem Soll-kcal-Wert abgeleitet:

```
belagKcalGesamt = verteilKcal × (belagAnteil / (brotAnteil + belagAnteil))
```

Daraus Gramm pro Sorte:
```
grammProSorte = belagKcalGesamt × (sharePercent / totalShare) / (energyKcal100g / 100)
```

Die Intensität (Knapp/Normal/Üppig) beeinflusst das Gewicht der Portion (über `Portion.weight_g`), aber nicht die kcal-Verteilung.

#### Scenario: Intensität ändert nur das Gewicht
- **WHEN** der Nutzer die Intensität von "Normal" (Käse 25g) auf "Üppig" (Käse 35g) wechselt
- **THEN** steigt das Gramm-Gewicht, aber die kcal-Gesamtsumme bleibt gleich (da die Gramm-Menge aus kcal-Ziel abgeleitet ist — die Intensität beeinflusst nur die Portionsdefinition)

#### Scenario: Belag-Verteilung berechnet Gramm
- **WHEN** belagKcalGesamt=252, 40% Gouda (350 kcal/100g), 30% Salami (400 kcal/100g), 30% Nutella (540 kcal/100g)
- **THEN** zeigt das System ca. (252×0.4)/3.5=28,8g Gouda, (252×0.3)/4.0=18,9g Salami, (252×0.3)/5.4=14,0g Nutella

### Requirement: Normalisieren skaliert auf das Soll

Das System SHALL einen Normalisieren-Button anbieten, der die Zutaten-Mengen proportional skaliert, sodass die Ist-kcal das Soll erreicht.

Im **DirectMeal-Mode** (Meal existiert): Der Button ruft `POST /api/meal-plans/{planId}/meals/{mealId}/scale-to-target/` auf. Der Endpunkt skaliert alle Item-Faktoren proportional und gibt das aktualisierte Meal zurück. Das Frontend aktualisiert die Cockpit-Anzeige aus der Response.

Im **RefMeal-Mode** (kein Meal vorhanden): Der Button führt eine client-seitige Skalierung durch:
```
scaleFactor = sollKcal / istKcal
neueQuantity = quantity × scaleFactor   (für alle Items)
```
Warme Gerichte und Extras werden NICHT skaliert (nur Brot, Belag, Getränke).

#### Scenario: Normalisieren im DirectMeal-Mode ruft API auf
- **WHEN** der Nutzer im Cockpit "Normalisieren" klickt und ein DirectMeal-Kontext aktiv ist
- **THEN** ruft das Frontend `POST .../scale-to-target/` auf
- **AND** nach erfolgreichem Response wird die Cockpit-Anzeige aktualisiert

#### Scenario: Normalisieren im RefMeal-Mode skaliert client-seitig
- **WHEN** der Nutzer im Cockpit "Normalisieren" klickt und ein RefMeal-Kontext aktiv ist
- **THEN** skaliert das Frontend die quantity-Werte proportional zum kcal-Ziel
- **AND** warme Gerichte und Extras bleiben unverändert

#### Scenario: Normalisieren hat Wirkung bei Abweichung
- **WHEN** Soll=584 kcal, Ist=350 kcal (Basis+Belag+Getränke), warme Gerichte 80 kcal fix
- **THEN** werden Basis, Belag und Getränke mit Faktor 584/350 ≈ 1,67 skaliert
- **AND** warme Gerichte bleiben bei 80 kcal

### Requirement: Abschluss-Cockpit und Speichern

Das System SHALL vor dem Speichern ein Cockpit mit einer Transparenz-Tabelle anzeigen. Die Tabelle zeigt alle Items als Standard-MealItem-Ansicht: Position, Gramm pro Person, kcal pro Person, Faktor. Es gibt Kategorie-Überschriften (Brot, Belag, Extras, Getränke) und optionale Summenzeilen pro Kategorie (Summe Gramm + kcal).

Der Begriff "BE" oder "Broteinheit" darf im gesamten Cockpit nicht vorkommen.

Die Energieberechnung MUSS kcal aus allen Komponenten summieren:
```
istKcal = basisKcal + belagKcal + extrasKcal + getraenkeKcal
sollKcal = day_part_factor × NORM_PERSON_DAILY_KCAL
```

Getränke werden als `recipe_id`-basierte Items (mit `recipe_type="drink"`) gespeichert. Zutaten-Items (Basis, Belag, Extras) MÜSSEN mit `measuring_unit_id` der Einheit "Gramm" gespeichert werden.

Bei Bestätigung im RefMeal-Mode SHALL ein RefMeal erstellt und die Zusammenstellung als dessen MealItems gespeichert werden. Bei Bestätigung im DirectMeal-Mode SHALL die Zusammenstellung direkt als MealItems des Ziel-Meals gespeichert werden (bestehende Items werden ersetzt).

#### Scenario: Cockpit zeigt Gramm und kcal pro Person
- **WHEN** Brot A 47,5g (126 kcal), Brot B 50,4g (126 kcal) konfiguriert ist
- **THEN** zeigt die Tabelle "Brot A: 47,5g · 126 kcal · ×1,0" und "Brot B: 50,4g · 126 kcal · ×1,0"

#### Scenario: Summenzeile nach Brot-Gruppe
- **WHEN** zwei Brote mit 97,9g und 252 kcal Gesamt
- **THEN** erscheint "Brote gesamt: 97,9g · 252 kcal"

#### Scenario: Energieberechnung summiert alle Komponenten
- **WHEN** Basis 252 kcal, Belag 200 kcal und Getränke 80 kcal pro Person ergeben
- **THEN** zeigt das Cockpit 532 kcal als Gesamt-Ist und den Soll-Ist-Balken (532/584 = 91%)
- **AND** der Soll-Ist-Balken verwendet day_part_factor × NORM_PERSON_DAILY_KCAL als Soll

#### Scenario: RefMeal wird im RefMeal-Mode beim Abschluss erstellt
- **WHEN** der Nutzer im Cockpit "Frühstück speichern" wählt und der Wizard im RefMeal-Mode läuft
- **THEN** wird ein RefMeal mit `meal_type=breakfast` erstellt und die Komponenten als MealItems (Zutaten mit Gramm-Menge + measuring_unit_id, warme Gerichte mit recipe_id + Faktor, Getränke mit recipe_id + ml-Menge) gespeichert

#### Scenario: MealItems werden im DirectMeal-Mode direkt gespeichert
- **WHEN** der Nutzer im Cockpit "Frühstück speichern" wählt und der Wizard im DirectMeal-Mode läuft
- **THEN** ruft das System `POST /api/meal-plans/{planId}/meals/{mealId}/wizard-items/` mit allen Wizard-Items auf
- **AND** Zutaten-Items enthalten `measuring_unit_id` für die Einheit "Gramm"

#### Scenario: Cockpit ohne BE-Begriff
- **WHEN** das Cockpit geöffnet ist
- **THEN** wird "Broteinheit", "BE", "Scheibe", "Portion" oder ähnliches nirgendwo angezeigt — nur Gramm und kcal

### Requirement: Schieberegler mit Auto-Rebalance und Lock

Das System SHALL bei Änderung eines Schiebereglers die Differenz proportional auf die ungesperrten Sorten verteilen, sodass die Summe 100% bleibt. Gesperrte Sorten (Lock) MÜSSEN unverändert bleiben.

(Unverändert aus bisheriger Spec)

#### Scenario: Proportionales Rebalance
- **WHEN** drei Sorten bei 40/30/30 stehen und der Nutzer die erste auf 60% schiebt
- **THEN** werden die beiden anderen proportional auf 20/20 reduziert (Summe 100%)

#### Scenario: Gesperrte Sorte bleibt fix
- **WHEN** eine Sorte gesperrt ist und der Nutzer eine andere ändert
- **THEN** bleibt die gesperrte Sorte unverändert und nur die übrigen ungesperrten rebalancen

## KEPT Requirements

Die folgenden Requirements bleiben unverändert aus der bestehenden Spec:

- Wizard-Einstieg über RefMeal-Frühstück
- Breakfast ingredient tagging
- Schritt 3 — Extras und warme Gerichte
- Schritt 4 — Getränke mit Milch-Zusammenrechnung
- Soll-Energie über Norm-Person-Konstante (unverändert)
- MealItemOut liefert energy_kcal für Zutaten-Items
