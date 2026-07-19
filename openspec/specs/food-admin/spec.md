# food-admin Specification

## Purpose
Defines staff-only administration behavior for food master data and food rules.
## Requirements
### Requirement: Staff-only Admin-Bereich

Das food-frontend MUST einen Admin-Bereich unter `/admin` bereitstellen, der nur für authentifizierte Staff-User zugänglich ist. Der Admin-Bereich SHALL zusätzlich zu den bestehenden Tabs (Freigaben, Abteilungen, Equipment, Ernährungstags, Tags, Regeln, KI Feedback) einen Navigationspunkt "Datenqualität" enthalten, der zu `/admin/data-quality` führt.

Der KI-Feedback-Tab SHALL über die bestehenden Vote-Metriken hinaus folgende Kosten-Visualisierungen enthalten: Übersichtskarten für Gesamtkosten und Token-Verbrauch, erweiterte Kontext-Tabelle mit Kosten-/Token-Spalten, Kosten-Verlaufschart, Zeitraum-Filter, Embedding-Toggle, Pro-User-Kosten-Tabelle mit Detail-Modal und ausklappbare Gemini-Pricing-Sektion.

#### Scenario: Staff-User greift auf Admin zu
- **WHEN** ein authentifizierter User mit `is_staff=true` auf `/admin` navigiert
- **THEN** wird die Admin-Seite mit Tab-Navigation angezeigt
- **THEN** SHALL die Tab-Navigation den Eintrag "Datenqualität" enthalten

#### Scenario: Nicht-Staff-User greift auf Admin zu
- **WHEN** ein authentifizierter User mit `is_staff=false` auf `/admin` navigiert
- **THEN** wird der User auf `/recipes` weitergeleitet

#### Scenario: Nicht-authentifizierter User greift auf Admin zu
- **WHEN** ein nicht-authentifizierter User auf `/admin` navigiert
- **THEN** wird der User auf `/login` weitergeleitet

#### Scenario: Datenqualität direkt aufrufbar
- **WHEN** Staff-User auf `/admin/data-quality` navigiert
- **THEN** SHALL das Datenqualität-Dashboard mit Zutaten/Rezepte-Auswahl geladen werden

#### Scenario: KI-Feedback-Tab zeigt Kosten
- **WHEN** Staff-User den "KI Feedback"-Tab öffnet
- **THEN** SHALL das Dashboard sechs Übersichtskarten anzeigen (Gesamt, Heute, Bewertet, Feedback-Rate, Gesamtkosten, Token-Verbrauch)
- **THEN** SHALL die Kontext-Tabelle Token- und Kosten-Spalten enthalten
- **THEN** SHALL ein Kosten-Verlaufschart sichtbar sein
- **THEN** SHALL ein Zeitraum-Dropdown und Embedding-Toggle vorhanden sein
- **THEN** SHALL eine Pro-User-Kosten-Tabelle mit klickbaren Zeilen existieren
- **THEN** SHALL eine ausklappbare "Gemini-Preise"-Sektion vorhanden sein

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

### Requirement: Equipment CRUD

Das System MUST Staff-Usern erlauben, Equipment-Einträge (Topf, Pfanne, Ofen, etc.) im Tab "Equipment" zwischen "Abteilungen" und "Ernährungstags" zu verwalten.

#### Scenario: Equipment erstellen
- **WHEN** Staff-User auf "Neu" klickt und Name, Rang eingibt
- **THEN** wird ein neuer Equipment-Eintrag erstellt (Slug wird automatisch aus Name generiert)

#### Scenario: Equipment mit Seed-Daten
- **WHEN** die Datenbank initialisiert wird
- **THEN** sind folgende Einträge vorbelegt: Topf, Pfanne, Ofen, Grill, Dutch Oven, Thermomix, Wasserkocher, Kühlschrank

### Requirement: Tag Admin CRUD

Das System MUST Staff-Usern erlauben, content.Tags im Tab "Tags" zwischen "Ernährungstags" und "Regeln" zu verwalten. Tags verwenden UUID-Primärschlüssel.

#### Scenario: Tags auflisten
- **WHEN** Staff-User den "Tags"-Tab öffnet
- **THEN** werden alle Tags in einer paginierten Tabelle mit Name, Slug (read-only, auto-generiert), Gruppe, Icon, Sortierung angezeigt

#### Scenario: Tag erstellen
- **WHEN** Staff-User auf "Neu" klickt und Name, Beschreibung, Gruppe, Icon, Parent-Tag (optional) eingibt
- **THEN** wird ein neuer Tag erstellt (Slug wird automatisch aus Name generiert)

#### Scenario: Tag-Detailseite
- **WHEN** Staff-User auf einen Tag-Namen klickt
- **THEN** wird `/admin/tag/{id}` geöffnet
- **THEN** zeigt die Seite Tag-Details sowie Listen verknüpfter Rezepte und Zutaten
