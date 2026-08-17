# data-quality-dashboard Specification

## Purpose
Defines the staff-only data quality dashboard with ingredient and recipe quality categories, trend charts, and audit log access.

## ADDED Requirements

### Requirement: Staff-only Datenqualität Menüpunkt
Das food-frontend SHALL einen Menüpunkt "Datenqualität" in der Navigation anzeigen, der nur für authentifizierte Staff-User (`is_staff=true`) sichtbar und zugänglich ist.

#### Scenario: Staff-User sieht Menüpunkt
- **WHEN** ein authentifizierter User mit `is_staff=true` die Navigation öffnet
- **THEN** SHALL der Menüpunkt "Datenqualität" sichtbar sein
- **THEN** SHALL der Menüpunkt auf `/admin/data-quality` verlinken

#### Scenario: Nicht-Staff-User sieht keinen Menüpunkt
- **WHEN** ein authentifizierter User mit `is_staff=false` die Navigation öffnet
- **THEN** SHALL der Menüpunkt "Datenqualität" NICHT sichtbar sein

#### Scenario: Direkter URL-Zugriff durch Nicht-Staff
- **WHEN** ein User mit `is_staff=false` auf `/admin/data-quality` navigiert
- **THEN** SHALL der User auf `/recipes` weitergeleitet werden

### Requirement: Datenqualität Dashboard mit Kategorie-Auswahl
Das Datenqualität-Dashboard SHALL zwei Hauptbereiche bieten: "Zutaten" und "Rezepte". Jeder Bereich SHALL Unterkategorien als Tabs oder Accordions anzeigen.

#### Scenario: Zutaten-Kategorien
- **WHEN** Staff-User den Bereich "Zutaten" auswählt
- **THEN** SHALL folgende Kategorien verfügbar sein: Preisanalyse, Duplikaterkennung, Datenvollständigkeit, Nährwert-Plausibilität, Fehlende Klassifikation
- **THEN** SHALL die Preisanalyse als erstes Tab ausgewählt sein

#### Scenario: Rezepte-Kategorien
- **WHEN** Staff-User den Bereich "Rezepte" auswählt
- **THEN** SHALL folgende Kategorien verfügbar sein: Duplikaterkennung, Metadaten-Check, Cache-Staleness, Portions-Plausibilität
- **THEN** SHALL die Duplikaterkennung als erstes Tab ausgewählt sein

#### Scenario: Navigation zwischen Zutaten und Rezepten
- **WHEN** Staff-User zwischen "Zutaten" und "Rezepte" wechselt
- **THEN** SHALL die URL sich zu `/admin/data-quality/ingredients` bzw. `/admin/data-quality/recipes` ändern
- **THEN** SHALL der jeweils aktive Kategorie-Tab erhalten bleiben

### Requirement: Qualitätstrend-Chart
Das Dashboard SHALL einen Qualitätstrend-Chart anzeigen, der die Entwicklung des durchschnittlichen Qualitäts-Scores über die Zeit darstellt.

#### Scenario: Trend-Chart für Zutaten
- **WHEN** Staff-User die Zutaten-Übersicht aufruft
- **THEN** SHALL ein Liniendiagramm den durchschnittlichen `quality_score` der letzten 30 Tage anzeigen
- **THEN** SHALL der Chart Datenpunkte für jeden Tag enthalten, an dem sich mindestens ein Score geändert hat

#### Scenario: Trend-Chart für Rezepte
- **WHEN** Staff-User die Rezepte-Übersicht aufruft
- **THEN** SHALL ein Liniendiagramm den durchschnittlichen `quality_score` der letzten 30 Tage anzeigen

#### Scenario: Keine Daten für Trend
- **WHEN** keine Qualitäts-Score-Änderungen in den letzten 30 Tagen existieren
- **THEN** SHALL der Chart einen leeren Zustand mit Hinweis "Noch keine Daten" anzeigen

### Requirement: Datenvollständigkeit-Übersicht
Das Dashboard SHALL eine tabellarische Übersicht der Datenvollständigkeit aller Zutaten bzw. Rezepte bieten, sortierbar nach Score.

