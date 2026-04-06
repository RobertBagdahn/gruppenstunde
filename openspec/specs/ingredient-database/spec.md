# ingredient-database Specification

## Purpose

Zutatendatenbank fuer Rezepte und Essensplaene. Verwaltet Zutaten mit Naehrwerten pro 100g, Portionen (messbare Einheiten), Preise, Allergen-Kennzeichnung und automatische Nutri-Score-Berechnung. Grundlage fuer Rezept-Analyse, Preiskaskade, Norm-Personen-Berechnung und KI-Autovervollstaendigung.

## Context

- **Django App**: `idea` (die Zutatendatenbank lebt in der Idea-App, da sie direkt mit RecipeItems verknuepft ist)
- **API**: `/api/ingredients/`, `/api/retail-sections/`, `/api/nutritional-tags/`, `/api/measuring-units/`
- **Services**: `nutri_service.py`, `price_service.py`, `norm_person.py`, `recipe_checks.py`, `hint_service.py`, `ingredient_ai.py`, `shopping_service.py`
- **Beziehung zu Rezepten**: RecipeItem verknuepft Rezept (Idea mit type=recipe) mit Zutat ueber Portion

## Data Model

### Datenmodell-Hierarchie

```
Ingredient (Naehrwerte pro 100g, physikalische Eigenschaften, Scores)
  +-- Portion[] (Messeinheit + Gewicht, z.B. "1 Scheibe = 30g")
  |    +-- Price[] (Preis pro Packung, Haendler, Qualitaet)
  +-- IngredientAlias[] (alternative Namen fuer Suche)
  +-- NutritionalTag[] M2M (Allergen-/Unvertraeglichkeits-Kennzeichnung)

RecipeItem (Menge x Portion -> verknuepft Rezept mit Zutat)
  +-- portion FK -> Portion
  +-- ingredient FK -> Ingredient
```

## Requirements

### Requirement: Ingredient CRUD

Das System MUST vollstaendige CRUD-Operationen fuer Zutaten ueber `/api/ingredients/` bereitstellen.

#### Scenario: Zutat erstellen

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer POST `/api/ingredients/` mit Name und optionalen Naehrwerten absendet
- THEN wird eine Zutat mit Status `draft` erstellt
- AND ein Slug wird aus dem Namen generiert
- AND `created_by` wird auf den aktuellen Benutzer gesetzt

#### Scenario: Zutat per Slug abrufen

- GIVEN eine bestehende Zutat mit Slug "kartoffel"
- WHEN ein Benutzer GET `/api/ingredients/kartoffel/` aufruft
- THEN werden die vollstaendigen Zutatendaten zurueckgegeben inkl. Naehrwerte, Portionen, Preise und NutritionalTags

#### Scenario: Zutatenliste (paginiert, filterbar)

- GIVEN Zutaten existieren im System
- WHEN ein Benutzer GET `/api/ingredients/?page=1&page_size=20` aufruft
- THEN werden Zutaten paginiert zurueckgegeben
- AND Filter sind moeglich nach: `name` (Textsuche), `retail_section` (FK ID), `status` (draft/verified/user_content)

#### Scenario: Zutat aktualisieren

- GIVEN ein authentifizierter Benutzer und eine bestehende Zutat
- WHEN der Benutzer PATCH `/api/ingredients/{slug}/` mit partiellen Daten absendet
- THEN wird die Zutat aktualisiert
- AND bei Naehrwert-Aenderungen wird der Nutri-Score neu berechnet

#### Scenario: Zutat loeschen

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer DELETE `/api/ingredients/{slug}/` aufruft
- THEN wird die Zutat entfernt sofern keine RecipeItems darauf verweisen

### Requirement: Ingredient-Datenmodell

Das System SHALL folgende Felder pro Ingredient fuehren. Alle Naehrwerte sind pro 100g.

#### Scenario: Ingredient-Felder (Stammdaten)

- GIVEN ein Ingredient-Datensatz
- THEN hat er folgende Felder:
  - `name` (CharField), `slug` (SlugField, unique), `description` (TextField)
  - `status` (TextChoices: `draft`, `verified`, `user_content`)
  - `retail_section` (FK zu RetailSection, nullable)
  - `nutritional_tags` (M2M zu NutritionalTag)
  - `created_by` (FK zu User)

#### Scenario: Ingredient-Felder (Naehrwerte pro 100g)

