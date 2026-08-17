## MODIFIED Requirements

### Requirement: Schritt 1 — Basis mit Sortenverteilung

Das System SHALL im Schritt Basis die Gesamtmenge in BE pro Person erfassen und über Schieberegler auf die gewählten Basis-Sorten verteilen. Die Verteilungssumme MUSS 100% betragen. Aus Scheibengewicht (`standard_recipe_weight_g`) und Anteil SHALL das System Gramm- und kcal-Werte pro Sorte berechnen. Der Default beim erstmaligen Öffnen (keine gespeicherte Verteilung) MUSS Bauernbrot = 100%, alle anderen Brotsorten = 0% sein. Falls Bauernbrot nicht im Katalog existiert, SHALL das System das erste verfügbare Base-Ingredient auf 100% setzen. Zusätzlich zur Gramm-Menge SHALL das System — sofern eine benannte Portion (z.B. „Scheibe") für die Zutat vorhanden ist — einen abgeleiteten Portionshinweis gemäß der `portion-quantity-hint`-Konvention anzeigen (Gramm zuerst, Portion sekundär).

#### Scenario: Basis-Verteilung berechnet Gramm und Portionshinweis

- **WHEN** 3 BE/Person mit 50% Bauernbrot (60g/Scheibe) und 50% Brötchen gewählt sind
- **THEN** zeigt das System für Bauernbrot `"90g · ≈ 1,5 Scheiben"` und für Brötchen die entsprechende Gramm-Menge mit passendem Portionshinweis, jeweils inklusive kcal

#### Scenario: Verteilungssumme wird auf 100% gehalten

- **WHEN** der Nutzer einen Basis-Schieberegler verändert
- **THEN** passt das System die übrigen ungesperrten Sorten so an, dass die Summe 100% bleibt

#### Scenario: Default ist 100% Bauernbrot

- **WHEN** der Wizard zum ersten Mal geöffnet wird (keine gespeicherte Verteilung)
- **THEN** zeigt das System Bauernbrot = 100%, alle anderen Brotsorten = 0%
- **AND** alle Brotsorten sind sichtbar und ihre Slider sind aktiv

#### Scenario: Fallback bei fehlendem Bauernbrot

- **WHEN** der Katalog kein Bauernbrot enthält (gelöscht oder fehlende Seed-Daten)
- **THEN** setzt das System das erste verfügbare Base-Ingredient auf 100% und alle anderen auf 0%

#### Scenario: Gespeicherte Verteilung hat Vorrang

- **WHEN** ein vorhandenes RefMeal mit gespeicherter Brot-Verteilung geöffnet wird
- **THEN** zeigt das System die gespeicherte Verteilung (nicht den Default)

## ADDED Requirements

### Requirement: Portionshinweis im Belag-Schritt

Das System SHALL im Schritt Belag (`StepBelag.tsx`) für jede Belag-Zutat mit vorhandener benannter Portion (z.B. „Packung") zusätzlich zur Gramm-Menge im Slider-Detail einen abgeleiteten Portionshinweis gemäß der `portion-quantity-hint`-Konvention anzeigen.

#### Scenario: Belag mit Packungshinweis

- **WHEN** eine Belag-Zutat mit berechneten 40g angezeigt wird und ihre Portion „Packung" `weight_g=500` besitzt
- **THEN** MUST der Slider-Detail-Text `"40g · ≈ 0,1 Packung"` enthalten

### Requirement: Portionshinweis in der Cockpit-Zusammenfassung

Das System SHALL in der Zusammenfassungstabelle des Cockpit-Schritts (`StepCockpit.tsx`) für jede Position mit Gramm-Menge und vorhandener benannter Portion zusätzlich den abgeleiteten Portionshinweis anzeigen, sowohl je Zeile als auch in den Gesamtsummen-Zeilen (z.B. „Brote gesamt", „Belag gesamt").

#### Scenario: Zusammenfassungszeile mit Portionshinweis

- **WHEN** die Zusammenfassungstabelle eine Brot-Position mit 90g und Portion „Scheibe" (`weight_g=60`) zeigt
- **THEN** MUST die „Menge/P"-Spalte `"90g · ≈ 1,5 Scheiben"` enthalten

#### Scenario: Gesamtsummen-Zeile mit gemischten Zutaten

- **WHEN** die „Brote gesamt"-Zeile aus mehreren Brotsorten mit unterschiedlichen Portionsgrößen berechnet wird
- **THEN** MUST die Gesamtsummen-Zeile nur die Gramm-Gesamtsumme zeigen, ohne einen (nicht sinnvoll aggregierbaren) Portionshinweis für die Summenzeile