#### Scenario: Zutaten-Vollständigkeitstabelle
- **WHEN** Staff-User die Kategorie "Datenvollständigkeit" für Zutaten auswählt
- **THEN** SHALL eine paginierte Tabelle alle Zutaten mit `quality_score`, Namen, Status und den einzelnen Score-Komponenten (Nährwerte, Preis, Physische Daten, Klassifikation, Pfadfinder, Portionen) anzeigen
- **THEN** SHALL die Tabelle nach `quality_score` aufsteigend sortiert sein (schlechteste zuerst)
- **THEN** SHALL jede Zeile auf die Zutat-Detailseite verlinken

#### Scenario: Sortierung ändern
- **WHEN** Staff-User auf einen Spaltenkopf klickt
- **THEN** SHALL die Tabelle nach dieser Spalte sortieren (toggle asc/desc)

### Requirement: Fehlende Klassifikation
Das Dashboard SHALL Zutaten auflisten, denen wichtige Klassifikationsfelder fehlen.

#### Scenario: Zutaten ohne RetailSection
- **WHEN** Staff-User die Kategorie "Fehlende Klassifikation" auswählt
- **THEN** SHALL eine Liste aller Zutaten ohne `retail_section` angezeigt werden
- **THEN** SHALL jede Zutat einen "Bearbeiten"-Link zur Detailseite haben

#### Scenario: Zutaten ohne NutritionalTags
- **WHEN** Staff-User die Kategorie "Fehlende Klassifikation" auswählt
- **THEN** SHALL eine Liste aller Zutaten ohne `nutritional_tags` angezeigt werden

### Requirement: Nährwert-Plausibilität
Das Dashboard SHALL Zutaten mit potenziell unplausiblen Nährwerten anzeigen.

#### Scenario: Unplausible Makronährstoff-Summe
- **WHEN** eine Zutat eine Summe aus `protein_g + fat_g + carbohydrate_g` größer als 100g pro 100g hat
- **THEN** SHALL sie in der Nährwert-Plausibilitäts-Liste erscheinen
- **THEN** SHALL die Abweichung (z.B. "Summe: 127g/100g") angezeigt werden

#### Scenario: Extrem hohe Energiedichte
- **WHEN** eine Zutat `energy_kcal > 900` pro 100g hat
- **THEN** SHALL sie als Warnung in der Liste erscheinen (reines Fett = 900 kcal)

### Requirement: Metadaten-Check für Rezepte
Das Dashboard SHALL Rezepte mit fehlenden oder unvollständigen Metadaten auflisten.

#### Scenario: Rezepte ohne Bild
- **WHEN** Staff-User die Kategorie "Metadaten-Check" auswählt
- **THEN** SHALL eine Liste aller Rezepte ohne `image` angezeigt werden

#### Scenario: Rezepte ohne Tags
- **WHEN** Staff-User die Kategorie "Metadaten-Check" auswählt
- **THEN** SHALL eine Liste aller Rezepte ohne `tags` angezeigt werden

#### Scenario: Rezepte ohne Summary
- **WHEN** Staff-User die Kategorie "Metadaten-Check" auswählt
- **THEN** SHALL eine Liste aller Rezepte mit leerem `summary` angezeigt werden

### Requirement: Cache-Staleness für Rezepte
Das Dashboard SHALL Rezepte anzeigen, deren gecachte Nährwerte veraltet sind (Zutat wurde aktualisiert seit letztem Cache).

#### Scenario: Veralteter Cache erkannt
- **WHEN** eine Zutat eines Rezepts ein `updated_at` neuer als `cached_at` des Rezepts hat
- **THEN** SHALL das Rezept in der Cache-Staleness-Liste erscheinen
- **THEN** SHALL ein Button "Cache neu berechnen" pro Rezept verfügbar sein

#### Scenario: Cache neu berechnen
- **WHEN** Staff-User auf "Cache neu berechnen" klickt
- **THEN** SHALL `recalculate_recipe_cache` für dieses Rezept ausgeführt werden
- **THEN** SHALL das Rezept aus der Liste verschwinden (wenn erfolgreich)

### Requirement: Portions-Plausibilität für Rezepte
Das Dashboard SHALL Rezepte mit potenziell unplausiblen Portionsgrößen anzeigen.

#### Scenario: Zu wenig Gesamtgewicht
- **WHEN** ein Rezept ein `cached_weight_g < 100` (pro Portion) hat
- **THEN** SHALL es in der Portions-Plausibilitäts-Liste erscheinen

#### Scenario: Zu viel Gesamtgewicht
- **WHEN** ein Rezept ein `cached_weight_g > 2000` (pro Portion) hat
- **THEN** SHALL es in der Portions-Plausibilitäts-Liste erscheinen
