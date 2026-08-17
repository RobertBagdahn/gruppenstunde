# data-distribution-charts Specification

## Purpose
Defines public interactive data distribution charts for ingredient and recipe cost, calorie, and nutrient distributions using Recharts.

## ADDED Requirements

### Requirement: Öffentliche Datenverteilungs-Seite
Das food-frontend SHALL eine öffentliche Seite `/data-quality/distributions` bereitstellen, die interaktive Datenverteilungs-Charts für Zutaten und Rezepte anzeigt.

#### Scenario: Seite für alle zugänglich
- **WHEN** ein beliebiger Nutzer (auch nicht eingeloggt) auf `/data-quality/distributions` navigiert
- **THEN** SHALL die Seite mit Chart-Auswahl geladen werden
- **THEN** SHALL der Tab "Zutaten" als Standard ausgewählt sein

### Requirement: Zutaten-Kostenverteilung
Das System SHALL ein Histogramm der `price_per_kg`-Verteilung aller Zutaten anzeigen.

#### Scenario: Kosten-Histogramm
- **WHEN** der Chart "Kostenverteilung" im Zutaten-Tab ausgewählt wird
- **THEN** SHALL ein Histogramm mit `price_per_kg`-Buckets (z.B. 0-1€, 1-2€, ..., 20€+) angezeigt werden
- **THEN** SHALL die Y-Achse die Anzahl der Zutaten pro Bucket zeigen
- **THEN** SHALL ein Tooltip beim Hover Bucket-Grenzen und Anzahl anzeigen

#### Scenario: Kostenverteilung gefiltert
- **WHEN** Filter wie NutritionalTag (vegan), RetailSection oder Status gesetzt sind
- **THEN** SHALL das Histogramm nur Zutaten des gefilterten Sets anzeigen

### Requirement: Zutaten-Kalorienverteilung
Das System SHALL die Energieverteilung (kcal/100g) aller Zutaten visualisieren.

#### Scenario: Kalorien-Histogramm
- **WHEN** der Chart "Kalorienverteilung" ausgewählt wird
- **THEN** SHALL ein Histogramm mit kcal/100g-Buckets (0-50, 50-100, ..., 700+) angezeigt werden

#### Scenario: Energiedichte-Topliste
- **WHEN** der Chart "Energiedichte" ausgewählt wird
- **THEN** SHALL ein Balkendiagramm die Top-20 Zutaten mit höchster Energiedichte (kcal/100g) anzeigen
- **THEN** SHALL jede Bar den Zutatennamen und kcal-Wert zeigen
- **THEN** SHALL ein Toggle zwischen "Top 20" und "Bottom 20" existieren

### Requirement: Makronährstoff-Scatter-Chart
Das System SHALL einen Scatter-Plot mit Makronährstoff-Verhältnissen aller Zutaten anzeigen.

#### Scenario: Scatter Fett vs Kohlenhydrate
- **WHEN** der Chart "Makronährstoffe" ausgewählt wird
- **THEN** SHALL ein Scatter-Plot mit `fat_g/100g` (X-Achse) und `carbohydrate_g/100g` (Y-Achse) angezeigt werden
- **THEN** SHALL die Blasengröße proportional zu `energy_kcal` sein
- **THEN** SHALL die Blasenfarbe vegan (grün) und nicht-vegan (rot) unterscheiden

#### Scenario: Scatter-Achsen konfigurierbar
- **WHEN** der Nutzer die Achsen-Dropdowns ändert
- **THEN** SHALL X- und Y-Achse auf das gewählte Nährwert-Feld wechseln (protein_g, fat_g, carbohydrate_g, fibre_g, sugar_g)

#### Scenario: Tooltip beim Hover
- **WHEN** der Nutzer über eine Blase hovert
- **THEN** SHALL ein Tooltip Name, kcal, Fett, Kohlenhydrate, Eiweiß und vegan-Status anzeigen

### Requirement: Rezepte-Kostenverteilung
Das System SHALL die Kostenverteilung pro Portion für Rezepte visualisieren.

