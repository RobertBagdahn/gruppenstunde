## ADDED Requirements

### Requirement: Apfel-Rating Berechnung

Das System MUSS für jedes Rezept ein 4-Dimensionen-Rating berechnen, dargestellt als 1-5 Äpfel pro Dimension. Die Dimensionen sind: Preis, Gesundheit, Sättigung und Geschmack.

#### Scenario: Preis-Rating berechnen
- **WHEN** das System das Preis-Rating für ein Rezept berechnet
- **THEN** MUSS es den `cached_price_total` des Rezepts mit dem Durchschnittspreis aller Rezepte gleichen `recipe_type` vergleichen
- **THEN** MUSS das Rating 5 Äpfel vergeben wenn der Preis im unteren Quartil liegt, 4 Äpfel im zweiten Quartil, 3 im dritten, 2 im vierten und 1 wenn über dem 90. Perzentil

#### Scenario: Gesundheits-Rating berechnen
- **WHEN** das System das Gesundheits-Rating berechnet
- **THEN** MUSS es die `cached_nutri_class` des Rezepts direkt in Äpfel umwandeln: Klasse 1 (A) = 5 Äpfel, Klasse 2 (B) = 4, Klasse 3 (C) = 3, Klasse 4 (D) = 2, Klasse 5 (E) = 1
- **THEN** MUSS bei fehlender Nutri-Klasse `null` zurückgegeben werden

#### Scenario: Sättigungs-Rating berechnen
- **WHEN** das System das Sättigungs-Rating berechnet
- **THEN** MUSS es die Energiedichte pro Portion (`cached_energy_kj / servings`) mit dem DGE-Referenzwert für den Mahlzeitentyp vergleichen
- **THEN** MUSS das Rating 5 Äpfel vergeben wenn das Verhältnis zwischen 0.9 und 1.1 liegt (optimal sättigend), abnehmend für Abweichungen in beide Richtungen

#### Scenario: Geschmacks-Rating berechnen
- **WHEN** das System das Geschmacks-Rating berechnet
- **THEN** MUSS es Geschmacksträger analysieren: Fettgehalt (Mundgefühl), Zuckergehalt (Süße), Salzgehalt (Würze) und Ballaststoffe (Komplexität)
- **THEN** MUSS das Rating einen gewichteten Composite-Score aus diesen Faktoren bilden, normalisiert auf 1-5 Äpfel

### Requirement: Apfel-Rating API-Endpunkt

Das System MUSS einen API-Endpunkt bereitstellen, der das vollständige Apfel-Rating für ein Rezept zurückgibt.

#### Scenario: Rating abrufen
- **WHEN** ein GET-Request an `/api/recipes/{recipe_id}/apple-rating/` gesendet wird
- **THEN** MUSS die Response ein JSON-Objekt mit den Feldern `price` (object), `health` (object), `satiety` (object), `taste` (object) und `overall` (object) enthalten
- **THEN** MUSS jedes Dimensions-Objekt die Felder `score` (int 1-5), `label` (string, deutsch) und `details` (string, deutsch) enthalten

#### Scenario: Rating bei unvollständigen Daten
- **WHEN** ein Rezept keine gecachten Nährwertdaten hat
- **THEN** MUSS das System für betroffene Dimensionen `score: null` zurückgeben mit einer erklärenden `details`-Nachricht

### Requirement: Apfel-Rating Darstellung im Frontend

Das System MUSS das Apfel-Rating prominent oben auf der Rezept-Detailseite anzeigen.

#### Scenario: Rating-Anzeige auf Rezept-Detailseite
- **WHEN** ein User die Rezept-Detailseite öffnet
- **THEN** MUSS unter dem Rezeptbild eine Zeile mit 4 Rating-Boxen angezeigt werden
- **THEN** MUSS jede Box ein Icon, den Dimensionsnamen, die Äpfel-Anzeige (gefüllt/leer) und ein kurzes Label zeigen

#### Scenario: Tooltip mit Details
- **WHEN** ein User auf eine Rating-Box klickt oder hovert
- **THEN** MUSS ein Tooltip oder Popover die `details`-Erklärung und den Referenzwert-Vergleich anzeigen

### Requirement: Nutri-Score-Verbesserungsvorschläge

Das System MUSS unter der Gesundheits-Analyse 3 konkrete Vorschläge anzeigen, wie das Rezept einen Nutri-Score-Klasse besser erreichen kann.

#### Scenario: Verbesserungsvorschläge berechnen
- **WHEN** ein GET-Request an `/api/recipes/{recipe_id}/nutri-improvements/` gesendet wird
- **THEN** MUSS das System für jeden Nutri-Score-Parameter simulieren, welche Änderung den Score am meisten verbessert
- **THEN** MUSS es die 3 wirksamsten Parameteränderungen zurückgeben, jeweils mit: Parameter-Name, aktuellem Wert, Zielwert, betroffene Zutaten (die am meisten zu dem Parameter beitragen) und erwarteter neuer Nutri-Score-Klasse

#### Scenario: Rezept hat bereits Nutri-Score A
- **WHEN** ein Rezept bereits Nutri-Score-Klasse A (1) hat
- **THEN** MUSS das System eine leere Liste zurückgeben mit einer Nachricht „Dieses Rezept hat bereits die beste Nutri-Score-Klasse"

#### Scenario: Darstellung im Frontend
- **WHEN** die Gesundheits-Analyse-Sektion auf der Rezept-Detailseite aufgeklappt wird
- **THEN** MÜSSEN die 3 Vorschläge als interaktive Karten angezeigt werden
- **THEN** MUSS jede Karte den Parameter, die Änderungsrichtung (weniger/mehr), die betroffene(n) Zutat(en) und einen „Anwenden"-Button enthalten

### Requirement: Referenzwert-Vergleiche

Das System MUSS alle Nährwertanzeigen im Kontext von DGE-Referenzwerten darstellen.

#### Scenario: Nährwert mit Referenz anzeigen
- **WHEN** ein Nährwert auf der Rezept-Detailseite angezeigt wird
- **THEN** MUSS neben dem absoluten Wert auch der prozentuale Anteil am DGE-Tagesbedarf angezeigt werden (basierend auf der Norm-Person: 15 Jahre, männlich, PAL 1.5)
- **THEN** MUSS die Darstellung farbcodiert sein: grün (≤50% des Tagesbedarfs), gelb (50-80%), rot (>80%) für Nährstoffe die begrenzt werden sollen (Zucker, Salz, ges. Fett) und invertiert für Nährstoffe die ausreichend vorhanden sein sollen (Ballaststoffe, Protein)
