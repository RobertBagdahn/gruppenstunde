## ADDED Requirements

### Requirement: Dedizierte Druckansicht für Rezepte

Das System SHALL eine dedizierte `/recipes/:slug/print`-Route bereitstellen, die eine druckoptimierte Ansicht des Rezepts rendert — kein simples `@media print` CSS.

#### Scenario: Druckansicht öffnen

- **WHEN** ein Nutzer `/recipes/:slug/print` aufruft
- **THEN** wird eine druckoptimierte Seite gerendert ohne App-Navigation, Sidebar oder interaktive Elemente
- **THEN** alle Sektionen (Zutaten, Zubereitung, Nährwerte) sind ausgeklappt und vollständig sichtbar
- **THEN** die Seite ist A4-Format optimiert mit sinnvoller Typografie

#### Scenario: Drucken-Button auf Rezeptdetailseite

- **WHEN** ein Nutzer die Rezeptdetailseite aufruft
- **THEN** gibt es einen „Drucken"-Button der `/recipes/:slug/print` in einem neuen Tab öffnet

#### Scenario: Zubereitung immer ausgeklappt

- **WHEN** die Druckansicht gerendert wird
- **THEN** ist die Zubereitungsanleitung vollständig sichtbar (kein Accordion, kein „Mehr anzeigen")
- **THEN** alle Zubereitungsschritte sind als nummerierte Liste dargestellt

#### Scenario: Portionsskala in Druckansicht

- **WHEN** die Druckansicht gerendert wird
- **THEN** werden die Zutaten für die Standard-Portionszahl (1 Portion) angezeigt
- **THEN** die Portionszahl ist im Druckkopf sichtbar
