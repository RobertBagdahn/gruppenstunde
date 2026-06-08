# data-quality-score Specification

## Purpose
Defines the 0-100 data quality completeness score for ingredients and recipes, visible to all users on detail pages, and the impact analysis showing how many recipes reference an ingredient.

## ADDED Requirements

### Requirement: Ingredient quality score
Jede Zutat SHALL einen `quality_score` (IntegerField, 0-100, nullable, default NULL) haben, der den Vollständigkeitsgrad der Datenfelder repräsentiert.

#### Scenario: Score-Berechnung für Zutat
- **WHEN** eine Zutat gespeichert wird
- **THEN** SHALL der `quality_score` aus folgenden gewichteten Kategorien berechnet werden:
  - Nährwerte (40%): Anteil der gefüllten Felder aus {energy_kcal, protein_g, fat_g, fat_sat_g, carbohydrate_g, sugar_g, fibre_g, salt_g, sodium_mg, fructose_g, lactose_g, vitamin_c_mg}
  - Preis (15%): 100 wenn `price_per_kg` gesetzt, 0 wenn NULL
  - Physische Daten (15%): Anteil aus {physical_density != 1 (Default), physical_viscosity gesetzt, storage_type gesetzt, durability_in_days gesetzt, cooking_factor != 1 (Default)}
  - Klassifikation (15%): Anteil aus {retail_section gesetzt, nutritional_tags nicht leer}
  - Pfadfinder-Felder (10%): Anteil aus {camp_suitable=true, season_start + season_end gesetzt, preparation_time_min gesetzt}
  - Portionen (5%): 100 wenn mindestens eine Portion existiert, 0 sonst
- **THEN** SHALL `quality_score_updated_at` auf `now()` gesetzt werden

#### Scenario: Score ist nullable
- **WHEN** eine Zutat noch nie gescored wurde (z.B. vor Einführung des Features)
- **THEN** SHALL `quality_score` NULL sein
- **THEN** SHALL `quality_score_updated_at` NULL sein

#### Scenario: Score in API-Response
- **WHEN** `GET /api/ingredients/{slug}/` aufgerufen wird
- **THEN** SHALL die Response `quality_score` (integer|null) und `quality_score_updated_at` (datetime|null) enthalten

### Requirement: Recipe quality score
Jedes Rezept SHALL einen `quality_score` (IntegerField, 0-100, nullable, default NULL) haben.

#### Scenario: Score-Berechnung für Rezept
- **WHEN** ein Rezept gespeichert oder sein Cache aktualisiert wird
- **THEN** SHALL der `quality_score` aus folgenden gewichteten Kategorien berechnet werden:
  - Zutaten (30%): Anteil der RecipeItems, deren Portion auf eine Zutat mit nicht-leeren Nährwerten verweist
  - Metadaten (25%): Anteil aus {summary nicht leer, description nicht leer, image gesetzt, tags nicht leer}
  - Cache-Frische (20%): 100 wenn alle Zutaten-`updated_at` <= `cached_at`, sonst proportional
  - Nährwerte (15%): Anteil der gefüllten cached_* Felder
  - Preis (10%): 100 wenn `cached_price_total` gesetzt, 0 wenn NULL
- **THEN** SHALL `quality_score_updated_at` auf `now()` gesetzt werden

#### Scenario: Score in Recipe API-Response
- **WHEN** `GET /api/recipes/{id}/` aufgerufen wird
- **THEN** SHALL die Response `quality_score` (integer|null) und `quality_score_updated_at` (datetime|null) enthalten

### Requirement: Quality Score Badge in der UI
Der Qualitäts-Score SHALL auf den Zutaten- und Rezept-Detailseiten als farbiges Badge angezeigt werden.

#### Scenario: Score-Badge auf Zutatenseite
- **WHEN** ein Nutzer die Zutaten-Detailseite aufruft
- **THEN** SHALL der `quality_score` als Badge mit Ampelfarben angezeigt werden: grün (>=80), gelb (>=50), rot (<50)
- **THEN** SHALL bei NULL-Score "–" oder kein Badge angezeigt werden

#### Scenario: Score-Badge auf Rezeptseite
- **WHEN** ein Nutzer die Rezept-Detailseite aufruft
- **THEN** SHALL der `quality_score` als Badge mit Ampelfarben angezeigt werden

### Requirement: Impact-Analyse auf Zutatenseite
Die Zutaten-Detailseite SHALL anzeigen, in wie vielen Rezepten und Speiseplänen die Zutat verwendet wird.

#### Scenario: Impact-Anzeige
- **WHEN** ein Nutzer die Zutaten-Detailseite aufruft
- **THEN** SHALL die Anzahl der Rezepte angezeigt werden, die diese Zutat via RecipeItem referenzieren
- **THEN** SHALL die Anzahl der Speisepläne (MealPlans) angezeigt werden, die Rezepte mit dieser Zutat enthalten

#### Scenario: Zutat ohne Verwendung
- **WHEN** eine Zutat in keinem Rezept verwendet wird
- **THEN** SHALL "Wird in keinen Rezepten verwendet" angezeigt werden

#### Scenario: Impact als Link
- **WHEN** die Rezept-Anzahl > 0 ist
- **THEN** SHALL die Anzahl als klickbarer Link zu einer gefilterten Rezeptliste (`/recipes?ingredient_id=X`) führen
