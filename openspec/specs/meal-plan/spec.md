# meal-plan Specification

## Purpose

Essensplan-Tool fuer Pfadfinder-Veranstaltungen und den Gruppenalltag. Ermoeglicht das Planen mehrerer Tage mit Mahlzeiten, wobei pro Mahlzeit mehrere Rezepte (Ideas vom Typ `recipe`) zugewiesen werden koennen. Ein Essensplan kann an ein Event gebunden sein ODER freistehend existieren. Enthaelt Portionsskalierung (Norm-Personen), Naehrwert-Zusammenfassung und Einkaufslisten-Generierung.

## Context

- **Django App**: `planner` (bestehend, wird erweitert)
- **API**: `/api/meal-plans/`
- **Frontend-Routen**: `/meal-plans` (Landing-Page), `/meal-plans/app` (Liste), `/meal-plans/:id` (Detail)
- **Datenstruktur**: MealPlan -> MealDay -> Meal -> MealItem -> Rezept (Idea vom Typ `recipe`)
- **Beziehung zu Events**: Optional, ein MealPlan MAY an ein Event gebunden sein
- **Beziehung zu Zutatendatenbank**: Rezepte verweisen ueber RecipeItems auf Ingredients (siehe `ingredient-database/spec.md`)

## Data Model

### Modell-Hierarchie

```
MealPlan (Name, Norm-Portionen, Aktivitaetsfaktor)
  +-- MealDay[] (Datum)
       +-- Meal[] (Mahlzeittyp, Tagesanteil)
            +-- MealItem[] (Skalierungsfaktor)
                 +-- recipe FK -> Idea (idea_type=recipe)
                      +-- RecipeItem[] -> Ingredient -> Portion -> Price
```

## Requirements

### Requirement: MealPlan-Datenmodell

Das System MUST folgende Model-Felder fuer den Essensplan fuehren.

#### Scenario: MealPlan-Felder

- GIVEN ein MealPlan-Datensatz
- THEN hat er folgende Felder:
  - `name` (CharField) — Name des Essensplans
  - `slug` (SlugField, unique) — URL-sicherer Slug
  - `description` (TextField, optional) — Beschreibung
  - `norm_portions` (IntegerField) — Anzahl Norm-Personen/Portionen
  - `activity_factor` (FloatField, default 1.5) — PAL-Wert fuer Portionsskalierung
  - `reserve_factor` (FloatField, default 1.1) — Reservefaktor (10% mehr kochen)
  - `event` (FK zu Event, nullable) — Optionale Event-Zuordnung
  - `created_by` (FK zu User) — Ersteller
- AND berechnete Felder (aggregiert): `total_price_eur`, `total_energy_kj`

#### Scenario: MealDay-Felder

- GIVEN ein MealDay-Datensatz
- THEN hat er folgende Felder:
  - `date` (DateField) — Datum des Tages
  - `meal_plan` (FK zu MealPlan) — Zugehoerig zum Essensplan

#### Scenario: Meal-Felder

- GIVEN ein Meal-Datensatz
- THEN hat er folgende Felder:
  - `meal_type` (TextChoices: `breakfast`, `lunch`, `dinner`, `snack`, `dessert`) — Mahlzeittyp
  - `time_start` (TimeField, optional) — Startzeit
  - `time_end` (TimeField, optional) — Endzeit
  - `day_part_factor` (FloatField) — Anteil am Tagesbedarf (z.B. Fruehstueck=0.25, Mittag=0.35, Abend=0.30, Snack=0.10)
  - `meal_day` (FK zu MealDay) — Zugehoerig zum Tag

#### Scenario: MealItem-Felder

- GIVEN ein MealItem-Datensatz
- THEN hat er folgende Felder:
  - `factor` (FloatField, default 1.0) — Skalierungsfaktor fuer das Rezept
  - `recipe` (FK zu Idea mit `idea_type=recipe`) — Das zugeordnete Rezept
  - `meal` (FK zu Meal) — Zugehoerig zur Mahlzeit

### Requirement: Essensplan CRUD

Das System MUST vollstaendige CRUD-Operationen fuer Essensplaene ueber `/api/meal-plans/` bereitstellen.

#### Scenario: Freistehenden Essensplan erstellen

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer POST `/api/meal-plans/` mit Titel, Startdatum und Anzahl Tage absendet
- THEN wird ein MealPlan ohne Event-Zuordnung erstellt
- AND fuer jeden Tag wird ein MealDay mit Standard-Mahlzeiten (Fruehstueck, Mittag, Abend) erstellt

#### Scenario: Event-gebundenen Essensplan erstellen

- GIVEN ein authentifizierter Benutzer und ein bestehendes Event
- WHEN der Benutzer POST `/api/meal-plans/` mit Titel und event_id absendet
- THEN wird ein MealPlan erstellt und mit dem Event verknuepft
- AND die Tage werden basierend auf dem Event-Zeitraum (start_date bis end_date) generiert

