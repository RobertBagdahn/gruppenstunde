## RENAMED Requirements

### Requirement: Apfel-Rating Berechnung
- **FROM:** Apfel-Rating Berechnung
- **TO:** Inspi-Score Berechnung

### Requirement: Apfel-Rating API-Endpunkt
- **FROM:** Apfel-Rating API-Endpunkt
- **TO:** Inspi-Score API-Endpunkt

### Requirement: Apfel-Rating Darstellung im Frontend
- **FROM:** Apfel-Rating Darstellung im Frontend
- **TO:** Inspi-Score Darstellung im Frontend

## MODIFIED Requirements

### Requirement: Inspi-Score Berechnung

Das System MUSS für jedes Rezept ein 4-Dimensionen-Rating berechnen, dargestellt als 1-5 Inspi-Köpfe pro Dimension. Die Dimensionen sind: Preis, Gesundheit, Sättigung und Geschmack.

#### Scenario: Preis-Rating berechnen
- **WHEN** das System das Preis-Rating für ein Rezept berechnet
- **THEN** MUSS es den `cached_price_total` des Rezepts mit dem Durchschnittspreis aller Rezepte gleichen `recipe_type` vergleichen
- **THEN** MUSS das Rating 5 Inspi-Köpfe vergeben wenn der Preis im unteren Quartil liegt, 4 Inspi-Köpfe im zweiten Quartil, 3 im dritten, 2 im vierten und 1 wenn über dem 90. Perzentil

#### Scenario: Gesundheits-Rating berechnen
- **WHEN** das System das Gesundheits-Rating berechnet
- **THEN** MUSS es die `cached_nutri_class` des Rezepts direkt in Inspi-Köpfe umwandeln: Klasse 1 (A) = 5 Inspi-Köpfe, Klasse 2 (B) = 4, Klasse 3 (C) = 3, Klasse 4 (D) = 2, Klasse 5 (E) = 1
- **THEN** MUSS bei fehlender Nutri-Klasse `null` zurückgegeben werden

#### Scenario: Sättigungs-Rating berechnen
- **WHEN** das System das Sättigungs-Rating berechnet
- **THEN** MUSS es die Energiedichte pro Portion (`cached_energy_kj / servings`) mit dem DGE-Referenzwert für den Mahlzeitentyp vergleichen
- **THEN** MUSS das Rating 5 Inspi-Köpfe vergeben wenn das Verhältnis zwischen 0.9 und 1.1 liegt (optimal sättigend), abnehmend für Abweichungen in beide Richtungen

#### Scenario: Geschmacks-Rating berechnen
- **WHEN** das System das Geschmacks-Rating berechnet
- **THEN** MUSS es Geschmacksträger analysieren: Fettgehalt (Mundgefühl), Zuckergehalt (Süße), Salzgehalt (Würze) und Ballaststoffe (Komplexität)
- **THEN** MUSS das Rating einen gewichteten Composite-Score aus diesen Faktoren bilden, normalisiert auf 1-5 Inspi-Köpfe

### Requirement: Inspi-Score API-Endpunkt

Das System MUSS einen API-Endpunkt bereitstellen, der den vollständigen Inspi-Score für ein Rezept zurückgibt.

#### Scenario: Score abrufen
- **WHEN** ein GET-Request an `/api/recipes/{recipe_id}/inspi-score/` gesendet wird
- **THEN** MUSS die Response ein JSON-Objekt mit den Feldern `price` (object), `health` (object), `satiety` (object), `taste` (object) und `overall` (object) enthalten
- **THEN** MUSS jedes Dimensions-Objekt die Felder `score` (int 1-5), `label` (string, deutsch) und `details` (string, deutsch) enthalten

#### Scenario: Score bei unvollständigen Daten
- **WHEN** ein Rezept keine gecachten Nährwertdaten hat
- **THEN** MUSS das System für betroffene Dimensionen `score: null` zurückgeben mit einer erklärenden `details`-Nachricht

### Requirement: Inspi-Score Darstellung im Frontend

Das System MUSS den Inspi-Score prominent oben auf der Rezept-Detailseite anzeigen. Als visuelles Symbol MUSS der Inspi-Kopf (favicon.png) verwendet werden.

#### Scenario: Score-Anzeige auf Rezept-Detailseite
- **WHEN** ein User die Rezept-Detailseite öffnet
- **THEN** MUSS unter dem Rezeptbild eine Zeile mit 4 Rating-Boxen angezeigt werden
- **THEN** MUSS jede Box ein Dimensions-Icon, den Dimensionsnamen, die Inspi-Kopf-Anzeige (gefüllt/ausgegraut) und ein kurzes Label zeigen
- **THEN** MÜSSEN gefüllte Inspi-Köpfe das favicon.png als `<img>` Element verwenden
- **THEN** MÜSSEN leere/unerfüllte Positionen das gleiche favicon.png mit `opacity-25 grayscale` CSS-Klassen darstellen

#### Scenario: Tooltip mit Details
- **WHEN** ein User auf eine Rating-Box klickt oder hovert
- **THEN** MUSS ein Tooltip oder Popover die `details`-Erklärung und den Referenzwert-Vergleich anzeigen

#### Scenario: Gesamt-Score Anzeige
- **WHEN** die Score-Komponente gerendert wird
- **THEN** MUSS unterhalb der 4 Dimensionen eine Gesamt-Zeile mit dem Overall-Score in Inspi-Köpfen angezeigt werden
