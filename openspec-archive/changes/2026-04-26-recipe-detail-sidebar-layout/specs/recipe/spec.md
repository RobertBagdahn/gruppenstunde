# Recipe Detail — Sidebar & Mobile Action Bar Delta

Dieses Delta führt auf Desktop ab 1024px eine sticky Sidebar mit persistenten Metadaten und Primäraktionen ein sowie auf Mobile eine sticky Bottom-Action-Bar. Die in Change #1 definierte Header-Info-Box wird responsiv: Inhalte wandern auf Desktop in die Sidebar.

## ADDED Requirements

### Requirement: Desktop-Sidebar auf Rezept-Detailseite

The system SHALL render a sticky right sidebar on the recipe detail page for viewports with width ≥ 1024px. Das System MUSS auf der Rezept-Detailseite ab einer Viewport-Breite von 1024px eine rechte Sidebar mit fester Breite rendern, die beim Scrollen sticky bleibt und die wichtigsten Metadaten und Primäraktionen persistent sichtbar hält.

#### Scenario: Sidebar-Layout auf Desktop

- **WHEN** die Rezept-Detailseite auf einem Viewport ≥ 1024px geladen wird
- **THEN** MUSS die Seite in einem zweispaltigen Grid gerendert werden: Hauptinhalt links (flexibel), Sidebar rechts (320px Breite)
- **THEN** MUSS die Sidebar `position: sticky` mit `top: 80px` relativ zum Viewport haben
- **THEN** MUSS die Sidebar bei Inhalten, die länger als der verbleibende Viewport sind, intern scrollbar sein (`max-height: calc(100vh - 5rem); overflow-y: auto`)

#### Scenario: Sidebar-Inhalte

- **WHEN** die Sidebar gerendert wird
- **THEN** MUSS sie in dieser Reihenfolge enthalten: (1) Hero-Metadaten-Block (Rezepttyp-Badge, Autor-Link, Zubereitungszeit, Schwierigkeit), (2) Nutri-Score-Badge A–E, (3) Gesamtkosten-KPI in EUR, (4) kompakter PortionScaler, (5) Primäraktionen-Gruppe („Einkaufsliste erstellen", „Teilen")
- **THEN** MUSS die Hero-Bild-Darstellung in der Hauptspalte verbleiben und nicht in der Sidebar auftauchen

#### Scenario: Sidebar entfällt auf Mobile

- **WHEN** die Rezept-Detailseite auf einem Viewport < 1024px geladen wird
- **THEN** DARF keine rechte Sidebar existieren
- **THEN** MUSS der Seiteninhalt einspaltig gerendert werden

### Requirement: Mobile Sticky-Action-Bar

The system SHALL render a sticky bottom action bar on the recipe detail page for viewports with width < 1024px. Das System MUSS auf Viewports < 1024px eine sticky Bottom-Action-Bar mit zwei Primäraktionen anzeigen, die respektvoll `safe-area-inset-bottom` berücksichtigt und bei aktivem Text-Input ausgeblendet wird.

#### Scenario: Bottom-Bar auf Mobile

- **WHEN** die Rezept-Detailseite auf einem Viewport < 1024px geladen wird
- **THEN** MUSS am unteren Rand eine sticky Bar mit zwei Buttons gerendert werden: „Einkaufsliste" und „Portionen"
- **THEN** MUSS die Bar eine Höhe von 64px haben plus `env(safe-area-inset-bottom)` Padding
- **THEN** MUSS der Hauptinhalt-Container unten so viel Padding haben, dass der letzte Inhalt nicht verdeckt wird

#### Scenario: Klick auf „Einkaufsliste"

- **WHEN** der Nutzer in der Bottom-Bar „Einkaufsliste" antippt
- **THEN** MUSS derselbe Dialog geöffnet werden, der auch vom bisherigen Header-Action ausgelöst wird (Portions-Dialog → Einkaufslisten-Export)

#### Scenario: Klick auf „Portionen"

- **WHEN** der Nutzer in der Bottom-Bar „Portionen" antippt
- **THEN** MUSS ein Bottom-Sheet mit dem PortionScaler geöffnet werden
- **THEN** MUSS die Skalierung live in der Zutatenliste reflektiert werden

#### Scenario: Bottom-Bar bei Text-Input ausblenden

- **WHEN** ein `<textarea>` auf der Seite den Fokus erhält (z.B. Kommentar-Input)
- **THEN** MUSS die Bottom-Bar per CSS-Transform nach unten verschoben werden (`translateY(100%)`) mit Transition
- **WHEN** der Fokus die `<textarea>` verlässt
- **THEN** MUSS die Bottom-Bar zurückkehren

#### Scenario: Bottom-Bar entfällt auf Desktop

- **WHEN** die Rezept-Detailseite auf einem Viewport ≥ 1024px geladen wird
- **THEN** DARF keine Bottom-Action-Bar gerendert werden

## MODIFIED Requirements

### Requirement: Rezept-Detailseite Header Info-Box

The recipe detail header info box SHALL be rendered only on viewports below 1024px; on larger viewports its content moves into the sidebar. Das System MUSS auf der Rezept-Detailseite oberhalb der Zutatenliste eine kompakte Header-Info-Box rendern, die Nutri-Score und Gesamtkosten anzeigt. Auf Viewports ≥ 1024px MUSS diese Box mittels `lg:hidden` ausgeblendet werden; ihre Inhalte werden stattdessen in der neuen Desktop-Sidebar dargestellt. Auf Viewports < 1024px bleibt die Box wie in Change #1 definiert sichtbar.

#### Scenario: Header-Info-Box auf Mobile

- **WHEN** die Rezept-Detailseite auf einem Viewport < 1024px geladen wird
- **THEN** MUSS die Header-Info-Box mit Nutri-Score-Badge und Gesamtkosten-KPI oberhalb der Zutatenliste sichtbar sein

#### Scenario: Header-Info-Box auf Desktop

- **WHEN** die Rezept-Detailseite auf einem Viewport ≥ 1024px geladen wird
- **THEN** MUSS die Header-Info-Box unsichtbar sein (CSS `lg:hidden`)
- **THEN** MÜSSEN Nutri-Score-Badge und Gesamtkosten-KPI stattdessen in der rechten Sidebar gerendert werden

#### Scenario: Keine Normportionen-Erklärbox

- **WHEN** die Rezept-Detailseite auf irgendeinem Viewport geladen wird
- **THEN** DARF kein erklärender Textblock „Dieses Rezept ist berechnet für X Normportion(en). …" mehr angezeigt werden (unverändert gegenüber Change #1)

#### Scenario: "pro Portion"-Text in KPI-Blöcken

- **WHEN** KPI-Blöcke der Preis-Analyse, Gewichtsanalyse oder Gesundheitsindikatoren gerendert werden
- **THEN** DARF der Zusatz „pro Portion" in diesen Blöcken nicht mehr erscheinen (unverändert gegenüber Change #1)
- **THEN** MUSS der Zusatz „pro Portion" im Makronährstoff-/Nährwert-Breakdown erhalten bleiben (unverändert gegenüber Change #1)