#### Scenario: Essensplan abrufen

- GIVEN ein bestehender MealPlan
- WHEN ein Benutzer GET `/api/meal-plans/{id}` aufruft
- THEN werden der MealPlan mit allen Tagen, Mahlzeiten und zugeordneten Rezepten zurueckgegeben
- AND pro Rezept werden Naehrwerte und Preise mitgeliefert

#### Scenario: Essensplan aktualisieren

- GIVEN der MealPlan-Owner
- WHEN der Owner PATCH `/api/meal-plans/{id}` mit partiellen Daten absendet
- THEN wird der MealPlan aktualisiert
- AND bei Aenderung von `norm_portions` oder `activity_factor` werden alle Portionen neu skaliert

#### Scenario: Essensplan loeschen

- GIVEN der MealPlan-Owner
- WHEN der Owner DELETE `/api/meal-plans/{id}` aufruft
- THEN werden der MealPlan und alle zugehoerigen Tage und Mahlzeiten entfernt

### Requirement: Tage-Verwaltung (MealDay)

Das System SHALL Tage innerhalb eines Essensplans unterstuetzen.

#### Scenario: Tag hinzufuegen

- GIVEN ein bestehender Essensplan
- WHEN der Owner POST `/api/meal-plans/{id}/days/` mit Datum absendet
- THEN wird ein MealDay erstellt mit Standard-Mahlzeiten-Slots (Fruehstueck, Mittag, Abend)

#### Scenario: Tag entfernen

- GIVEN ein bestehender MealDay
- WHEN der Owner DELETE `/api/meal-plans/{id}/days/{day_id}/` aufruft
- THEN werden der Tag und alle zugehoerigen Mahlzeiten und MealItems entfernt

### Requirement: Mahlzeiten-Verwaltung (Meal)

Das System SHALL Mahlzeiten innerhalb eines Tages mit Rezept-Zuordnung unterstuetzen.

#### Scenario: Standard-Mahlzeiten-Typen

- GIVEN ein MealDay wird erstellt
- WHEN der Tag initialisiert wird
- THEN stehen folgende Mahlzeiten-Typen zur Verfuegung: Fruehstueck, Mittagessen, Abendessen, Snack, Dessert

#### Scenario: Mahlzeit hinzufuegen

- GIVEN ein MealDay
- WHEN der Owner POST `/api/meal-plans/{id}/days/{day_id}/meals/` mit Mahlzeittyp absendet
- THEN wird eine neue Meal-Entitaet erstellt

#### Scenario: Mahlzeit loeschen

- GIVEN eine Mahlzeit
- WHEN der Owner DELETE `/api/meal-plans/{id}/meals/{meal_id}/` aufruft
- THEN wird die Mahlzeit und alle zugeordneten MealItems entfernt

#### Scenario: Rezept zu Mahlzeit hinzufuegen

- GIVEN eine Mahlzeit innerhalb eines Tages
- WHEN der Owner POST `/api/meal-plans/{id}/meals/{meal_id}/items/` mit Rezept-ID und optionalem Skalierungsfaktor absendet
- THEN wird ein MealItem erstellt und das Rezept der Mahlzeit zugeordnet
- AND es koennen mehrere Rezepte pro Mahlzeit zugewiesen werden

#### Scenario: Rezept von Mahlzeit entfernen

- GIVEN eine Mahlzeit mit zugeordneten Rezepten
- WHEN der Owner DELETE `/api/meal-plans/{id}/meal-items/{item_id}/` aufruft
- THEN wird das MealItem geloescht, das Rezept (Idea) bleibt bestehen

### Requirement: Rezept-Suche und -Zuordnung

Das System SHALL die einfache Suche und Zuordnung von Rezepten ermoeglichen.

#### Scenario: Rezept suchen fuer Mahlzeit

- GIVEN eine Mahlzeit, der ein Rezept zugewiesen werden soll
- WHEN der Owner nach einem Rezept sucht
- THEN werden nur Ideas vom Typ `recipe` in den Suchergebnissen angezeigt
- AND der Owner kann ein Rezept per Klick zuordnen

### Requirement: Portionsskalierung

Das System SHALL die automatische Portionsskalierung basierend auf Norm-Personen unterstuetzen (siehe `ingredient-database/spec.md` fuer Mifflin-St Jeor Algorithmus).

#### Scenario: Norm-Portionen-basierte Skalierung

- GIVEN ein MealPlan mit `norm_portions = 10` und `activity_factor = 1.5`
- WHEN die Portionen berechnet werden
- THEN werden alle Rezeptmengen mit `norm_portions x activity_factor x reserve_factor` skaliert

