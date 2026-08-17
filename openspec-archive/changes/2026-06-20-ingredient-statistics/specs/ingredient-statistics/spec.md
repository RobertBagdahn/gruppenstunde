## ADDED Requirements

### Requirement: Statistik-Seite ist unter /ingredients/statistics/:tab erreichbar
Das Food-Frontend SHALL eine neue Unterseite `/ingredients/statistics/:tab` bereitstellen, die interaktive Zutaten-Statistiken mit 20 kuratierten Tabs anzeigt.

#### Scenario: Navigation von der Zutaten-Übersicht
- **WHEN** ein Nutzer auf der `/ingredients`-Seite auf den Button "Statistiken" klickt
- **THEN** SHALL der Nutzer zu `/ingredients/statistics/sugar-extremes` navigiert werden
- **THEN** SHALL der erste Tab ("Zucker-Extreme") standardmäßig ausgewählt sein

#### Scenario: Seite ohne Auth zugänglich
- **WHEN** ein nicht eingeloggter Nutzer `/ingredients/statistics/sugar-extremes` aufruft
- **THEN** SHALL die Statistik-Seite geladen werden
- **THEN** SHALL alle Tabs und Daten sichtbar sein (öffentliche Daten)

#### Scenario: Tab-Auswahl per Sub-Route
- **WHEN** ein Nutzer `/ingredients/statistics/protein-champions` aufruft
- **THEN** SHALL der "Protein-Champions"-Tab ausgewählt sein
- **THEN** SHALL die URL den aktuellen Tab widerspiegeln

#### Scenario: Ungültiger Tab
- **WHEN** ein Nutzer `/ingredients/statistics/nicht-existenter-tab` aufruft
- **THEN** SHALL auf den ersten Tab (`sugar-extremes`) redirectet werden

### Requirement: Dedizierte Statistik-API-Endpoints
Das Backend SHALL pro Analyse-Kategorie einen dedizierten Endpoint bereitstellen.

#### Scenario: Rankings-Endpoint
- **WHEN** `GET /api/ingredients/statistics/rankings/?field=sugar_g` aufgerufen wird
- **THEN** SHALL die Antwort Top-20 und Bottom-20 Zutaten für das Feld `sugar_g` enthalten
- **THEN** SHALL jedes Item enthalten: `id`, `name`, `slug`, `value`, `nutri_class`, `retail_section_name`
- **THEN** SHALL nur verified Ingredients berücksichtigt werden
- **THEN** SHALL Zutaten mit Wert 0 oder null ausgeschlossen werden (für Bottom-Ranking)

#### Scenario: Distributions-Endpoint
- **WHEN** `GET /api/ingredients/statistics/distributions/?field=protein_g` aufgerufen wird
- **THEN** SHALL die Antwort 20-Bucket-Histogram-Daten enthalten
- **THEN** SHALL die Antwort Mean, Median, P5 und P95 als statistische Kennwerte enthalten
- **THEN** SHALL jeder Bucket enthalten: `min`, `max`, `count`, `percentage`

#### Scenario: Scatter-Endpoint
- **WHEN** `GET /api/ingredients/statistics/scatter/?x_field=sugar_g&y_field=fat_g` aufgerufen wird
- **THEN** SHALL die Antwort einen Array von Datenpunkten enthalten: `[{id, name, slug, x, y, nutri_class, retail_section_name}]`
- **THEN** SHALL optional der Pearson-Korrelationskoeffizient enthalten sein

