## ADDED Requirements

### Requirement: Abgeleiteter Portionshinweis neben Gramm-Mengen

Das System SHALL für jede angezeigte Gramm-Menge einer Zutat, die eine benannte Portion (`priority`, `weight_g`, `name` ungleich der reinen Gramm-Basiseinheit) besitzt, zusätzlich einen abgeleiteten Portionshinweis anzeigen. Format: `"{grams}g · ≈ {count} {portion_name(s)}"`. Die Gramm-Menge SHALL immer zuerst stehen, der Portionshinweis folgt sekundär nach einem Trennzeichen `" · "`.

#### Scenario: Einfacher Portionshinweis

- **WHEN** eine Zutat 85g beträgt und ihre Portion mit `priority=1` den Namen „Scheibe" mit `weight_g=50` hat
- **THEN** MUST die Anzeige `"85g · ≈ 1,7 Scheiben"` lauten

#### Scenario: Kein Portionshinweis bei fehlenden Portionsdaten

- **WHEN** eine Zutat keine Portion mit `weight_g > 0` außer der reinen Gramm-Einheit besitzt
- **THEN** MUST nur die Gramm-Menge angezeigt werden, ohne Portionshinweis

### Requirement: Wahl der primären Portion nach Priorität

Das System SHALL die Portion mit dem niedrigsten `priority`-Wert (Rang 1) als primären Portionshinweis verwenden, sofern ihr `weight_g > 0` ist.

#### Scenario: Mehrere Portionen vorhanden

- **WHEN** eine Zutat die Portionen „Scheibe" (`priority=1`, `weight_g=50`) und „Packung" (`priority=2`, `weight_g=500`) besitzt
- **THEN** MUST „Scheibe" als primärer Portionshinweis verwendet werden

#### Scenario: Priorität-1-Portion ohne Gewicht

- **WHEN** die Portion mit `priority=1` `weight_g=null` hat, aber eine andere Portion `weight_g > 0` besitzt
- **THEN** MUST die nächstniedrigere Portion mit gültigem `weight_g` als primärer Hinweis verwendet werden

### Requirement: Sekundärer Portionshinweis bei mehreren sinnvollen Portionsarten

Das System SHALL zusätzlich zur primären Portion eine zweite, sinnvoll unterscheidbare Portionsart (unterschiedlicher Name, `weight_g > 0`) anzeigen, sofern eine solche für die Zutat existiert.

#### Scenario: Scheibe und Packung parallel

- **WHEN** eine Zutat sowohl „Scheibe" (50g) als auch „Packung" (500g) als Portion besitzt und die berechnete Menge 85g beträgt
- **THEN** MUST die Anzeige `"85g · ≈ 1,7 Scheiben · ≈ 0,2 Packungen"` lauten

#### Scenario: Nur eine Portionsart vorhanden

- **WHEN** eine Zutat nur eine benannte Portion außer Gramm besitzt
- **THEN** MUST nur diese eine Portion im Hinweis erscheinen

### Requirement: Rundung und Schwellwert für Portionswerte

Portionswerte SHALL mit genau einer Nachkommastelle und deutschem Komma als Dezimaltrennzeichen angezeigt werden (`1,7`). Portionswerte kleiner als `0,1` SHALL nicht angezeigt werden (auch nicht als `"0,0"`).

#### Scenario: Wert unter Schwellwert

- **WHEN** die berechnete Portionsanzahl `0,04` beträgt
- **THEN** MUST der Portionshinweis für diese Portionsart nicht angezeigt werden (nur Gramm)

#### Scenario: Normale Rundung

- **WHEN** die berechnete Portionsanzahl `1,73` beträgt
- **THEN** MUST die Anzeige `"1,7"` lauten (keine kaufmännische Aufrundung auf ganze Portionen)

### Requirement: Live-Aktualisierung bei Mengenänderung

Der Portionshinweis SHALL sich automatisch aktualisieren, sobald sich die zugrunde liegende Gramm-Menge ändert (z.B. durch Schieberegler-Änderung oder „Normalisieren"-Aktion), ohne dass ein Neuladen der Seite nötig ist.

#### Scenario: Skalierung durch Normalisieren

- **WHEN** der Nutzer im Cockpit-Schritt „Normalisieren" auslöst und sich dadurch die Gramm-Menge einer Zutat ändert
- **THEN** MUST der Portionshinweis sofort die neue, aus der aktualisierten Gramm-Menge abgeleitete Portionsanzahl zeigen

### Requirement: Hinweis bei fehlenden Portionsdaten

Besitzt eine Zutat keine geeignete Portion für den Portionshinweis, SHALL das System einen visuell hervorgehobenen (orangen), anklickbaren Hinweis anzeigen, der zur Bearbeitungsseite der Zutat führt, um dort eine Portion zu ergänzen.

#### Scenario: Zutat ohne Portionsdaten

- **WHEN** eine im Essensplan verwendete Zutat keine Portion mit `weight_g > 0` außer Gramm besitzt
- **THEN** MUST ein oranger Hinweis erscheinen, der beim Klick zur Zutat-Bearbeitungsseite (`/ingredients/{slug}`) navigiert

### Requirement: Getränke-Portionen (ml-Basis)

Für Getränke-Mengen (ml) SHALL dieselbe Hinweis-Logik gelten, wobei als primäre Portion Tasse oder Schuss (falls vorhanden) verwendet wird.

#### Scenario: Getränkemenge mit Tassen-Hinweis

- **WHEN** eine Getränke-Zutat 300ml beträgt und eine Portion „Tasse" mit `weight_g=200` (ml-äquivalent) besitzt
- **THEN** MUST die Anzeige `"300ml · ≈ 1,5 Tassen"` lauten

### Requirement: Portionshinweis im Essensplan-Editor für Gramm-Items

Im Essensplan-Editor (`MealSlot.tsx`) SHALL für Zutaten-Items, deren `measuring_unit_name` die Gramm-Basiseinheit ist (bisher nur `"{grams}g"` angezeigt), zusätzlich der abgeleitete Portionshinweis gemäß der oben definierten Konvention angezeigt werden. Items, die bereits eine Portions-Einheit als `measuring_unit_name` besitzen (bestehender `portion_display`-Zweig), SHALL unverändert bleiben.

#### Scenario: Gramm-Item im Essensplan erhält Portionshinweis

- **WHEN** ein `MealItem` mit `measuring_unit_name="g"` und `quantity_g=90` angezeigt wird und die zugehörige Zutat eine Portion „Scheibe" (`weight_g=60`) besitzt
- **THEN** MUST die Anzeige `"90g · ≈ 1,5 Scheiben"` statt nur `"90g"` lauten

#### Scenario: Bestehende Portion-Items bleiben unverändert

- **WHEN** ein `MealItem` bereits `measuring_unit_name="Stück"` mit vorhandenem `portion_display`-Feld besitzt
- **THEN** MUST die bisherige Darstellung (`portion_display` vom Backend) unverändert verwendet werden
