# recipe-detail-reorganized Specification

## ADDED Requirements

### Requirement: Bild abschnittsbasiert anzeigen
Das Titelbild SHALL nur gerendert werden, wenn `recipe.image_url` einen Wert hat. Wenn kein Bild vorhanden ist, SHALL der Hero-Bereich komplett entfallen (kein Container, kein Fallback-Bild). Für Nutzer mit Bearbeitungsrecht SHALL ein Button zum Bild-Hinzufügen im Header-Bereich erscheinen (Photo-Camera-Icon).

#### Scenario: Rezept mit Bild
- **WHEN** ein Nutzer ein Rezept mit `image_url` öffnet
- **THEN** wird das quadratische Titelbild wie gewohnt angezeigt
- **THEN** der Gradient-Overlay und der Edit-Button sind sichtbar

#### Scenario: Rezept ohne Bild
- **WHEN** ein Nutzer ein Rezept ohne `image_url` öffnet
- **THEN** wird kein Bild-Container gerendert
- **THEN** der Header ist kompakter — Title erscheint direkt unter den Badges
- **THEN** der Edit-Button zum Hinzufügen eines Bildes erscheint als kleines Icon neben dem Titel (nur für can_edit-Nutzer)

### Requirement: Kompakte Meta-Inline-Header-Zeile
Unter dem Rezept-Titel SHALL eine kompakte Zeile mit Meta-Informationen erscheinen, die alle relevanten Metadaten auf einem Blick zeigt: Autor, Kochzeit, Schwierigkeit, Altersgruppe, Aufrufe, Likes. Diese Zeile SHALL Autor nur einmal enthalten (nicht zusätzlich in einer ContentAuthorSection unten). Das Format SHALL `·`-separierte Badges oder Icons sein. Die `ContentAuthorSection`-Komponente SHALL aus der RecipeDetailPage entfernt werden.

#### Scenario: Meta-Header auf Desktop
- **WHEN** ein Nutzer die Detailseite auf Desktop öffnet
- **THEN** sieht er unter dem Titel "Max Mustermann · 30-60 Min · Mittel · Für alle · 42 Aufrufe · 8 Likes"

#### Scenario: Meta-Header auf Mobile
- **WHEN** der Viewport < 768px ist
- **THEN** bricht die Zeile um (Wrap) statt horizontalem Scrollen

### Requirement: Neue Sektions-Reihenfolge
Die Sektionen der Detailseite SHALL in folgender Reihenfolge erscheinen:
1. Badges + Titel + Meta-Header
2. Hero Image (nur wenn vorhanden)
3. Summary
4. Zutaten (immer)
5. Zubereitung (defaultOpen=true, direkt nach Zutaten)
6. Themen-Tags
7. Nutritional Tags (Allergene)
8. Analyse-Tabs (Preis | Inhaltsstoffe | Gesundheit | Gewicht)
9. Rezeptregeln
10. Ähnliche Rezepte
11. ContentLinkSection
12. Emotionen ("Wie findest du das Rezept?")
13. Comments

#### Scenario: Zubereitung ist direkt nach Zutaten
- **WHEN** ein Nutzer auf die Detailseite scrollt
- **THEN** erscheinen nach den Zutaten sofort die Zubereitungsschritte (default aufgeklappt)
- **THEN** die Analyse-Sektionen erscheinen erst nach Themen/Allergenen

#### Scenario: Source URL bleibt unter Titel
- **WHEN** das Rezept eine `source_url` hat
- **THEN** erscheint der "Originalrezept"-Link zwischen Meta-Header und Summary

### Requirement: Analyse als Tab-Komponente
Die vier Analyse-Sektionen (Preis, Inhaltsstoffe, Gesundheit, Gewicht) SHALL in eine einzige Tab-basierte Sektion zusammengeführt werden. Die Tabs SHALL horizontal als Reiter dargestellt sein (auf Desktop) und als horizontales Scrollable-Pill-List (auf Mobile). Nur ein Tab SHALL gleichzeitig sichtbar sein. Der erste Tab (Inhaltsstoffe) SHALL default aktiv sein.