#### Scenario: Tag-Lists-Endpoint
- **WHEN** `GET /api/ingredients/statistics/tag-lists/?tag=gluten` aufgerufen wird
- **THEN** SHALL die Antwort alle verified Zutaten enthalten, die den NutritionalTag "Gluten" haben
- **THEN** SHALL jedes Item `id`, `name`, `slug`, `energy_kcal`, `protein_g`, `price_per_kg`, `nutri_class` enthalten
- **THEN** SHALL der `total_count` („142 von X Zutaten enthalten Gluten") enthalten sein

#### Scenario: Scores-Endpoint
- **WHEN** `GET /api/ingredients/statistics/scores/?score_type=nutri_score` aufgerufen wird
- **THEN** SHALL die Antwort Counts pro Nutri-Klasse (A–E) enthalten
- **THEN** SHALL pro Klasse die Top-3 und Bottom-3 Zutaten enthalten sein

#### Scenario: Outliers-Endpoint
- **WHEN** `GET /api/ingredients/statistics/outliers/` aufgerufen wird
- **THEN** SHALL die Antwort IQR-Ausreißer für alle Nährwert-Felder enthalten
- **THEN** SHALL jeder Ausreißer `id`, `name`, `slug`, `value`, `severity` (moderate|extreme) enthalten
- **THEN** SHALL die IQR-Methode verwenden: moderate = >1.5×IQR, extreme = >3×IQR

#### Scenario: Comparison-Endpoint
- **WHEN** `GET /api/ingredients/statistics/comparison/?group_by=vegan&metric=protein_g` aufgerufen wird
- **THEN** SHALL die Antwort Verteilungsdaten für die Gruppe (Vegan) und den Rest getrennt enthalten
- **THEN** SHALL Mittelwert-Differenz zwischen Gruppe und Rest enthalten sein

#### Scenario: Tab-spezifische Query-Parameter
- **WHEN** `GET /api/ingredients/statistics/rankings/?field=sugar_g&retail_section_id=3,5` aufgerufen wird
- **THEN** SHALL nur Zutaten der Retail-Sections 3 und 5 berücksichtigt werden
- **THEN** SHALL die Filterung nur auf diesen Endpoint wirken (keine globalen Filter)

#### Scenario: Nur verified Ingredients
- **WHEN** ein beliebiger Statistik-Endpoint ohne `status`-Parameter aufgerufen wird
- **THEN** SHALL standardmäßig nur `status='verified'` gefiltert werden
- **THEN** SHALL Entwürfe (draft) ausgeschlossen sein

### Requirement: Leaderboard-Tabs (1–5)
Das System SHALL fünf Leaderboard-Tabs mit statischen Top-20 und Bottom-20 Tabellen bereitstellen.

#### Scenario: Zucker-Extreme (Tab 1)
- **WHEN** der Tab "Zucker-Extreme" ausgewählt ist
- **THEN** SHALL eine Tabelle die Top-20 Zutaten mit höchstem Zuckergehalt anzeigen
- **THEN** SHALL ein Toggle zur Bottom-20-Ansicht existieren (niedrigster Zuckergehalt, >0)
- **THEN** SHALL ein horizontaler Balken-Chart die Werte visualisieren
- **THEN** SHALL jede Zeile Name (verlinkt), Zucker g/100g, Nutri-Score-Badge und Retail-Section zeigen

#### Scenario: Protein-Champions (Tab 2)
- **WHEN** der Tab "Protein-Champions" ausgewählt ist
- **THEN** SHALL Top-20 und Bottom-20 Proteinquellen angezeigt werden
- **THEN** SHALL ein Badge pro Zutat anzeigen: vegan/vegetarisch/fleischlich

#### Scenario: Kalorien-Dichte (Tab 3)
- **WHEN** der Tab "Kalorien-Dichte" ausgewählt ist
- **THEN** SHALL die energiedichtesten und energieärmsten Zutaten angezeigt werden
- **THEN** SHALL ein Hinweis anzeigen, ob hohe Dichte von Fett oder Zucker dominiert wird

#### Scenario: Preis-pro-Protein (Tab 4)
- **WHEN** der Tab "Preis-pro-Protein" ausgewählt ist
- **THEN** SHALL eine Rangliste Protein (g) pro Euro anzeigen
- **THEN** SHALL farbkodiert sein nach vegan/vegetarisch/tierisch

#### Scenario: Nährwert-Rekorde (Tab 5)
- **WHEN** der Tab "Nährwert-Rekorde" ausgewählt ist
- **THEN** SHALL ein Karten-Grid Spitzenreiter und Schlusslichter für Ballaststoffe, Salz und Vitamin C anzeigen

### Requirement: Verteilungs-Tabs (6–10)
Das System SHALL fünf Verteilungs-Tabs mit Histogrammen und statistischen Overlays bereitstellen.

#### Scenario: Zucker-Verteilung (Tab 6)
- **WHEN** der Tab "Zucker-Verteilung" ausgewählt ist
- **THEN** SHALL ein Histogramm die Verteilung des Zuckergehalts über alle Zutaten zeigen
- **THEN** SHALL Mean, Median, P5 und P95 als vertikale Linien markiert sein
- **THEN** SHALL IQR-Ausreißer farblich hervorgehoben sein
- **THEN** SHALL eine Summary-Box anzeigen: „X% der Zutaten haben weniger als Yg Zucker"

#### Scenario: Protein-Landschaft (Tab 7)
- **WHEN** der Tab "Protein-Landschaft" ausgewählt ist
- **THEN** SHALL ein Histogramm der Proteinverteilung angezeigt werden
- **THEN** SHALL ein Toggle zwischen „Alle Zutaten" und „Nur pflanzlich" existieren
- **THEN** SHALL sich das Histogramm beim Umschalten aktualisieren

#### Scenario: Fett-Komposition (Tab 8)
- **WHEN** der Tab "Fett-Komposition" ausgewählt ist
- **THEN** SHALL ein Side-by-side-Histogramm Gesamtfett vs. gesättigte Fettsäuren zeigen

#### Scenario: Preis pro Abteilung (Tab 9)
- **WHEN** der Tab "Preis pro Abteilung" ausgewählt ist
- **THEN** SHALL ein gestapeltes Histogramm die Preisverteilung pro Retail-Section zeigen

#### Scenario: Ballaststoff-Oase (Tab 10)
- **WHEN** der Tab "Ballaststoff-Oase?" ausgewählt ist
- **THEN** SHALL ein Histogramm der Ballaststoff-Verteilung angezeigt werden
- **THEN** SHALL Werte rechts vom Median grün, links grau eingefärbt sein

### Requirement: Korrelations-Tabs (11–14)
Das System SHALL vier Korrelations-Tabs mit interaktiven Scatterplots bereitstellen.

#### Scenario: Zucker vs. Fett (Tab 11)
- **WHEN** der Tab "Zucker vs. Fett" ausgewählt ist
- **THEN** SHALL ein Scatterplot Zucker (X) vs. Fett (Y) angezeigt werden
- **THEN** SHALL Punktgröße die Kaloriendichte repräsentieren
- **THEN** SHALL Punktfarbe den Nutri-Score repräsentieren
- **THEN** SHALL ein Hover-Tooltip Name und Werte zeigen
- **THEN** SHALL jeder Punkt zur Detailseite verlinken

#### Scenario: Umwelt vs. Preis (Tab 12)
- **WHEN** der Tab "Umwelt vs. Preis" ausgewählt ist
- **THEN** SHALL ein Scatterplot Environmental Score (X) vs. Preis/kg (Y) mit Trendlinie angezeigt werden

#### Scenario: Protein vs. Energie (Tab 13)
- **WHEN** der Tab "Protein vs. Energie" ausgewählt ist
- **THEN** SHALL ein Scatterplot Protein (X) vs. Kalorien (Y) angezeigt werden
- **THEN** SHALL die „Heiliger Gral"-Zone (proteinreich + kalorienarm) visuell markiert sein

#### Scenario: Kind vs. Nutri (Tab 14)
- **WHEN** der Tab "Kind vs. Nutri" ausgewählt ist
- **THEN** SHALL ein Scatterplot Child-Score (X) vs. Nutri-Score-Klasse (Y) angezeigt werden
- **THEN** SHALL der Sweet Spot (hoher Child-Score + gute Nutri-Klasse) markiert sein

### Requirement: Tag-Listen-Tabs (15–17)
Das System SHALL drei Tag-basierte Listen-Tabs mit sortierbaren Tabellen bereitstellen.

#### Scenario: Gluten-Radar (Tab 15)
- **WHEN** der Tab "Gluten-Radar" ausgewählt ist
- **THEN** SHALL eine sortierbare Tabelle ALLER glutenhaltigen Zutaten angezeigt werden
- **THEN** SHALL ein Zähl-Badge anzeigen: „X von Y Zutaten enthalten Gluten"
- **THEN** SHALL Spalten enthalten: Name, kcal, Protein, Preis, Nutri-Score

#### Scenario: Veganer Protein-Finder (Tab 16)
- **WHEN** der Tab "Veganer Protein-Finder" ausgewählt ist
- **THEN** SHALL eine Tabelle aller vegan-getaggten Zutaten nach Proteingehalt absteigend angezeigt werden
- **THEN** SHALL die Top-5 mit grünem Badge hervorgehoben sein

#### Scenario: Laktose-Übersicht (Tab 17)
- **WHEN** der Tab "Laktose-Übersicht" ausgewählt ist
- **THEN** SHALL eine sortierbare Tabelle aller laktosehaltigen Zutaten mit Laktosegehalt (g/100g) angezeigt werden

### Requirement: Score-Tabs (18–19)
Das System SHALL zwei Score-Analyse-Tabs bereitstellen.

#### Scenario: Nutri-Landschaft (Tab 18)
- **WHEN** der Tab "Nutri-Landschaft" ausgewählt ist
- **THEN** SHALL ein Pie-Chart die Verteilung A–E über alle Zutaten zeigen
- **THEN** SHALL pro Klasse eine Mini-Tabelle mit Top-3 und Bottom-3 Zutaten existieren
- **THEN** SHALL die Nutri-Score-Farben (A=Grün bis E=Rot) verwendet werden

#### Scenario: NOVA-Verarbeitungsgrad (Tab 19)
- **WHEN** der Tab "NOVA-Grad" ausgewählt ist
- **THEN** SHALL ein Balken-Chart die NOVA 1–4 Verteilung zeigen
- **THEN** SHALL eine Kreuztabelle NOVA × Nutri-Score dargestellt werden
- **THEN** SHALL ein Hinweis erscheinen, wenn <10% der Zutaten NOVA-Daten haben

### Requirement: Ausreißer-Detektor (Tab 20)
Das System SHALL einen Tab bereitstellen, der automatisch statistische Ausreißer für alle Nährwert-Metriken erkennt und auflistet.

#### Scenario: Ausreißer-Übersicht
- **WHEN** der Tab "Ausreißer-Detektor" ausgewählt ist
- **THEN** SHALL eine Summary-Zeile anzeigen: „5 Ausreißer bei Zucker, 3 bei Protein, ..."
- **THEN** SHALL pro Nährwert-Metrik ein aufklappbares Akkordeon existieren
- **THEN** SHALL moderate Ausreißer (>1.5×IQR) gelb markiert sein
- **THEN** SHALL extreme Ausreißer (>3×IQR) rot markiert sein

#### Scenario: Ausreißer verlinken
- **WHEN** ein Nutzer auf einen Ausreißer-Namen klickt
- **THEN** SHALL er zur Detailseite der Zutat navigieren

### Requirement: Button auf IngredientListPage
Die Zutaten-Übersichtsseite SHALL einen Button enthalten, der zur Statistik-Seite führt.

#### Scenario: Statistik-Button
- **WHEN** die `/ingredients`-Seite geladen wird
- **THEN** SHALL ein Button "Statistiken" in der Toolbar oben rechts sichtbar sein
- **THEN** SHALL der Button ein Chart-Icon verwenden
- **THEN** SHALL der Button zu `/ingredients/statistics` führen

### Requirement: Mobile-optimierte Tab-Navigation
Die Statistik-Seite SHALL auf Mobilgeräten (320px Breite) voll funktionsfähig sein.

#### Scenario: Horizontale Tab-Leiste
- **WHEN** die Seite auf einem Mobilgerät mit 320px Breite geladen wird
- **THEN** SHALL die Tab-Leiste horizontal scrollbar sein
- **THEN** SHALL der aktive Tab farblich hervorgehoben sein
- **THEN** SHALL ein Fade-Indikator anzeigen, dass weitere Tabs außerhalb des Viewports existieren

#### Scenario: Charts auf Mobile
- **WHEN** ein Chart (Scatterplot, Histogramm) auf Mobile angezeigt wird
- **THEN** SHALL das Chart die volle Breite des Viewports nutzen
- **THEN** SHALL die Legende unterhalb des Charts erscheinen
- **THEN** SHALL Touch-Interaktionen (Tooltip-Tap) unterstützt werden

### Requirement: Tab-spezifische Filter
Jeder Tab SHALL eigene, thematisch passende Filter bereitstellen. Keine globalen Filter.

#### Scenario: Leaderboard-Filter
- **WHEN** ein Leaderboard-Tab ausgewählt ist
- **THEN** SHALL ein Retail-Section-Filter und optional ein Nutritional-Tag-Filter verfügbar sein

#### Scenario: Verteilungs-Filter
- **WHEN** ein Verteilungs-Tab ausgewählt ist
- **THEN** SHALL ein Retail-Section-Filter und ein Nutritional-Tag-Filter verfügbar sein
- **THEN** SHALL der Protein-Landschaft-Tab zusätzlich einen Toggle „Alle / Nur pflanzlich" haben

#### Scenario: Tab-Wechsel setzt Filter zurück
- **WHEN** der Nutzer zu einem anderen Tab wechselt
- **THEN** SHALL der neue Tab mit seinen Default-Filtern starten
- **THEN** SHALL die Filter des vorherigen Tabs NICHT übernommen werden

#### Scenario: Filter als URL-Parameter
- **WHEN** der Nutzer Filter in einem Tab ändert
- **THEN** SHALL die URL aktualisiert werden (z.B. `/ingredients/statistics/sugar-distribution?retail_section=3,5`)
- **THEN** SHALL beim Teilen der URL der exakt gleiche Tab- und Filter-Zustand wiederhergestellt werden

### Requirement: API antwortet in <200ms
Jeder Statistik-Endpoint SHALL in unter 200ms antworten.

#### Scenario: Performance-Anforderung
- **WHEN** ein Statistik-Endpoint ohne Filter aufgerufen wird
- **THEN** SHALL die Antwortzeit unter 200ms liegen
- **THEN** SHALL die Datenbank-Abfragen optimiert sein (`.values()` statt Modell-Instanzen, aggregierte Queries)
