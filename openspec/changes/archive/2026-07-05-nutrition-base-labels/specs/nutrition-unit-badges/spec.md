## ADDED Requirements

### Requirement: Nutrition base badges on recipe detail page

Die Recipe-Detailseite SHALL für jede Section, die Nährwerte anzeigt, einen visuellen Badge mit der Bezugsgröße anzeigen. Es gibt drei Badge-Typen: "pro 100g", "pro Portion", "gesamt".

Jeder Badge SHALL als kleine, abgerundete Pill (text-[10px], reduced padding) mit fester Farbe dargestellt werden:
- "pro 100g": emerald-100-Background, emerald-700-Text
- "pro Portion": amber-100-Background, amber-700-Text
- "gesamt": sky-100-Background, sky-700-Text

Badges SHALL neben dem Section-Titel in derselben Zeile platziert werden.

#### Scenario: Nährwerte pro 100g Section zeigt Badge

- **WHEN** ein Nutzer die Recipe-Detailseite öffnet und die Section "Nährwerte pro 100g" sieht
- **THEN** SHALL neben dem Titel ein Badge "pro 100g" in emerald-Farben angezeigt werden

#### Scenario: Zutaten-Beiträge Section zeigt Badge

- **WHEN** ein Nutzer die Section "Zutaten-Beiträge" sieht
- **THEN** SHALL der Section-Header "Zutaten-Beiträge pro Portion" lauten (umbenannt)
- **THEN** SHALL neben dem Titel ein Badge "pro Portion" in amber-Farben angezeigt werden

#### Scenario: Gesamtnährwerte Section zeigt Badge

- **WHEN** ein Nutzer die Section "Gesamtnährwerte" sieht
- **THEN** SHALL der Section-Header "Gesamtnährwerte" lauten (ohne "pro 100g")
- **THEN** SHALL neben dem Titel ein Badge "gesamt" in sky-Farben angezeigt werden

### Requirement: Verbesserungsvorschläge mit Badge

Jede Karte in den Verbesserungsvorschlägen SHALL einen Badge "pro Portion" anzeigen, der die Bezugsgröße der Werte (Aktuell, Ziel, Δ, Hauptverursacher) kennzeichnet.

#### Scenario: Badge in Verbesserungsvorschlag-Karte

- **WHEN** ein Nutzer die Verbesserungsvorschläge öffnet und eine Karte sieht
- **THEN** SHALL in der Karte ein Badge "pro Portion" sichtbar sein
- **THEN** SHALL "Aktuell", "Ziel" und "Hauptverursacher"-Werte als pro Portion erkennbar sein

### Requirement: Recipe Rules mit Badge

Die Recipe-Rules-Box SHALL einen Hinweis "pro Portion" enthalten, da alle Werte pro Portion ausgewertet werden (laut recipe-rules-display Spezifikation).

#### Scenario: Badge in Recipe Rules

- **WHEN** ein Nutzer die Recipe-Rules-Box für ein anwendbares Rezept öffnet
- **THEN** SHALL die Box neben dem Section-Titel einen Badge "pro Portion" anzeigen

### Requirement: NutritionBaseBadge-Komponente

Das System SHALL eine wiederverwendbare `NutritionBaseBadge`-Komponente bereitstellen mit dem Interface `{ base: 'per_100g' | 'per_portion' | 'total' }`.

Die Komponente SHALL:
- Den passenden deutschen Text anzeigen ("pro 100g", "pro Portion", "gesamt")
- Die feste Farbe basierend auf dem `base`-Parameter setzen
- Klein und dezent sein (text-[10px], px-1.5 py-0.5, rounded-full)

#### Scenario: Badge mit allen drei Typen

- **WHEN** die Komponente mit `base="per_100g"` gerendert wird
- **THEN** SHALL der Text "pro 100g" in emerald-Farben erscheinen

- **WHEN** die Komponente mit `base="per_portion"` gerendert wird
- **THEN** SHALL der Text "pro Portion" in amber-Farben erscheinen

- **WHEN** die Komponente mit `base="total"` gerendert wird
- **THEN** SHALL der Text "gesamt" in sky-Farben erscheinen

### Requirement: Gesamtnährwerte Section-Header korrigiert

Der Section-Header "Gesamtnährwerte (pro 100g)" SHALL zu "Gesamtnährwerte" korrigiert werden. Der Badge "gesamt" übernimmt die Kennzeichnung.

#### Scenario: Korrigierter Header

- **WHEN** ein Nutzer die Gesamtnährwerte-Section sieht
- **THEN** SHALL der Header "Gesamtnährwerte" lauten
- **THEN** SHALL kein "(pro 100g)" mehr im Header erscheinen

### Requirement: Section-Header "Zutaten-Beiträge" umbenannt

Der Section-Header "Zutaten-Beiträge pro Nährwert" SHALL zu "Zutaten-Beiträge pro Portion" umbenannt werden.

#### Scenario: Umbenannter Header

- **WHEN** ein Nutzer die Zutaten-Beiträge-Section sieht
- **THEN** SHALL der Header "Zutaten-Beiträge pro Portion" lauten