- GIVEN ein Ingredient-Datensatz
- THEN hat er folgende Naehrwertfelder (alle FloatField, nullable):
  - `energy_kj` — Energie in Kilojoule
  - `protein_g` — Eiweiss in Gramm
  - `fat_g` — Fett in Gramm
  - `fat_sat_g` — Gesaettigte Fettsaeuren in Gramm
  - `carbohydrate_g` — Kohlenhydrate in Gramm
  - `sugar_g` — Zucker in Gramm
  - `fibre_g` — Ballaststoffe in Gramm
  - `salt_g` — Salz in Gramm
  - `sodium_mg` — Natrium in Milligramm
  - `fructose_g` — Fructose in Gramm
  - `lactose_g` — Laktose in Gramm

#### Scenario: Ingredient-Felder (physikalisch)

- GIVEN ein Ingredient-Datensatz
- THEN hat er folgende physikalische Felder:
  - `physical_density` (FloatField, nullable) — Dichte
  - `physical_viscosity` (TextChoices: `solid`, `beverage`) — bestimmt Nutri-Score-Tabelle
  - `durability_in_days` (IntegerField, nullable) — Haltbarkeit
  - `max_storage_temperature` (IntegerField, nullable) — Max. Lagertemperatur in Grad Celsius

#### Scenario: Ingredient-Felder (Scores)

- GIVEN ein Ingredient-Datensatz
- THEN hat er folgende Score-Felder:
  - `child_score` (IntegerField, 1-10) — Kinderfreundlichkeit
  - `scout_score` (IntegerField, 1-10) — Pfadfindereignung
  - `environmental_score` (IntegerField, 1-10) — Umweltfreundlichkeit
  - `nova_score` (IntegerField, 1-4) — NOVA-Verarbeitungsgrad (1=unverarbeitet, 4=hochverarbeitet)
  - `fruit_factor` (FloatField, 0.0-1.0) — Obst-/Gemuese-Anteil fuer Nutri-Score positive Punkte

#### Scenario: Ingredient-Felder (berechnet)

- GIVEN ein Ingredient-Datensatz
- THEN hat er folgende berechnete Felder:
  - `nutri_score` (IntegerField) — Nutri-Score Gesamtpunkte
  - `nutri_class` (IntegerField, 1-5) — Nutri-Score Klasse (1=A bis 5=E)
  - `price_per_kg` (DecimalField, EUR) — Berechnet aus guenstigstem Preis

#### Scenario: Ingredient-Felder (Referenzen)

- GIVEN ein Ingredient-Datensatz
- THEN hat er folgende Referenzfelder:
  - `fdc_id` (IntegerField, nullable) — USDA FoodData Central ID
  - `ean` (CharField, nullable) — Barcode

### Requirement: Portion-Verwaltung

Das System SHALL Portionen (messbare Einheiten) pro Zutat verwalten.

#### Scenario: Portion-Felder

- GIVEN ein Portion-Datensatz
- THEN hat er die Felder:
  - `name` (CharField, z.B. "1 Scheibe", "1 Essloeffel")
  - `quantity` (FloatField)
  - `rank` (IntegerField, Sortierung)
  - `ingredient` (FK zu Ingredient)
  - `measuring_unit` (FK zu MeasuringUnit)
- AND `weight_g` wird berechnet als `quantity x measuring_unit.quantity`

#### Scenario: Portion erstellen

- GIVEN eine bestehende Zutat mit Slug "brot"
- WHEN der Benutzer POST `/api/ingredients/brot/portions/` mit Name, Quantity und MeasuringUnit absendet
- THEN wird eine Portion erstellt und mit der Zutat verknuepft

#### Scenario: Naehrwert-Skalierung pro Portion

- GIVEN eine Portion mit `weight_g = 30` und eine Zutat mit `protein_g = 10.0` (pro 100g)
- WHEN die Naehrwerte der Portion berechnet werden
- THEN ist `portion.protein_g = 10.0 x 30 / 100 = 3.0`

#### Scenario: Preis-Skalierung pro Portion

- GIVEN eine Portion mit `weight_g = 30` und eine Zutat mit `price_per_kg = 4.98`
- WHEN der Preis der Portion berechnet wird
- THEN ist `portion.price_eur = 4.98 x 0.030 = 0.15`

### Requirement: MeasuringUnit-Katalog

