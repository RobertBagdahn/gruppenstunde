## MODIFIED Requirements

### Requirement: Rezept-Detailseite zeigt vollständige Analyse (MODIFIED)
Die Rezept-Detailseite SHALL unter `/recipes/:slug` das Rezept in folgender Sektions-Reihenfolge anzeigen: Titel + kompakte Summary → Source-URL → Bild/Placeholder → Zutaten → Zubereitung (default geschlossen) → Themen/Allergene → Analyse-Tabs (mit Histogrammen) → Rezeptregeln → Ähnliche → Emotionen → Comments. Die Beschreibung SHALL ausschließlich einmal als kompakte Summary unter dem Titel dargestellt werden; eine separate `summary_long`-Box SHALL NICHT mehr gerendert werden. Der Autor SHALL ausschließlich in der Seitenleiste dargestellt werden; eine separate Autor-Sektion im Hauptfeed SHALL NICHT mehr gerendert werden. Die Metadaten SHALL in der reichhaltigen Seitenleiste dargestellt werden (kein Inline-Header, kein RecipeMetaCard als separates Element). Jedes persönliche Rezept SHALL ohne Laufzeitfehler dargestellt werden (Badge-Variante `personal` unterstützt).

#### Scenario: Nutzer öffnet Rezept-Detailseite
- **WHEN** ein Nutzer `/recipes/:slug` aufruft
- **THEN** werden die Sektionen in der definierten Reihenfolge angezeigt
- **THEN** die Zubereitung ist default eingeklappt

#### Scenario: Persönliches Rezept ohne Crash
- **WHEN** ein Nutzer ein Rezept mit `recipe_badge="personal"` öffnet
- **THEN** wird die Seite ohne Laufzeitfehler gerendert und der passende Badge angezeigt

#### Scenario: NutriScore-Anzeige
- **WHEN** das Rezept einen cached_nutri_class-Wert hat
- **THEN** wird der NutriScore als farbiger Badge angezeigt

#### Scenario: Preis-Anzeige
- **WHEN** das Rezept einen cached_price_total-Wert hat
- **THEN** wird der Gesamtpreis im Analyse-Tab "Preis" angezeigt

#### Scenario: Portionen skalieren
- **WHEN** der Nutzer die Portionszahl ändert
- **THEN** werden Zutatenliste und Preise entsprechend umgerechnet (pro Portion und gesamt)

#### Scenario: Mobile Layout
- **WHEN** die Viewport-Breite < 768px ist
- **THEN** wird das Layout gestapelt dargestellt mit konsolidierter Action-Bar am unteren Rand

## ADDED Requirements

### Requirement: Analyse-Histogramme mit Perzentil-Position
Die Analyse-Tabs SHALL für Preis pro Portion (Preis-Tab), Kalorien pro Portion und Protein pro Portion (Inhaltsstoffe-Tab) je ein Histogramm der Verteilung über alle veröffentlichten Rezepte desselben `recipe_type` anzeigen. Das Histogramm SHALL die Position des aktuellen Rezepts markieren und eine neutrale Perzentil-Aussage (z.B. "günstiger als 83% der Getränke") ohne gut/schlecht-Wertung liefern. Das Histogramm SHALL nur angezeigt werden, wenn mindestens 10 andere veröffentlichte Rezepte desselben Typs existieren.

#### Scenario: Histogramm mit ausreichend Daten
- **WHEN** ein Nutzer einen Analyse-Tab öffnet und mindestens 10 Rezepte desselben Typs existieren
- **THEN** wird ein Histogramm mit der markierten Position des aktuellen Rezepts und einer neutralen Perzentil-Aussage angezeigt

#### Scenario: Zu wenige Rezepte
- **WHEN** weniger als 10 Rezepte desselben Typs existieren
- **THEN** wird kein Histogramm gerendert

#### Scenario: Neutrale Bewertung bei Kalorien
- **WHEN** das Kalorien-Histogramm angezeigt wird
- **THEN** erfolgt nur eine neutrale Perzentil-Aussage (mehr/weniger als X%), keine gut/schlecht-Wertung

### Requirement: Korrekte Cache-Invalidierung nach Mutationen
Nach Rezept-Mutationen (Item-Update, Fork, Sichtbarkeit, Emotion) SHALL das Frontend die tatsächlich verwendeten Query-Keys invalidieren: recipe-improvements, recipe-rules, recipe-comments, recipe-similar und recipe-type-stats.

#### Scenario: Daten nach Mutation aktuell
- **WHEN** ein Nutzer Zutaten ändert und speichert
- **THEN** zeigen Regeln-Box, Verbesserungsvorschläge, Kommentare und ähnliche Rezepte ohne manuelles Neuladen aktuelle Daten

### Requirement: Dezenter Bild-Placeholder ohne störenden Gradient
Bei fehlendem Titelbild SHALL ein kleiner, dezenter Placeholder (kompaktes Seitenverhältnis, gestrichelter Rahmen, helles Icon) angezeigt werden. Der dunkle Gradient-Overlay SHALL ausschließlich bei vorhandenem echten Bild gerendert werden, nicht beim leeren Placeholder.

#### Scenario: Rezept ohne Bild
- **WHEN** ein Rezept kein Titelbild hat
- **THEN** wird ein kleiner, dezenter Placeholder ohne dunklen Gradient-Overlay angezeigt

#### Scenario: Rezept mit Bild
- **WHEN** ein Rezept ein Titelbild hat
- **THEN** wird das Bild mit Gradient-Overlay (für Lesbarkeit von Overlay-Inhalten) angezeigt

### Requirement: Verständliche Erklärung bei nicht anwendbaren Rezeptregeln
Wenn Rezeptregeln für einen Rezepttyp nicht anwendbar sind (alle Typen außer warme/kalte Mahlzeit), SHALL das System eine erklärende Nachricht liefern, die den konkreten Rezepttyp benennt und begründet, warum eine isolierte Bewertung nicht aussagekräftig ist (Regeln bewerten vollständige Mahlzeiten; dieser Typ ist nur ein Baustein) und dass die Nährwerte erst im Essensplaner einfließen.

#### Scenario: Getränk-Rezept ohne anwendbare Regeln
- **WHEN** ein Nutzer ein Rezept vom Typ "Getränk" öffnet
- **THEN** wird eine Erklärung angezeigt, die den Typ "Getränk" namentlich nennt und begründet, warum keine isolierte Nährwert-Bewertung erfolgt
