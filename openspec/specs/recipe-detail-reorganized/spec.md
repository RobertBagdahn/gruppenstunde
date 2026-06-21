## MODIFIED Requirements

### Requirement: Bild abschnittsbasiert anzeigen
Das Titelbild SHALL nur gerendert werden, wenn `recipe.image_url` einen Wert hat. Wenn kein Bild vorhanden ist, SHALL statt eines großen Fallback-Bildes ein kleiner, dezenter Icon-Placeholder (niedrige Höhe, Rezepttyp-Icon auf dezentem Hintergrund) angezeigt werden. Für Nutzer mit Bearbeitungsrecht SHALL ein Button zum Bild-Hinzufügen erscheinen.

#### Scenario: Rezept mit Bild
- **WHEN** ein Nutzer ein Rezept mit `image_url` öffnet
- **THEN** wird das quadratische Titelbild angezeigt
- **THEN** der Edit-Button ist für can_edit-Nutzer sichtbar

#### Scenario: Rezept ohne Bild
- **WHEN** ein Nutzer ein Rezept ohne `image_url` öffnet
- **THEN** wird ein kleiner dezenter Icon-Placeholder statt des großen Fallback-Bildes angezeigt
- **THEN** der Edit-Button zum Hinzufügen eines Bildes erscheint für can_edit-Nutzer

### Requirement: Kompakte Meta-Inline-Header-Zeile
Unter dem Rezept-Titel SHALL eine kompakte, kleine Beschreibung (Summary) erscheinen. Die übrigen Metadaten (Autor, Kategorie/Typ, Kochzeit, Schwierigkeit, Altersgruppe, Aufrufe, Likes, Status) SHALL NICHT inline unter dem Titel, sondern in der reichhaltigen Seitenleiste dargestellt werden. Die `ContentAuthorSection`-Komponente SHALL aus der RecipeDetailPage entfernt werden (Autor erscheint nur in der Seitenleiste).

#### Scenario: Summary unter Titel
- **WHEN** ein Nutzer die Detailseite öffnet
- **THEN** erscheint die Beschreibung kompakt und klein direkt unter dem Titel
- **THEN** alle weiteren Metadaten erscheinen in der Seitenleiste

#### Scenario: Keine doppelte Autor-Anzeige
- **WHEN** die Detailseite gerendert wird
- **THEN** wird der Autor nur in der Seitenleiste angezeigt, es gibt keine separate ContentAuthorSection unten

### Requirement: Neue Sektions-Reihenfolge
Die Sektionen der Detailseite SHALL in folgender Reihenfolge erscheinen:
1. Titel + kompakte kleine Summary + (Bearbeiten/Löschen rechts)
2. Source-URL-Link (wenn vorhanden)
3. Hero: Bild oder kleiner Icon-Placeholder
4. Zutaten
5. Zubereitung (default GESCHLOSSEN)
6. Themen-Tags
7. Nutritional Tags / Allergen-Ampel
8. Analyse-Tabs (mit Histogrammen)
9. Rezeptregeln
10. Ähnliche Rezepte (Embedding-basiert)
11. Emotionen
12. Comments

#### Scenario: Zubereitung default geschlossen
- **WHEN** ein Nutzer die Detailseite öffnet
- **THEN** ist die Zubereitungs-Sektion standardmäßig eingeklappt

#### Scenario: Ähnliche Rezepte sichtbar
- **WHEN** für das Rezept ähnliche Rezepte (Embedding-basiert) existieren
- **THEN** werden diese als Karten-Reihe vor den Emotionen angezeigt

### Requirement: Button-Konsolidierung in Action-Bar und Sidebar
Die Aktionen SHALL wie folgt verteilt sein: Bearbeiten und Löschen SHALL ausschließlich im Header oben rechts erscheinen (nur can_edit/can_delete). Die Desktop-Sidebar SHALL die Aktionen Kochen starten, Einkaufsliste, Portionen-Scaler, Drucken, Teilen und Rezept clonen enthalten. Die Mobile Action Bar SHALL diese Aktionen im Overflow-Menü bündeln.

#### Scenario: Desktop-Aktionen
- **WHEN** ein Nutzer auf Desktop die Detailseite öffnet
- **THEN** sieht er Bearbeiten/Löschen oben rechts und Kochen/Einkaufsliste/Portionen/Drucken/Teilen/Clonen in der Sidebar

#### Scenario: Mobile-Aktionen
- **WHEN** ein Nutzer auf Mobile die Detailseite öffnet
- **THEN** sind die Aktionen in der unteren Action-Bar bzw. deren Overflow-Menü erreichbar

### Requirement: Analyse als Tab-Komponente
Die vier Analyse-Sektionen (Preis, Inhaltsstoffe, Gesundheit, Gewicht) SHALL in eine einzige Tab-basierte Sektion zusammengeführt werden. Jeder relevante Tab SHALL ein Histogramm mit der Position des aktuellen Rezepts anzeigen (siehe recipe-detail-page). Auf Mobile SHALL die Tab-Leiste horizontal scrollbar sein.

#### Scenario: Tab-Wechsel
- **WHEN** ein Nutzer auf einen anderen Analyse-Tab klickt
- **THEN** wird der entsprechende Inhalt angezeigt, andere Tabs ausgeblendet

## ADDED Requirements

### Requirement: Reichhaltige Metadaten-Seitenleiste
Die Desktop-Seitenleiste SHALL eine reichhaltige Metadaten-Karte enthalten mit: Rezepttyp-Badge (oben), Gesamtkosten, Nutri-Score, Status (Entwurf/Veröffentlicht/Verifiziert), Autor (mit Link zum Profil), Kategorie/Rezepttyp (verlinkt), Kochzeit, Vorbereitung, Schwierigkeit, Altersgruppe, Aufrufe, Likes, Datenqualität-Score sowie Erstellt-/Aktualisiert-Datum. Der Rezepttyp-Badge SHALL nur in der Seitenleiste erscheinen (nicht im Header).

#### Scenario: Sidebar-Metadaten auf Desktop
- **WHEN** ein Nutzer die Detailseite auf Desktop öffnet
- **THEN** zeigt die Seitenleiste alle genannten Metadaten inkl. Typ-Badge oben

#### Scenario: Verlinkte Metadaten
- **WHEN** ein Nutzer auf Autor oder Kategorie in der Seitenleiste klickt
- **THEN** wird er zum Autor-Profil bzw. zur gefilterten Rezeptliste navigiert

### Requirement: Zwei-spaltige Portion-Anzeige
Zutaten- und Nährwert-Anzeigen SHALL zwei Werte zeigen: "pro Portion" und "gesamt (× n Portionen)". Die Datenbank SHALL weiterhin pro-1-Portion-Mengen speichern; das Frontend SHALL beim Speichern auf pro-1-Portion zurückrechnen und KEIN `portions`-Feld im Update-Payload senden.

#### Scenario: Anzeige beider Werte
- **WHEN** die Portionszahl auf n gesetzt ist
- **THEN** zeigen Zutaten und Nährwerte sowohl den pro-Portion-Wert als auch den Gesamtwert (× n)

#### Scenario: Speichern normalisiert auf 1 Portion
- **WHEN** ein Nutzer modifizierte Zutaten speichert
- **THEN** sendet das Frontend pro-1-Portion-Mengen ohne `portions`-Feld
- **THEN** speichert das Backend die Werte als pro-1-Portion