Das System SHALL einen Katalog von Messeinheiten bereitstellen.

#### Scenario: MeasuringUnit-Felder

- GIVEN ein MeasuringUnit-Datensatz
- THEN hat er die Felder:
  - `name` (CharField, z.B. "Gramm", "Milliliter", "Scheibe", "Essloeffel")
  - `description` (CharField)
  - `quantity` (FloatField — Gewicht in Basiseinheit, z.B. 1 Scheibe = 30g)
  - `unit` (TextChoices: `g` fuer Gramm, `ml` fuer Milliliter)

#### Scenario: MeasuringUnits abrufen

- GIVEN MeasuringUnit-Datensaetze im System
- WHEN ein Benutzer GET `/api/measuring-units/` aufruft
- THEN werden alle Messeinheiten zurueckgegeben

### Requirement: Price-Verwaltung und Preiskaskade

Das System MUST Preise pro Packung verwalten und Preisaenderungen automatisch durch die gesamte Kette propagieren.

#### Scenario: Price-Felder

- GIVEN ein Price-Datensatz
- THEN hat er die Felder:
  - `price_eur` (DecimalField — Packungspreis)
  - `quantity` (IntegerField — Anzahl Portionen pro Packung)
  - `name` (CharField, z.B. "500g Packung")
  - `retailer` (CharField, z.B. "Aldi", "Rewe")
  - `quality` (CharField, z.B. "Bio", "Standard")
  - `portion` (FK zu Portion)

#### Scenario: Preis hinzufuegen

- GIVEN eine bestehende Portion einer Zutat
- WHEN der Benutzer POST `/api/ingredients/{slug}/portions/{id}/prices/` mit Preis, Menge und Haendler absendet
- THEN wird ein Price erstellt und mit der Portion verknuepft
- AND die Preiskaskade wird ausgeloest

#### Scenario: Preiskaskade (automatische Propagierung)

- GIVEN ein Price wird erstellt oder aktualisiert
- WHEN das `post_save` Signal ausgeloest wird
- THEN wird die Preiskaskade durchlaufen:
  1. `price_per_kg = price_eur / (weight_g x quantity) x 1000` (auf dem Price berechnet)
  2. `Ingredient.price_per_kg` wird auf den guenstigsten `price_per_kg` aller Preise aktualisiert
  3. Alle `Portion.price_eur` der Zutat werden neu berechnet: `price_per_kg x weight_g / 1000`
  4. Alle `RecipeItem`-Preise mit dieser Zutat werden aktualisiert: `quantity x portion.price_eur`
  5. Alle Rezept-Gesamtpreise (Summe aller RecipeItems) werden aktualisiert

#### Scenario: Preiskaskade Gesamtbeispiel

- GIVEN ein Price mit `price_eur = 2.49` fuer eine Packung mit `quantity = 1` und Portion mit `weight_g = 500`
- THEN propagiert die Kaskade:
  - `price_per_kg = 2.49 / 0.5 = 4.98 EUR/kg`
  - `Ingredient.price_per_kg = 4.98 EUR/kg`
  - Portion "1 Scheibe" (30g): `price_eur = 4.98 x 0.030 = 0.15 EUR`
  - RecipeItem (3 Scheiben): `price_eur = 0.15 x 3 = 0.45 EUR`
  - Recipe: Summe aller RecipeItems
  - Meal: Summe aller MealItems
  - MealDay: Summe aller Meals
  - MealPlan: Summe aller MealDays

### Requirement: RetailSection-Verwaltung

Das System SHALL Supermarkt-Abteilungen fuer Einkaufslisten-Gruppierung bereitstellen.

#### Scenario: RetailSection-Felder

- GIVEN ein RetailSection-Datensatz
- THEN hat er die Felder:
  - `name` (CharField, z.B. "Obst & Gemuese", "Kuehlregal", "Gewuerze")
  - `description` (CharField)
  - `rank` (IntegerField, Sortierung)

#### Scenario: RetailSections abrufen

- GIVEN RetailSection-Datensaetze im System
- WHEN ein Benutzer GET `/api/retail-sections/` aufruft
- THEN werden alle Abteilungen sortiert nach `rank` zurueckgegeben

### Requirement: NutritionalTag-Verwaltung

Das System SHALL Allergen- und Unvertraeglichkeits-Tags bereitstellen.

