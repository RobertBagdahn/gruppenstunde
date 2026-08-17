# Recipe Detail Page — Cleanup Delta

Dieses Delta räumt die Rezept-Detailseite auf, entfernt das Inspi-Score-Feature und die redundanten Recipe-Checks vollständig, ändert die obere Info-Box (vorher "Normportionen") in eine Nutri-Score-Badge + Gesamtkosten-Darstellung und führt eine einklappbare Zubereitungs-Section ein.

## REMOVED Requirements

### Requirement: Inspi-Score Berechnung

**Reason**: Die vier Dimensionen Preis, Gesundheit, Sättigung und Geschmack wurden als nicht sinnvoll bewertet. Preis, Sättigung und Geschmack sind subjektiv bzw. stark kontextabhängig, die Gesundheits-Dimension dupliziert nur den bereits existierenden Nutri-Score. Ein weiteres proprietäres Bewertungssystem neben Nutri-Score schafft Verwirrung statt Mehrwert.

**Migration**: Keine Migration im Daten-Sinne nötig — das Feature basiert ausschließlich auf bereits bestehenden gecachten Nährwert- und Preisfeldern. Frontend-Konsumenten des `/api/recipes/{id}/inspi-score/`-Endpunkts müssen entfernt werden; der Endpunkt wird mit diesem Change ersatzlos gelöscht. Für Gesundheitsbewertung bleibt der Nutri-Score (Klasse A–E) als einziges System bestehen und wird künftig prominenter in der oberen Info-Box angezeigt.

### Requirement: Inspi-Score API-Endpunkt

**Reason**: Wird mit dem Inspi-Score-Feature entfernt (siehe oben).

**Migration**: `GET /api/recipes/{id}/inspi-score/` liefert künftig 404. Keine Ersatz-API nötig — die zugrundeliegenden Daten (Nutri-Klasse, Preis, Energiedichte) sind bereits über den Recipe-Detail-Endpunkt verfügbar.

### Requirement: Inspi-Score Darstellung im Frontend

**Reason**: Wird mit dem Inspi-Score-Feature entfernt (siehe oben).

**Migration**: Die Komponente `frontend/src/components/recipe/InspiScore.tsx` wird gelöscht. Die zugehörige Position oben auf der Rezept-Detailseite wird durch die neu gestaltete Info-Box mit Nutri-Score-Badge ersetzt (siehe MODIFIED Requirement "Rezept-Detailseite Header Info-Box").

## MODIFIED Requirements

### Requirement: Rezept-Detailseite Header Info-Box

The system SHALL render a compact header info box above the ingredient list on the recipe detail page. Das System MUSS auf der Rezept-Detailseite oberhalb der Zutatenliste eine kompakte Header-Info-Box anzeigen, die den Nutri-Score als primäres Gesundheitssignal und die Gesamtkosten als neutralen Fakt kommuniziert. Der PortionScaler MUSS direkt darunter funktional bleiben. Die bisherige erklärende Normportionen-Textbox entfällt; der Normportionen-Kontext bleibt ausschließlich im bestehenden Simulator-Banner (ratio > 1.5) erhalten.

#### Scenario: Nutri-Score Badge in der Info-Box

- **WHEN** die Rezept-Detailseite geladen wird und `cached_nutri_class` gesetzt ist
- **THEN** MUSS die Header-Info-Box ein Nutri-Score-Badge (A–E, farbcodiert) prominent darstellen
- **THEN** MUSS das Badge das einzige Nutri-Score-Signal im oberen Bereich der Seite sein (keine zweite Nutri-Score-Darstellung oberhalb der Zutaten)

#### Scenario: Gesamtkosten-KPI

- **WHEN** die Rezept-Detailseite geladen wird und `cached_price_total` gesetzt ist
- **THEN** MUSS die Header-Info-Box die Gesamtkosten in EUR als neutralen Fakt anzeigen (z.B. „Gesamtkosten: 8,40 €")
- **THEN** DARF die Gesamtkosten-KPI kein Rating, keine Ampel und keinen Vergleich zu anderen Rezepten enthalten
- **THEN** MUSS die frühere KPI-Box "Kosten pro Person" entfernt sein

#### Scenario: Keine Normportionen-Erklärbox

- **WHEN** die Rezept-Detailseite geladen wird
- **THEN** DARF kein erklärender Textblock „Dieses Rezept ist berechnet für X Normportion(en). Eine Normportion basiert auf einem 15-jährigen Pfadfinder (PAL 1,5)." mehr angezeigt werden
- **THEN** MUSS der PortionScaler weiterhin ohne erklärenden Kontext-Hinweis funktionieren
- **THEN** MUSS das bestehende Normportions-Simulator-Banner (erscheint bei `ratio > 1.5` mit „Auf Normportion skalieren"-Button) unverändert erhalten bleiben

#### Scenario: "pro Portion"-Text in KPI-Blöcken

- **WHEN** KPI-Blöcke der Preis-Analyse, Gewichtsanalyse oder Gesundheitsindikatoren gerendert werden
- **THEN** DARF der Zusatz „pro Portion" in diesen Blöcken nicht mehr erscheinen
- **THEN** MUSS der Zusatz „pro Portion" im Makronährstoff-/Nährwert-Breakdown erhalten bleiben (dort sinnvoller Referenzkontext)

#### Scenario: Portionen-Badge in Kacheln

- **WHEN** ein Rezept in der Listenansicht als Kachel angezeigt wird
- **THEN** MUSS der Portionen-Badge entfernt sein (unverändert gegenüber vorheriger Spec)

## ADDED Requirements

### Requirement: Einklappbare Zubereitungs-Section

The preparation section SHALL be rendered as a collapsible `AnalysisSection`. Die Zubereitungs-Section (Markdown-`description`) auf der Rezept-Detailseite MUSS als einklappbare Section im Stil der übrigen `AnalysisSection`-Blöcke gerendert werden, um auf kleinen Viewports Scrollaufwand zu reduzieren.

#### Scenario: Default-Zustand auf Mobile

- **WHEN** die Rezept-Detailseite auf einem Viewport < 1024px Breite geladen wird
- **THEN** MUSS die Zubereitungs-Section eingeklappt sein
- **THEN** MUSS der Section-Header (Icon + Titel „Zubereitung") weiterhin sichtbar sein

#### Scenario: Default-Zustand auf Desktop

- **WHEN** die Rezept-Detailseite auf einem Viewport ≥ 1024px Breite geladen wird
- **THEN** MUSS die Zubereitungs-Section ausgeklappt sein

#### Scenario: Nutzer klappt Section manuell

- **WHEN** ein Nutzer den Section-Header anklickt
- **THEN** MUSS der Ein-/Ausklappzustand wechseln
- **THEN** MUSS die manuelle Interaktion Vorrang vor dem Viewport-basierten Default haben

### Requirement: Entfernung der Zubereitungsanalyse-Section

The preparation analysis section SHALL be removed. Die bisherige „Zubereitungsanalyse"-Section (eine `AnalysisSection`, die die KPI-Boxen von weiter oben spiegelt) MUSS vollständig von der Rezept-Detailseite entfernt sein, da sie keinen zusätzlichen Informationswert liefert.

#### Scenario: Seite enthält keine Zubereitungsanalyse mehr

- **WHEN** die Rezept-Detailseite gerendert wird
- **THEN** DARF keine Section mit dem Titel „Zubereitungsanalyse" mehr existieren
- **THEN** MÜSSEN alle zuvor ausschließlich in dieser Section genutzten Hilfskomponenten-Imports aus `RecipeDetailPage.tsx` entfernt sein