#### Scenario: Tab-Wechsel
- **WHEN** ein Nutzer auf "Preis" klickt
- **THEN** wird die Preis-Analyse angezeigt, andere Tabs sind ausgeblendet
- **THEN** der aktive Tab ist farblich hervorgehoben

#### Scenario: Mobile Tabs
- **WHEN** der Viewport < 768px ist
- **THEN** die Tabs sind als horizontal scrollbare Pill-Liste dargestellt

### Requirement: Button-Konsolidierung in Action-Bar und Sidebar
Alle nicht-kontextuellen Aktionen SHALL in der Mobile Action Bar (unten fixiert) und der Desktop Sidebar (rechts) gebündelt sein. Die Mobile Action Bar SHALL ein Overflow-Menü (`more_vert`) enthalten, das alle Aktionen auflistet:
- Kochen starten
- Einkaufsliste
- Portionen
- Bearbeiten (nur can_edit)
- Löschen (nur can_delete)
- Rezept clonen (nur eingeloggt)
- Drucken
- Teilen

Der "Zutaten bearbeiten"-Button SHALL im Zutaten-Header verbleiben.

#### Scenario: Mobile Action Bar zeigt alle Aktionen
- **WHEN** ein Nutzer auf Mobile die Detailseite öffnet
- **THEN** sieht er unten: [Einkaufsliste] [Portionen] [⋮] 
- **THEN** im Overflow ⋮ sind Bearbeiten, Löschen, Clonen, Kochen, Drucken, Teilen

#### Scenario: Desktop Sidebar zeigt alle Aktionen
- **WHEN** ein Nutzer auf Desktop die Detailseite öffnet
- **THEN** sieht er rechts: PortionScaler + [Kochen] [Drucken] [Einkaufsliste] [Teilen] [Clonen]

### Requirement: Portion-Skalierung vereinheitlicht
Der "Skalieren"-Button im Zutaten-Header (der einen Faktor-basierten Dialog öffnete) SHALL entfernt und seine Funktionalität in den Portion-Scaler integriert werden. Der PortionScaler SHALL weiterhin absolute Portionszahlen (1, 2, 3...) setzen. Eine zusätzliche "Faktor"-Option (0.5×, 1.5×, 2×) kann im Scaler-Dropdown erscheinen.

#### Scenario: Skalieren-Funktion im PortionScaler
- **WHEN** ein Nutzer den PortionScaler auf Desktop öffnet
- **THEN** kann er auch einen Faktor (0.5×, 1.5×, 2×) als Schnellauswahl wählen
- **THEN** der absolute Portionswert aktualisiert sich entsprechend

### Requirement: Zutaten-Header modernisiert
Der Zutaten-Header SHALL ein `nutrition`-Icon (Lucide: `Apple` oder alternativ Material: `nutrition`) verwenden statt `egg_alt`. Der Count-Badge SHALL prominenter gestylt sein (z.B. als Chip direkt im Header-Text: "Zutaten 12"). Die Animations- und Hover-Zustände SHALL konsistent mit dem Design-System sein.

#### Scenario: Zutaten-Header-Look
- **WHEN** ein Nutzer die Zutaten-Sektion sieht
- **THEN** sieht er links das `nutrition`-Icon in der bg-primary/10-Box
- **THEN** rechts daneben "Zutaten" mit integriertem Count-Badge "12" in bg-muted
- **THEN** darunter "pro Portion" oder "für 4 Portionen"

### Requirement: Kochmodus mit Portion-Scaler
Der `RecipeCookingMode` SHALL den `onServingsChange`-Callback korrekt nutzen und einen eigenen PortionScaler für den Kochmodus anbieten. Der Nutzer SHALL im Kochmodus die Portionszahl ändern können, ohne den Modus verlassen zu müssen.

