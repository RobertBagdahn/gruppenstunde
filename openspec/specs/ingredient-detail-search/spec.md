## ADDED Requirements

### Requirement: Detailsuche-Dialog öffnen
Der `InlineIngredientEditor` SHALL einen [⚙]-Button neben dem "Zutat hinzufügen..."-Feld anzeigen, der einen vollständigen Suchdilog öffnet.

#### Scenario: Dialog öffnen via Button
- **WHEN** ein Nutzer im Edit-Modus des Rezepts auf den [⚙]-Button neben "Zutat hinzufügen..." klickt
- **THEN** SHALL der `IngredientDetailSearchDialog` als Vollbild-Dialog (max-w-3xl) geöffnet werden

#### Scenario: Dialog schließen
- **WHEN** der Nutzer den Dialog abbricht (✕-Button oder Escape-Taste)
- **THEN** SHALL kein Ingredient hinzugefügt werden und der Dialog SHALL geschlossen sein

### Requirement: Volltext-Suche im Dialog
Der Dialog SHALL ein Suchfeld mit Autofokus enthalten, das Zutaten nach Name und Alias sucht.

#### Scenario: Suche nach Name
- **WHEN** der Nutzer mindestens 1 Zeichen in das Suchfeld eingibt
- **THEN** SHALL die Ergebnisliste auf Zutaten gefiltert werden, deren Name oder Alias den Suchtext enthält (case-insensitive)

#### Scenario: Leerer Suchbegriff
- **WHEN** das Suchfeld leer ist
- **THEN** SHALL die Ergebnisliste alle Zutaten (ungefiltert, nach Default-Ordering) anzeigen

#### Scenario: Keine Ergebnisse
- **WHEN** die Suche keine Treffer liefert
- **THEN** SHALL der Text "Keine Zutaten gefunden" in der Ergebnisliste angezeigt werden

### Requirement: Filter nach Abteilung
Der Dialog SHALL eine Filterleiste mit Abteilungs-Pills (retail_section) anzeigen.

#### Scenario: Alle Abteilungen anzeigen
- **WHEN** der Dialog geöffnet wird
- **THEN** SHALL ein "Alle"-Pill als Standard ausgewählt sein und alle Abteilungen aus `GET /api/retail-sections/` als Pills angezeigt werden

#### Scenario: Nach Abteilung filtern
- **WHEN** der Nutzer eine Abteilung-Pill auswählt
- **THEN** SHALL die Ergebnisliste nur Zutaten der gewählten Abteilung anzeigen

### Requirement: Filter nach Diät-Tags
Der Dialog SHALL Toggle-Pills für Ernährungsmerkmale (nutritional_tags) anzeigen.

#### Scenario: Diät-Tag-Filter
- **WHEN** der Nutzer einen Diät-Tag (z.B. "Vegan") aktiviert
- **THEN** SHALL die Ergebnisliste nur Zutaten anzeigen, die diesen Tag besitzen

#### Scenario: Mehrere Diät-Tags kombinierbar
- **WHEN** der Nutzer mehrere Diät-Tags aktiviert
- **THEN** SHALL die Ergebnisliste nur Zutaten anzeigen, die ALLE aktivierten Tags besitzen (AND-Logik)

### Requirement: Sortierung der Ergebnisse
Der Dialog SHALL eine Sortierauswahl anbieten.

#### Scenario: Standard-Sortierung
- **WHEN** der Dialog geöffnet wird
- **THEN** SHALL "Relevanz" als Standard-Sortierung aktiv sein

#### Scenario: Nach Preis sortieren
- **WHEN** der Nutzer "Preis (aufsteigend)" wählt
- **THEN** SHALL Zutaten mit niedrigstem `price_per_kg` zuerst erscheinen, Zutaten ohne Preis ans Ende

#### Scenario: Nach Nutriscore sortieren
- **WHEN** der Nutzer "Nutriscore" wählt
- **THEN** SHALL Zutaten mit `nutri_class=1` (A) zuerst erscheinen

#### Scenario: Nach Kalorien sortieren
- **WHEN** der Nutzer "Kalorien" wählt
- **THEN** SHALL Zutaten mit niedrigstem `energy_kcal` zuerst erscheinen

### Requirement: Ergebnisliste mit mittlerer Detailtiefe
Jedes Element der Ergebnisliste SHALL folgende Informationen anzeigen: Name, Abteilung, Preis/kg, Nutriscore-Badge, kcal pro 100g, Protein pro 100g.

#### Scenario: Ergebniszeile mit vollständigen Daten
- **WHEN** eine Zutat alle Felder befüllt hat
- **THEN** SHALL die Zeile Name, Abteilungsname, Preis (z.B. "2,90 €/kg"), Nutriscore-Badge (A–E farbig), kcal-Wert und Protein-Wert (in g) anzeigen