#### Scenario: Rezept-Kosten-Histogramm
- **WHEN** der Tab "Rezepte" und Chart "Kosten pro Portion" ausgewählt wird
- **THEN** SHALL ein Histogramm mit `cached_price_total`-Buckets angezeigt werden
- **THEN** SHALL der Preis in Euro dargestellt werden

### Requirement: Rezepte-Kalorienverteilung
Das System SHALL die Kalorienverteilung pro Portion für Rezepte visualisieren.

#### Scenario: Rezept-Kalorien-Histogramm
- **WHEN** der Tab "Rezepte" und Chart "Kalorien pro Portion" ausgewählt wird
- **THEN** SHALL ein Histogramm mit `cached_energy_total_kcal`-Buckets angezeigt werden

### Requirement: Rezepte-Nutri-Score-Verteilung
Das System SHALL die Nutri-Score-Klassenverteilung aller Rezepte visualisieren.

#### Scenario: Nutri-Score Pie/Bar Chart
- **WHEN** der Chart "Nutri-Score" ausgewählt wird
- **THEN** SHALL ein Balken- oder Kuchendiagramm die Anzahl Rezepte pro Nutri-Score-Klasse (A-E) anzeigen
- **THEN** SHALL die Klassen in den offiziellen Nutri-Score-Farben dargestellt werden (A=dunkelgrün, B=hellgrün, C=gelb, D=orange, E=rot)

### Requirement: Globale Filter für Charts
Alle Chart-Seiten SHALL gemeinsame Filter-Controls bieten.

#### Scenario: Filter nach Vegan/Vegetarisch
- **WHEN** der Nutzer "Vegan" im Filter auswählt
- **THEN** SHALL nur Zutaten/Rezepte mit dem entsprechenden NutritionalTag angezeigt werden
- **THEN** SHALL alle Charts sich entsprechend aktualisieren

#### Scenario: Filter nach RetailSection (nur Zutaten)
- **WHEN** der Nutzer eine RetailSection im Dropdown auswählt
- **THEN** SHALL nur Zutaten dieser Abteilung in den Charts erscheinen

#### Scenario: Filter nach Status
- **WHEN** der Nutzer "verified" im Status-Filter auswählt
- **THEN** SHALL nur Zutaten/Rezepte mit diesem Status angezeigt werden

#### Scenario: Filter zurücksetzen
- **WHEN** der Nutzer auf "Filter zurücksetzen" klickt
- **THEN** SHALL alle Filter auf ihre Default-Werte zurückgesetzt werden
- **THEN** SHALL alle Charts das gesamte Datenset anzeigen

### Requirement: Chart API Endpunkte
Das Backend SHALL dedizierte API-Endpunkte für aggregierte Chart-Daten bereitstellen.

#### Scenario: Zutaten-Kostendaten
- **WHEN** `GET /api/data-quality/ingredients/distribution/cost/?tags=vegan_id&retail_section=obst_id` aufgerufen wird
- **THEN** SHALL die Antwort `{buckets: [{min, max, count}], stats: {mean, median, p5, p95, count}}` enthalten

#### Scenario: Zutaten-Energiedaten
- **WHEN** `GET /api/data-quality/ingredients/distribution/energy/` aufgerufen wird
- **THEN** SHALL die Antwort `{buckets: [{min, max, count}], top_dense: [{id, name, energy_kcal}], bottom_dense: [...]}` enthalten

#### Scenario: Rezepte-Nutri-Score-Daten
- **WHEN** `GET /api/data-quality/recipes/distribution/nutri-score/?recipe_type=warm_meal` aufgerufen wird
- **THEN** SHALL die Antwort `{classes: [{class: "A", count: 42, color: "#..."}, ...]}` enthalten

#### Scenario: Chart-Endpunkte sind öffentlich
- **WHEN** ein nicht-authentifizierter User die Chart-Endpunkte aufruft
- **THEN** SHALL die Anfrage erfolgreich sein (kein Auth erforderlich)

#### Scenario: Paginierung nicht erforderlich
- **WHEN** Chart-Endpunkte aufgerufen werden
- **THEN** SHALL die Antwort NICHT paginiert sein (Aggregatdaten sind klein)