#### Scenario: NutritionalTag-Felder

- GIVEN ein NutritionalTag-Datensatz
- THEN hat er die Felder:
  - `name` (CharField, z.B. "Enthaelt Gluten")
  - `name_opposite` (CharField, z.B. "Glutenfrei")
  - `is_dangerous` (BooleanField — Allergiewarnung)
  - `rank` (IntegerField, Sortierung)

#### Scenario: NutritionalTags abrufen

- GIVEN NutritionalTag-Datensaetze im System
- WHEN ein Benutzer GET `/api/nutritional-tags/` aufruft
- THEN werden alle Tags sortiert nach `rank, name` zurueckgegeben

### Requirement: IngredientAlias (alternative Namen)

Das System SHALL alternative Suchbegriffe fuer Zutaten unterstuetzen.

#### Scenario: IngredientAlias-Felder

- GIVEN ein IngredientAlias-Datensatz
- THEN hat er die Felder:
  - `name` (CharField, z.B. "Erdapfel" als Alias fuer "Kartoffel")
  - `rank` (IntegerField)
  - `ingredient` (FK zu Ingredient)
  - `created_by` (FK zu User)

#### Scenario: Alias hinzufuegen

- GIVEN eine bestehende Zutat
- WHEN der Benutzer POST `/api/ingredients/{slug}/aliases/` mit Name absendet
- THEN wird ein Alias erstellt
- AND die Zutat ist unter diesem Alternativnamen suchbar

### Requirement: Nutri-Score-Berechnung

Das System MUST den Nutri-Score automatisch fuer Zutaten und Rezepte nach dem offiziellen franzoesischen Algorithmus berechnen.

#### Scenario: Nutri-Score Berechnungsschritte

- GIVEN eine Zutat mit vollstaendigen Naehrwerten
- WHEN der Nutri-Score berechnet wird
- THEN werden folgende Schritte durchlaufen:
  1. **Negative Punkte** (hoeher = schlechter): Punkte fuer `energy_kj` + `sugar_g` + `fat_sat_g` + `sodium_mg`
  2. **Positive Punkte** (hoeher = besser): Punkte fuer `fibre_g` + `protein_g` + `fruit_factor`
  3. **Gesamtpunkte** = Negative - Positive
  4. **Klasse** = Gesamtpunkte auf Skala A (1) bis E (5) abbilden

#### Scenario: Nutri-Score Viskositaets-Unterscheidung

- GIVEN eine Zutat mit `physical_viscosity = solid`
- WHEN der Nutri-Score berechnet wird
- THEN werden die Solid-Schwellwert-Tabellen verwendet
- AND bei `physical_viscosity = beverage` werden die Beverage-Schwellwert-Tabellen verwendet

#### Scenario: Nutri-Score Lookup-Tabellen

- GIVEN die Nutri-Score Berechnung
- THEN definieren Lookup-Tabellen Schwellwerte pro Naehrstoff
- AND jeder Naehrstoffwert wird anhand der Tabelle in Punkte (0-10 fuer negative, 0-5 fuer positive) umgewandelt
- AND die Tabellen unterscheiden sich fuer Solid vs. Beverage

#### Scenario: Nutri-Score bei Naehrwertaenderung aktualisieren

- GIVEN eine Zutat deren Naehrwerte geaendert werden
- WHEN die Zutat gespeichert wird
- THEN wird `nutri_score` (Gesamtpunkte) und `nutri_class` (1-5) automatisch neu berechnet

#### Scenario: Rezept-Nutri-Score aggregieren

- GIVEN ein Rezept mit mehreren RecipeItems
- WHEN der Rezept-Nutri-Score berechnet wird
- THEN werden die Naehrwerte aller RecipeItems gewichtet aggregiert (pro 100g Gesamtrezept)
- AND der Nutri-Score wird auf den aggregierten Werten berechnet

### Requirement: Norm-Personen-Berechnung (Mifflin-St Jeor)

Das System SHALL automatische Portionsskalierung basierend auf Gruppenstruktur ueber die Mifflin-St Jeor Gleichung berechnen.

#### Scenario: BMR-Berechnung (Grundumsatz)

- GIVEN Personendaten: Gewicht (kg), Groesse (cm), Alter (Jahre), Geschlecht
- WHEN der BMR berechnet wird
- THEN gilt: `BMR = 10 x weight + 6.25 x height - 5 x age + s`
- AND `s = +5` fuer maennlich, `s = -161` fuer weiblich

