# food-admin Specification

## Purpose
Defines staff-only administration behavior for food master data and food rules.
## Requirements
### Requirement: Staff-only Admin-Bereich

Das food-frontend MUST einen Admin-Bereich unter `/admin` bereitstellen, der nur für authentifizierte Staff-User zugänglich ist.

#### Scenario: Staff-User greift auf Admin zu
- **WHEN** ein authentifizierter User mit `is_staff=true` auf `/admin` navigiert
- **THEN** wird die Admin-Seite mit Tab-Navigation angezeigt

#### Scenario: Nicht-Staff-User greift auf Admin zu
- **WHEN** ein authentifizierter User mit `is_staff=false` auf `/admin` navigiert
- **THEN** wird der User auf `/recipes` weitergeleitet

#### Scenario: Nicht-authentifizierter User greift auf Admin zu
- **WHEN** ein nicht-authentifizierter User auf `/admin` navigiert
- **THEN** wird der User auf `/login` weitergeleitet

### Requirement: RetailSection CRUD

Das System MUST Staff-Usern erlauben, Einzelhandelsabteilungen (RetailSection) zu erstellen, bearbeiten und löschen.

#### Scenario: RetailSection erstellen
- **WHEN** Staff-User auf "Neu" klickt und Name, Beschreibung, Rang eingibt
- **THEN** wird eine neue RetailSection erstellt und in der Tabelle angezeigt

#### Scenario: RetailSection bearbeiten
- **WHEN** Staff-User die Bearbeiten-Aktion einer RetailSection wählt
- **THEN** öffnet sich ein Dialog mit den aktuellen Werten, der nach Speichern die Änderungen persistiert

#### Scenario: RetailSection löschen
- **WHEN** Staff-User die Löschen-Aktion einer RetailSection wählt und bestätigt
- **THEN** wird die RetailSection entfernt

#### Scenario: Löschen mit Referenzen
- **WHEN** Staff-User eine RetailSection löschen will die von Ingredients referenziert wird
- **THEN** zeigt das System eine Fehlermeldung an und verhindert das Löschen

### Requirement: NutritionalTag CRUD

Das System MUST Staff-Usern erlauben, Nährwert-Tags (NutritionalTag) zu erstellen, bearbeiten und löschen.

#### Scenario: NutritionalTag erstellen
- **WHEN** Staff-User auf "Neu" klickt und Name, Gegenname, Beschreibung, Rang, is_dangerous eingibt
- **THEN** wird ein neuer NutritionalTag erstellt und in der Tabelle angezeigt

#### Scenario: NutritionalTag bearbeiten
- **WHEN** Staff-User die Bearbeiten-Aktion eines NutritionalTag wählt
- **THEN** öffnet sich ein Dialog mit den aktuellen Werten, der nach Speichern die Änderungen persistiert

#### Scenario: NutritionalTag löschen
- **WHEN** Staff-User die Löschen-Aktion eines NutritionalTag wählt und bestätigt
- **THEN** wird der NutritionalTag entfernt

### Requirement: HealthRule CRUD

Das System MUST Staff-Usern erlauben, vereinheitlichte Food-Regeln (`Rule`) zu erstellen, bearbeiten und löschen. Die Regelverwaltung MUST die Scopes `recipe`, `meal`, `day` und `meal_event` sowie Parameter für Nährwerte, Preis, Gewicht und Nutri-Score unterstützen.

Die UI MUST klar machen, dass Rezeptregeln auf Rezeptebene nur für Kalte und Warme Mahlzeiten sinnvoll sind, während Mahlzeit-, Tages- und Planregeln im Planer auf alle Mahlzeittypen angewandt werden.

#### Scenario: Rule erstellen
- **WHEN** Staff-User auf "Neu" klickt und alle Felder (name, description, parameter, scope, min/max green/yellow, unit, tip_text, is_active, sort_order) eingibt
- **THEN** wird eine neue Rule erstellt und in der Tabelle angezeigt

#### Scenario: Rule bearbeiten
- **WHEN** Staff-User die Bearbeiten-Aktion einer Rule wählt
- **THEN** öffnet sich ein Dialog mit den aktuellen Werten, der nach Speichern die Änderungen persistiert

#### Scenario: Rule löschen
- **WHEN** Staff-User die Löschen-Aktion einer Rule wählt und bestätigt
- **THEN** wird die Rule entfernt

#### Scenario: Rule deaktivieren
- **WHEN** Staff-User `is_active` auf false setzt
- **THEN** wird die Rule nicht mehr in Rezeptregeln oder Planer-Vorschlägen angewendet

#### Scenario: Erweiterte Parameter auswählen
- **WHEN** Staff-User eine Rule erstellt oder bearbeitet
- **THEN** kann der User Parameter wie `price_total`, `weight_g` und `nutri_class` auswählen
- **THEN** zeigt das Formular passende Einheiten oder Hinweise für diese Parameter an

#### Scenario: Hinweis bei Rezept-Scope
- **WHEN** Staff-User `scope="recipe"` auswählt
- **THEN** zeigt das Formular einen deutschen Hinweis, dass diese Regeln nur für Kalte und Warme Mahlzeiten auf Rezeptebene gelten

#### Scenario: Planer-Scope gilt für alle Mahlzeiten
- **WHEN** Staff-User `scope="meal"`, `scope="day"` oder `scope="meal_event"` auswählt
- **THEN** zeigt das Formular oder die Beschreibung an, dass diese Regeln im Planer aggregiert auf alle Mahlzeittypen angewandt werden

### Requirement: RecipeHint-Verwaltung im food-frontend

Die RecipeHint-Verwaltung MUST im food-frontend unter `/admin/recipe-hints` verfügbar sein. Die bestehende Seite im Haupt-Frontend wird entfernt.

#### Scenario: RecipeHints auflisten
- **WHEN** Staff-User den Tab "Rezept-Hinweise" wählt
- **THEN** werden alle RecipeHints in einer paginierten Tabelle angezeigt

#### Scenario: RecipeHint erstellen
- **WHEN** Staff-User auf "Neu" klickt und alle Felder eingibt
- **THEN** wird ein neuer RecipeHint erstellt

#### Scenario: RecipeHint bearbeiten
- **WHEN** Staff-User die Bearbeiten-Aktion wählt
- **THEN** öffnet sich ein Dialog mit den aktuellen Werten

### Requirement: Einheitliches Tabellen-Layout

Alle Stammdaten-Tabs MUST ein konsistentes Layout verwenden: sortierbare Tabelle mit Row-Actions (Bearbeiten, Löschen) und einem "Neu"-Button.

#### Scenario: Tabelle sortieren
- **WHEN** Staff-User auf einen Spalten-Header klickt
- **THEN** wird die Tabelle nach dieser Spalte sortiert (toggle asc/desc)

#### Scenario: Bestätigungsdialog beim Löschen
- **WHEN** Staff-User die Löschen-Aktion wählt
- **THEN** erscheint ein Bestätigungsdialog bevor die Löschung ausgeführt wird