#### Scenario: Teilnehmer-basierte Mengenberechnung (Event-gebunden)

- GIVEN ein Event-gebundener Essensplan und registrierte Teilnehmer mit Altersangaben
- WHEN der Essensplan angezeigt wird
- THEN MAY die `norm_portions` basierend auf den Norm-Faktoren der Teilnehmer berechnet werden

### Requirement: Naehrwert-Zusammenfassung

Das System SHALL aggregierte Naehrwerte pro Mahlzeit, Tag und Gesamtplan bereitstellen.

#### Scenario: Naehrwert-Uebersicht abrufen

- GIVEN ein Essensplan mit zugeordneten Rezepten, die Naehrwertdaten haben
- WHEN ein Benutzer GET `/api/meal-plans/{id}/nutrition-summary/` aufruft
- THEN werden die aggregierten Naehrwerte zurueckgegeben:
  - Pro Mahlzeit: Summe aller MealItems (gewichtet mit factor)
  - Pro Tag: Summe aller Meals
  - Gesamt: Summe aller Tage
- AND die Naehrwerte beinhalten mindestens: energy_kj, protein_g, fat_g, carbohydrate_g, sugar_g, fibre_g, salt_g

### Requirement: Einkaufsliste

Das System SHALL automatisch generierte Einkaufslisten bereitstellen (Details zur Generierung siehe `ingredient-database/spec.md`).

#### Scenario: Einkaufsliste abrufen

- GIVEN ein MealPlan mit zugeordneten Rezepten
- WHEN ein Benutzer GET `/api/meal-plans/{id}/shopping-list/` aufruft
- THEN werden alle Zutaten aggregiert, nach RetailSection gruppiert und mit Preisen zurueckgegeben

### Requirement: Event-Integration

Das System MAY eine Integration mit dem Event-Modul unterstuetzen.

#### Scenario: Essensplan im Event anzeigen

- GIVEN ein Event mit zugeordnetem MealPlan
- WHEN ein Benutzer die Event-Detailseite aufruft
- THEN wird der zugehoerige Essensplan angezeigt oder verlinkt

### Requirement: API-Endpunkte (MealPlan)

Das System MUST folgende REST-Endpunkte bereitstellen.

#### Scenario: MealPlan-Endpunkte

- GIVEN die MealPlan-API
- THEN sind folgende Endpunkte verfuegbar:
  - `GET /api/meal-plans/` — Eigene Essensplaene (paginiert)
  - `POST /api/meal-plans/` — Erstellen (optional mit event_id)
  - `GET /api/meal-plans/{id}/` — Detail inkl. Tage, Mahlzeiten, Rezepte
  - `PATCH /api/meal-plans/{id}/` — Aktualisieren
  - `DELETE /api/meal-plans/{id}/` — Loeschen
  - `POST /api/meal-plans/{id}/days/` — Tag hinzufuegen
  - `DELETE /api/meal-plans/{id}/days/{day_id}/` — Tag loeschen
  - `POST /api/meal-plans/{id}/days/{day_id}/meals/` — Mahlzeit hinzufuegen
  - `DELETE /api/meal-plans/{id}/meals/{meal_id}/` — Mahlzeit loeschen
  - `POST /api/meal-plans/{id}/meals/{meal_id}/items/` — Rezept zu Mahlzeit hinzufuegen
  - `DELETE /api/meal-plans/{id}/meal-items/{item_id}/` — Rezept aus Mahlzeit entfernen
  - `GET /api/meal-plans/{id}/shopping-list/` — Einkaufsliste (aggregiert, nach Abteilung)
  - `GET /api/meal-plans/{id}/nutrition-summary/` — Naehrwert-Zusammenfassung

### Requirement: Essensplan UI (Mobile-First)

Das Frontend SHALL das Essensplan-Layout Mobile-First gestalten.

#### Scenario: Mobile Layout

- GIVEN ein MealPlan wird auf einem Smartphone angezeigt
- THEN werden die Tage vertikal gestapelt
- AND pro Tag werden die Mahlzeiten horizontal scrollbar dargestellt

#### Scenario: Desktop Layout

- GIVEN ein MealPlan wird auf einem Desktop angezeigt
- THEN wird ein Grid-Layout verwendet (Tage als Spalten, Mahlzeiten als Zeilen)

#### Scenario: Mahlzeit-Karten

- GIVEN eine Mahlzeit mit zugeordneten Rezepten
- THEN zeigt jede Mahlzeit-Karte:
  - Rezept-Name
  - Bild-Thumbnail
  - Nutri-Score Badge (Farbcodes siehe `ingredient-database/spec.md`)
  - Preis

#### Scenario: Drag & Drop (Optional)

- GIVEN ein Desktop-Benutzer
- THEN MAY Drag & Drop fuer die Rezept-Zuordnung zu Mahlzeiten unterstuetzt werden