#### Scenario: TDEE-Berechnung (Tagesenergiebedarf)

- GIVEN ein BMR-Wert und ein PAL-Faktor (Physical Activity Level)
- WHEN der TDEE berechnet wird
- THEN gilt: `TDEE = BMR x PAL`
- AND typische PAL-Werte: 1.2 (sitzend), 1.5 (moderat), 1.75 (aktiv), 2.0 (sehr aktiv)

#### Scenario: Norm-Person-Referenz

- GIVEN die Norm-Person-Definition
- THEN ist die Referenz: 15-jaehriger Junge mit PAL 1.5
- AND der Norm-Faktor einer Person berechnet sich als: `TDEE(Person) / TDEE(Norm-Person)`

#### Scenario: Portionsskalierung fuer Gruppe

- GIVEN ein Rezept fuer 4 Norm-Personen und eine Gruppe mit 10 Teilnehmern verschiedenen Alters
- WHEN die Portionen skaliert werden
- THEN wird fuer jeden Teilnehmer der Norm-Faktor berechnet
- AND die Gesamtmenge wird basierend auf der Summe aller Norm-Faktoren skaliert

#### Scenario: Gewichts-/Groessen-Referenztabellen

- GIVEN die Norm-Personen-Berechnung
- THEN existieren Referenztabellen mit Durchschnittsgewicht und -groesse nach Alter (0-99 Jahre) und Geschlecht
- AND diese Tabellen werden verwendet wenn keine individuellen Daten vorliegen

### Requirement: RecipeItem (Rezept-Zutaten-Verknuepfung)

Das System SHALL die Verknuepfung von Rezepten mit Zutaten ueber RecipeItems unterstuetzen.

#### Scenario: RecipeItem-Felder

- GIVEN ein RecipeItem-Datensatz
- THEN hat er die Felder:
  - `quantity` (FloatField — Menge)
  - `portion` (FK zu Portion — enthaelt Zutat + Messeinheit + Gewicht)
  - `ingredient` (FK zu Ingredient — Direktreferenz fuer einfachen Zugriff)
  - `recipe` (FK zu Idea mit `idea_type=recipe`)
  - `sort_order` (IntegerField)
  - `note` (CharField, optional)
  - `quantity_type` (TextChoices: `once`, `per_person`)

#### Scenario: RecipeItem Naehrwert-Berechnung

- GIVEN ein RecipeItem mit `quantity = 3`, Portion mit `weight_g = 30`, Ingredient mit `protein_g = 10.0`
- WHEN die Naehrwerte berechnet werden
- THEN ist `protein_g = 3 x 30 x 10.0 / 100 = 9.0`

#### Scenario: RecipeItem Preis-Berechnung

- GIVEN ein RecipeItem mit `quantity = 3`, Portion mit `price_eur = 0.15`
- WHEN der Preis berechnet wird
- THEN ist `price_eur = 3 x 0.15 = 0.45`

### Requirement: Rezept-Checks und Verbesserungsvorschlaege

Das System SHALL regelbasierte Verbesserungsvorschlaege fuer Rezepte ueber konfigurierbare `RecipeHint`-Regeln bereitstellen.

#### Scenario: RecipeHint-Felder

- GIVEN ein RecipeHint-Datensatz
- THEN hat er die Felder:
  - `name` (CharField), `description` (TextField)
  - `parameter` (TextChoices: einer von 12 Naehrwertfeldern — energy_kj, sugar_g, sodium_mg, fibre_g, fat_g, fat_sat_g, protein_g, carbohydrate_g, salt_g, fructose_g, lactose_g, fruit_factor)
  - `min_value` (FloatField), `max_value` (FloatField)
  - `min_max` (TextChoices: `min`, `max`, `range`)
  - `hint_level` (TextChoices: `info`, `warning`, `error`)
  - `recipe_type` (TextChoices: Fruehstueck, Warme Mahlzeit, Kalte Mahlzeit, Dessert, Snack, etc.)
  - `recipe_objective` (TextChoices: `health`, `taste`, `cost`, `fulfillment`)

#### Scenario: Rezept-Hints abrufen

