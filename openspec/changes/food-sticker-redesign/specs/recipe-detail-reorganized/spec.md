# Spec Delta

## REMOVED Requirements

### Requirement: Bild abschnittsbasiert anzeigen
**Reason**: Die Leinwand zeigt keine große Titelfläche. Ohne Foto erscheint kein Platzhalter-Block; der Rezepttyp steht als Tag.
**Migration**: Siehe „Rezeptkopf mit Kennzahlen und optionalem Foto“.

### Requirement: Kompakte Meta-Inline-Header-Zeile
**Reason**: Die Leinwand zeigt die wichtigsten Kennzahlen (Zeit, Schwierigkeit, Kosten, Nährwert, Nutri-Score) direkt im Kopf. Die Seitenleiste entfällt damit für diese Werte.
**Migration**: Siehe „Rezeptkopf mit Kennzahlen und optionalem Foto“.

### Requirement: Neue Sektions-Reihenfolge
**Reason**: Die Leinwand öffnet die Zubereitung standardmäßig, nicht eingeklappt, und zeigt ähnliche Rezepte nach der Zubereitung.
**Migration**: Siehe „Sektions-Reihenfolge der Rezeptseite“.

## ADDED Requirements

### Requirement: Rezeptkopf mit Kennzahlen und optionalem Foto
Der Kopf SHALL Titel, eine kurze Beschreibung, die Kennzahlen Zeit, Schwierigkeit, Kosten pro Portion und Nährwert (kcal) sowie das Nutri-Score-Badge zeigen. Ein Foto erscheint nur, wenn `image_url` gesetzt ist. Weitere Metadaten (Autor, Altersgruppe, Aufrufe) stehen in der Seitenleiste.

#### Scenario: Rezept mit Foto
- **WHEN** ein Rezept mit `image_url` geöffnet wird
- **THEN** zeigt der Kopf das Foto als 4:3-Fläche unter der Kopfzeile

#### Scenario: Rezept ohne Foto
- **WHEN** ein Rezept ohne `image_url` geöffnet wird
- **THEN** zeigt der Kopf keine Bildfläche, sondern den Rezepttyp als Tag

#### Scenario: Keine doppelte Autor-Anzeige
- **WHEN** die Detailseite gerendert wird
- **THEN** wird der Autor nur in der Seitenleiste angezeigt

### Requirement: Sektions-Reihenfolge der Rezeptseite
Die Sektionen SHALL in dieser Reihenfolge erscheinen: Kopf mit Aktionen, Zutaten, Zubereitung, ähnliche Rezepte, Analyse und Kommentare. Die Zubereitung ist standardmäßig geöffnet. Auf dem Handy steht die Aktionsleiste unten.

#### Scenario: Zubereitung standardmäßig offen
- **WHEN** ein Nutzer die Detailseite öffnet
- **THEN** ist die Zubereitung geöffnet und die Schritte sind sichtbar

#### Scenario: Ähnliche Rezepte sichtbar
- **WHEN** für das Rezept ähnliche Rezepte (Embedding-basiert) existieren
- **THEN** werden diese als Karten-Reihe nach der Zubereitung angezeigt