#### Scenario: Fehlende Felder
- **WHEN** eine Zutat keinen Preis oder keinen Nutriscore hat
- **THEN** SHALL das fehlende Feld als "–" oder grauer Platzhalter dargestellt werden

#### Scenario: Nutriscore-Badge-Farbgebung
- **WHEN** eine Zutat `nutri_class=1` (A) hat
- **THEN** SHALL der Badge grün dargestellt werden; bei E (5) rot

### Requirement: Mengenauswahl nach Zutat-Auswahl
Nach Klick auf eine Zutat in der Ergebnisliste SHALL ein `IngredientQuantityDialog` geöffnet werden, in dem der Nutzer Menge und Einheit wählt, bevor die Zutat dem Rezept hinzugefügt wird.

#### Scenario: Mengenauswahl-Dialog öffnet sich
- **WHEN** der Nutzer auf eine Zutat in der Ergebnisliste klickt
- **THEN** SHALL der `IngredientQuantityDialog` geöffnet werden mit allen verfügbaren Portionen der Zutat als Einheitenauswahl

#### Scenario: Standardportion vorausgewählt
- **WHEN** der `IngredientQuantityDialog` öffnet
- **THEN** SHALL die Portion mit `is_default=true` vorausgewählt sein; fehlt diese, die erste verfügbare Portion

#### Scenario: Bestätigen fügt Zutat hinzu
- **WHEN** der Nutzer Menge und Einheit bestätigt (Button "Hinzufügen")
- **THEN** SHALL die Zutat mit der eingegebenen Menge und der gewählten Einheit der Rezept-Zutatenliste hinzugefügt werden
- **THEN** SHALL der Dialog geschlossen sein

#### Scenario: Abbrechen im Mengenauswahl-Dialog
- **WHEN** der Nutzer den `IngredientQuantityDialog` abbricht
- **THEN** SHALL keine Zutat hinzugefügt werden und der Haupt-Suchdialog SHALL wieder sichtbar sein

### Requirement: Gesamtgewicht-Anzeige im Mengenauswahl-Dialog
Der `IngredientQuantityDialog` SHALL das Gesamtgewicht in Gramm anzeigen, sofern die gewählte Portion ein `weight_g` hat.

#### Scenario: Gewichtsberechnung
- **WHEN** der Nutzer eine Menge eingibt und die Portion ein `weight_g` hat
- **THEN** SHALL `= X g` (Menge × weight_g) dynamisch neben der Einheitenauswahl angezeigt werden

---

### Requirement: Neue-Zutat-Button im Dialog
Der `IngredientDetailSearchDialog` SHALL einen permanenten [+]-Button im Dialog-Header anzeigen, der die Navigation zur Zutaten-Erstellungsseite ermöglicht.

#### Scenario: Button sichtbar und klickbar
- **WHEN** der `IngredientDetailSearchDialog` geöffnet ist
- **THEN** SHALL ein [+]-Button im Dialog-Header (neben dem Suchfeld oder in der Titelzeile) sichtbar sein
- **THEN** der Button SHALL das Label "Neue Zutat" oder ein "+"-Icon mit Tooltip "Neue Zutat" anzeigen

#### Scenario: Klick auf +-Button navigiert zur Erstellungsseite
- **WHEN** der Nutzer auf den [+]-Button klickt
- **THEN** SHALL das System zu `/ingredients/new?redirectTo=<aktuelle Seiten-URL>` navigieren
- **THEN** der Dialog SHALL geschlossen werden

### Requirement: Rückkehr aus Zutaten-Erstellung mit auto-add
Wenn der Nutzer nach erfolgreicher Zutaten-Erstellung zurück zum Dialog kommt, SHALL die neu erstellte Zutat automatisch selektiert werden.

#### Scenario: Rückkehr-Parameter enthält neue Zutat
- **WHEN** die Seite einen `?newIngredientSlug=<slug>` Query-Parameter enthält und der Dialog sich öffnet (oder bereits offen ist)
- **THEN** SHALL das System die Zutat per Slug laden (`GET /api/ingredients/<slug>/`)
- **THEN** SHALL der `IngredientQuantityDialog` für diese Zutat geöffnet werden
- **THEN** nach Bestätigung SHALL die Zutat mit gewählter Menge/Portion dem Rezept hinzugefügt werden

#### Scenario: Ungültiger newIngredientSlug
- **WHEN** der `newIngredientSlug` auf keine existierende Zutat verweist
- **THEN** SHALL das System den Parameter still ignorieren (kein Fehler-Toast, kein Crash)