- GIVEN ein Rezept mit aggregierten Naehrwerten
- WHEN ein Benutzer GET `/api/ideas/{id}/recipe-hints/?recipe_objective=health` aufruft
- THEN werden alle RecipeHint-Regeln gegen die Naehrwerte abgeglichen
- AND ueberschrittene oder unterschrittene Schwellwerte werden als Hints zurueckgegeben
- AND Beispiel: "Natriumgehalt zu hoch fuer ein Kinderrezept" (wenn sodium_mg > 600)

#### Scenario: Rezept-Bewertungen (4 Dimensionen)

- GIVEN ein Rezept mit vollstaendigen Naehrwert- und Preisdaten
- WHEN ein Benutzer GET `/api/ideas/{id}/recipe-checks/` aufruft
- THEN werden 4 Bewertungsdimensionen zurueckgegeben, jeweils mit `{label, value, color, score}`:
  1. **Saettigung**: Energiegehalt vs. Zielwert
  2. **Preis**: Kostenschaetzung (guenstig/mittel/teuer)
  3. **Gesundheit**: Basierend auf Nutri-Score, identifiziert ungesuendeste Zutaten
  4. **Geschmack**: Platzhalter fuer zukuenftige Bewertungslogik

#### Scenario: Nutri-Score Details abrufen

- GIVEN ein Rezept mit Zutaten
- WHEN ein Benutzer GET `/api/ideas/{id}/nutri-score/` aufruft
- THEN werden die detaillierten Nutri-Score-Punkte zurueckgegeben (negative Punkte, positive Punkte, Gesamtpunkte, Klasse)

### Requirement: Einkaufsliste

Das System SHALL automatisch generierte Einkaufslisten aus MealPlan-Daten bereitstellen.

#### Scenario: Einkaufsliste generieren

- GIVEN ein MealPlan mit mehreren Tagen und Mahlzeiten mit zugeordneten Rezepten
- WHEN ein Benutzer GET `/api/meal-plans/{id}/shopping-list/` aufruft
- THEN werden alle Zutaten aller Rezepte aller Mahlzeiten aggregiert
- AND gleiche Zutaten werden zusammengefasst (Mengen addiert)
- AND die Liste wird nach RetailSection (Supermarkt-Abteilung) gruppiert
- AND pro Eintrag werden Name, Gesamtmenge, Einheit und geschaetzter Preis angezeigt

### Requirement: API-Endpunkte (Zutatendatenbank)

Das System MUST folgende REST-Endpunkte bereitstellen.

#### Scenario: Ingredient-CRUD-Endpunkte

- GIVEN die Zutatendatenbank-API
- THEN sind folgende Endpunkte verfuegbar:
  - `GET /api/ingredients/` — Liste (paginiert, filterbar nach name, retail_section, status)
  - `GET /api/ingredients/{slug}/` — Detail mit Portionen, Preisen, Naehrwerten
  - `POST /api/ingredients/` — Erstellen (auth)
  - `PATCH /api/ingredients/{slug}/` — Aktualisieren (auth)
  - `DELETE /api/ingredients/{slug}/` — Loeschen (auth)

#### Scenario: Portion-Endpunkte

- GIVEN die Portionen-API
- THEN sind folgende Endpunkte verfuegbar:
  - `GET /api/ingredients/{slug}/portions/` — Portionen einer Zutat
  - `POST /api/ingredients/{slug}/portions/` — Portion hinzufuegen
  - `PATCH /api/ingredients/{slug}/portions/{id}/` — Portion aktualisieren
  - `DELETE /api/ingredients/{slug}/portions/{id}/` — Portion loeschen

#### Scenario: Price-Endpunkte

- GIVEN die Preis-API
- THEN sind folgende Endpunkte verfuegbar:
  - `POST /api/ingredients/{slug}/portions/{id}/prices/` — Preis hinzufuegen
  - `PATCH /api/ingredients/{slug}/prices/{id}/` — Preis aktualisieren
  - `DELETE /api/ingredients/{slug}/prices/{id}/` — Preis loeschen

#### Scenario: Alias-Endpunkte

- GIVEN die Alias-API
- THEN sind folgende Endpunkte verfuegbar:
  - `POST /api/ingredients/{slug}/aliases/` — Alias hinzufuegen
  - `DELETE /api/ingredients/{slug}/aliases/{id}/` — Alias loeschen

#### Scenario: Stammdaten-Endpunkte