#### Scenario: Portionen im Kochmodus ändern
- **WHEN** ein Nutzer im Kochmodus ist
- **THEN** sieht er einen Portion-Scaler (z.B. in der Ingredient-Panel-Header-Zeile)
- **THEN** beim Ändern der Portionszahl werden die Zutatenmengen neu berechnet

### Requirement: DGE-Referenz dynamisch wählbar
Der Analyse-Tab "Inhaltsstoffe" SHALL einen Filter für Alter und Geschlecht der Zielperson anbieten, der die DGE-Referenzwerte beeinflusst. Der Backend-Endpunkt SHALL um `age` und `gender` Query-Parameter erweitert werden.

#### Scenario: DGE-Filter im Analyse-Tab
- **WHEN** ein Nutzer den Inhaltsstoffe-Tab öffnet
- **THEN** sieht er einen Dropdown "Referenz: 25 J., männlich" (Standard)
- **THEN** bei Änderung auf "15 J., weiblich" werden die DGE-Prozentsätze neu berechnet

### Requirement: Kategorie-Benchmarking in Analyse-Tabs
In allen vier Analyse-Tabs (Preis, Inhaltsstoffe, Gesundheit, Gewicht) SHALL ein Kategorievergleich auf Basis von `recipe_type` angezeigt werden. Der Vergleich zeigt Min, Max, Median, Durchschnitt und die Percentile-Position des aktuellen Rezepts innerhalb aller veröffentlichten Rezepte desselben Typs. Das aktuelle Rezept wird aus der Berechnung exkludiert. Der Vergleich wird nur angezeigt, wenn mindestens 10 andere veröffentlichte Rezepte des gleichen Typs existieren. Da `recipe_type` Pflichtfeld ist, gibt es keinen Fallback auf einen anderen Vergleichspool.

#### Scenario: Preisvergleich im Preis-Tab
- **WHEN** ein Nutzer den Preis-Tab öffnet und mindestens 10 andere Rezepte des gleichen Typs existieren
- **THEN** sieht er unterhalb der Preis-Kacheln einen Abschnitt "Kategorievergleich: [Warme Mahlzeit] (47 Rezepte)"
- **THEN** werden angezeigt: Min, Median, Ø, Max (Preis/Portion) sowie ein horizontaler Balken mit Position des aktuellen Rezepts
- **THEN** erscheint ein Percentile-Badge "Günstiger als 83% der Warme-Mahlzeit-Rezepte"

#### Scenario: Inhaltsstoffvergleich im Inhaltsstoffe-Tab
- **WHEN** ein Nutzer den Inhaltsstoffe-Tab öffnet
- **THEN** sieht er pro Makro (Kalorien, Protein, Fett, KH) den Kategorie-Ø als Referenzlinie
- **THEN** erscheint ein Gesamtvergleich "Kalorien/Port. X kcal — Kategorie-Ø: Y kcal"

#### Scenario: Gesundheitsvergleich im Gesundheit-Tab
- **WHEN** ein Nutzer den Gesundheit-Tab öffnet
- **THEN** sieht er die Nutri-Score-Verteilung der Kategorie (Balken A–E mit Anzahl)
- **THEN** wird die Position des Rezepts in der Verteilung hervorgehoben

#### Scenario: Gewichtsvergleich im Gewicht-Tab
- **WHEN** ein Nutzer den Gewicht-Tab öffnet
- **THEN** sieht er Min, Median, Ø, Max (Gewicht/Portion in g) der Kategorie
- **THEN** erscheint ein Percentile-Badge für Gewicht/Portion

#### Scenario: Zu wenige Rezepte in Kategorie
- **WHEN** weniger als 10 andere veröffentlichte Rezepte des gleichen Typs existieren
- **THEN** wird kein Kategorievergleichs-Abschnitt gerendert (kein Hinweis nötig)

#### Scenario: Cache-Invalidierung
- **WHEN** ein Rezept gespeichert wird (create/update/delete)
- **THEN** werden die Kategorie-Statistiken für den betroffenen `recipe_type` neu berechnet und gecacht
