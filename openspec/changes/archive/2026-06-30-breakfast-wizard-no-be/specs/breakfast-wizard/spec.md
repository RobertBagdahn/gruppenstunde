## MODIFIED Requirements

### Requirement: Brot-Einheit als Recheneinheit (REMOVED)

**Reason**: BE als Recheneinheit entfernt. Der Wizard arbeitet jetzt rein in Gramm + kcal.

**Migration**: Keine Migration nötig. Backend speichert weiter in Gramm. Frontend-Zustand verwendet `gramsPerPerson` statt `bePerPerson`.

### Requirement: Schritt 1 — Basis mit Sortenverteilung

Das System SHALL im Schritt Basis die Gesamtmenge in **Gramm pro Person** erfassen und über Schieberegler auf die gewählten Basis-Sorten verteilen. Die Verteilungssumme MUSS 100% betragen. Aus **Gramm-Anteil** und `energy_kcal_pro_100g` SHALL das System Gramm- und kcal-Werte pro Sorte berechnen.

#### Scenario: Basis-Verteilung berechnet Gramm
- **WHEN** **150g**/Person mit 50% Bauernbrot (60g/Scheibe) und 50% Brötchen gewählt sind
- **THEN** zeigt das System **75g Bauernbrot** und **75g Brötchen** mit Gramm und kcal

#### Scenario: Verteilungssumme wird auf 100% gehalten
- **WHEN** der Nutzer einen Basis-Schieberegler verändert
- **THEN** passt das System die übrigen ungesperrten Sorten so an, dass die Summe 100% bleibt

### Requirement: Schritt 2 — Belag mit Intensität und Verteilung

Das System SHALL einen globalen Intensitäts-Schalter (Knapp/Normal/Üppig) anbieten, der pro Belag-Zutat die zugehörige Portion ("Belag knapp/normal/üppig") wählt; "Normal" ist Default. Die Belag-Sorten werden über Schieberegler verteilt (Summe 100%). Das System SHALL pro Sorte Gramm und kcal anzeigen.

Der Doppelcheck Belag-Deckung SHALL das **Gramm-Verhältnis Brot:Belag** prüfen und bei Abweichung warnen, ohne den Fortschritt zu blockieren.

#### Scenario: Intensität ändert nur das Gewicht
- **WHEN** der Nutzer die Intensität von "Normal" (Käse 25g) auf "Üppig" (Käse 35g) wechselt
- **THEN** steigt das Käse-Gewicht und die kcal

#### Scenario: Belag-Verteilung berechnet Gramm
- **WHEN** **100g Belag** mit 40% Gouda, 30% Salami, 30% Nutella konfiguriert sind
- **THEN** zeigt das System **40g Gouda**, **30g Salami** und **30g Nutella** mit Gramm und kcal

### Requirement: Doppelcheck Belag-Deckung

Das System SHALL das **Gramm-Verhältnis Brot zu Belag** prüfen und bei Abweichung vom erwarteten Verhältnis warnen, ohne den Fortschritt zu blockieren.

#### Scenario: Unterdeckung wird gemeldet
- **WHEN** das Brot-Gramm (z.B. 150g) im Missverhältnis zum Belag-Gramm (z.B. 20g) steht
- **THEN** zeigt das System den Hinweis, dass das Brot:Belag-Verhältnis unausgewogen ist
- **AND** der Nutzer kann dennoch fortfahren

### Requirement: Soll-Energie über Norm-Person-Konstante

Das System SHALL das Energie-Soll je Frühstück als `NORM_PERSON_DAILY_KCAL × day_part_factor` berechnen. Der **default** `day_part_factor` für Frühstück SHALL **0.30** betragen (30% Tagesbedarf). Der Wert MUSS im MealPlan-Settingspanel überschreibbar bleiben. Ist gegen Soll SHALL als Ampel dargestellt werden. Der Wert 2335 (Norm-Person, PAL 1.75) MUSS als benannte Konstante `NORM_PERSON_DAILY_KCAL` zentral definiert und überall referenziert werden, statt als Magic Number mehrfach kodiert zu sein.

#### Scenario: Soll basiert auf Norm-Person und day_part_factor
- **WHEN** `day_part_factor = 0.30` gilt
- **THEN** beträgt das Frühstücks-Soll ca. **701 kcal** (NORM_PERSON_DAILY_KCAL × 0.30)

#### Scenario: Energie-Ist enthält Zutaten-Items
- **WHEN** das Frühstück aus Zutaten-Items (Basis, Belag, **Extras**, Getränke) besteht
- **THEN** fließen **alle** Zutaten-Items in das Energie-Ist ein (nicht nur Rezept-Items)

### Requirement: Normalisieren skaliert Basis und Belag

Das System SHALL beim Normalisieren auf das Soll **Brot-Gramm und Belag-Gramm** mit dem Faktor `Soll/Ist` multiplizieren, wobei Soll und Ist kcal aus **Brot + Belag + Extras** umfassen. Getränke, Gemüse/Extras und warme Rezepte MÜSSEN dabei unverändert bleiben. Das **Brot:Belag-Verhältnis** MUSS erhalten bleiben.

#### Scenario: Normalisieren skaliert Gramm
- **WHEN** Ist 450 kcal (Brot+Belag+Extras) und Soll 700 kcal beträgt (Faktor 1,56)
- **THEN** werden Brot-Gramm und Belag-Gramm mit Faktor 1,56 skaliert
- **AND** Getränke, warme Gerichte und Extras bleiben unverändert

### Requirement: Abschluss-Cockpit und Speichern

Das System SHALL vor dem Speichern ein Cockpit mit allen Doppelchecks und einer vollständigen Transparenz-Tabelle anzeigen. Die Tabelle MUSS alle vier Komponentengruppen enthalten: Basis, Belag, warme Gerichte/Extras und Getränke — jeweils mit Position, **Gramm + natürliche Einheit**, kcal pro Person und prozentualem Anteil am Gesamt (ohne Getränke).

Brot-Items SHALL als `{gramm}g ({sharePercent} Scheibe)` angezeigt werden.
Belag-Items SHALL als `{gramm}g ({sharePercent} Portion)` angezeigt werden.

Nach jeder Kategorie (Brot, Belag) SHALL eine Summenzeile stehen (z.B. "Brote gesamt: 158g").

Der Begriff "BE" oder "Broteinheit" darf in der gesamten Cockpit-Anzeige nicht vorkommen.

Die Energieberechnung MUSS kcal aus allen Komponentengruppen summieren (Brot + Belag + Extras + warme Gerichte). Getränke-Hinweis: "Getränke (separat, kein Einfluss auf Soll)".

#### Scenario: Cockpit zeigt Gramm + natürliche Einheit
- **WHEN** Brot mit 158g konfiguriert ist
- **THEN** zeigt die Tabelle "158g (2,64 Scheibe)" statt BE-abgeleiteter Portion

#### Scenario: Summenzeile nach Brot-Gruppe
- **WHEN** zwei Brote mit zusammen 158g
- **THEN** erscheint "Brote gesamt: 158g" als letzte Zeile der Brot-Gruppe

#### Scenario: Energieberechnung summiert alle Komponenten
- **WHEN** Brot 200 kcal, Belag 150 kcal und Extras 50 kcal pro Person ergeben
- **THEN** zeigt das Cockpit 400 kcal als Gesamt-Ist