- GIVEN die Stammdaten-API
- THEN sind folgende Endpunkte verfuegbar:
  - `GET /api/retail-sections/` — Alle Supermarkt-Abteilungen
  - `GET /api/nutritional-tags/` — Alle Allergen-/Unvertraeglichkeits-Tags
  - `GET /api/measuring-units/` — Alle Messeinheiten

#### Scenario: Rezept-Analyse-Endpunkte

- GIVEN die Rezept-Analyse-API
- THEN sind folgende Endpunkte verfuegbar:
  - `GET /api/ideas/{id}/recipe-checks/` — Rezept-Bewertungen (Saettigung, Preis, Gesundheit)
  - `GET /api/ideas/{id}/recipe-hints/` — Verbesserungsvorschlaege basierend auf RecipeHint-Regeln
  - `GET /api/ideas/{id}/nutri-score/` — Nutri-Score Details

### Requirement: KI-Autovervollstaendigung fuer Zutaten

Das System SHALL KI-gestuetzte Vorschlaege beim Anlegen und Bearbeiten von Zutaten ueber Google Gemini Flash bereitstellen. Details siehe `ai-features/spec.md`, Abschnitt "Ingredient AI Autocomplete".

### Requirement: Nutri-Score UI-Darstellung

Das Frontend MUST Nutri-Score-Werte mit folgenden Farbcodes darstellen:

#### Scenario: Nutri-Score Farbcodes

- GIVEN ein Nutri-Score wird im UI angezeigt
- THEN werden folgende Farbzuordnungen verwendet:
  - Klasse 1 (A): Dunkelgruen (`bg-green-600 text-white`)
  - Klasse 2 (B): Hellgruen (`bg-green-400 text-white`)
  - Klasse 3 (C): Gelb (`bg-yellow-400 text-black`)
  - Klasse 4 (D): Orange (`bg-orange-400 text-white`)
  - Klasse 5 (E): Rot (`bg-red-500 text-white`)

### Requirement: Zutat-Eingabe UI

Das Frontend SHALL folgende UI-Muster fuer die Zutat-Eingabe verwenden:

#### Scenario: Autocomplete-Suche bei RecipeItem-Erstellung

- GIVEN ein Benutzer erstellt ein RecipeItem
- WHEN der Benutzer eine Zutat sucht
- THEN wird eine Autocomplete-Suche angeboten
- AND nach Auswahl der Zutat wird eine Portion gewaehlt
- AND danach wird die Menge eingegeben

#### Scenario: KI-Assistent Sidebar

- GIVEN ein Benutzer bearbeitet eine Zutat
- WHEN der KI-Assistent aktiv ist
- THEN wird eine Sidebar mit "Autofill"-Button pro Schritt angezeigt
- AND Vorschlaege werden in Formular-Felder uebernommen (nicht automatisch gespeichert)

#### Scenario: Allergen-Badges

- GIVEN eine Zutat mit NutritionalTags
- WHEN die Zutat angezeigt wird
- THEN werden farbige kleine Tags angezeigt
- AND `is_dangerous = true` Tags werden rot dargestellt
- AND informative Tags werden grau dargestellt

### Requirement: Preis-Darstellung

Das Frontend SHALL Preise einheitlich mit 2 Dezimalstellen und EUR-Zeichen anzeigen.

#### Scenario: Preis-Format

- GIVEN ein Preis wird im UI angezeigt
- THEN wird er im Format "X,XX EUR" dargestellt
- AND Naehrwerte werden sowohl pro 100g als auch pro Portion angezeigt

### Requirement: Einkaufsliste UI

Das Frontend SHALL die Einkaufsliste nach Supermarkt-Abteilung gruppiert darstellen.

#### Scenario: Einkaufslisten-Gruppierung

- GIVEN eine generierte Einkaufsliste
- WHEN die Liste angezeigt wird
- THEN sind die Eintraege nach RetailSection gruppiert
- AND jeder Eintrag zeigt Zutatname, Gesamtmenge, Einheit und geschaetzten Preis

## Planned Features

### Planned: Barcode-Scanner

- Geplant: EAN-Barcode scannen und automatisch Zutatendaten aus externen Datenbanken (OpenFoodFacts, USDA) laden.

### Planned: Zutat-Import aus externen Quellen

- Geplant: Import von Naehrwertdaten aus USDA FoodData Central (ueber `fdc_id`) und OpenFoodFacts (ueber `ean`).
