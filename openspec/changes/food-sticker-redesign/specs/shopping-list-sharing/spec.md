# Spec Delta

## MODIFIED Requirements

### Requirement: Einkaufsmodus
Die Detailseite SHALL einen Einkaufsmodus bieten (Korb-Button im Seitenkopf, `aria-pressed`), der pro Gerät gespeichert wird (`localStorage`-Schlüssel `inspi.shopping.shopMode`). Im Einkaufsmodus MUST die Liste nur die Einträge mit großen Bedienflächen zeigen: Checkbox mindestens 56 px, Eintragsnamen in der größeren Schriftstufe. Teilen-Karte, Teilen-Button, Löschen-Button, Gast-Banner, Quellen-Hinweis, Mengenwarnungen, „Alle Rezepte anzeigen“, Materiallisten-Link, Gesamtpreis, REWE-Export, Küchenbedarf, Mitgliederbereich und die Herkunftszeile unter den Einträgen MUST ausgeblendet sein; Zuständigkeit und Abhaken bleiben bedienbar.

#### Scenario: Modus einschalten
- **WHEN** der Nutzer den Korb-Button wählt
- **THEN** verschwinden die Verwaltungsbereiche und die Einträge erscheinen mit großen Checkboxen

#### Scenario: Modus bleibt erhalten
- **WHEN** der Nutzer die Seite neu lädt
- **THEN** bleibt der Einkaufsmodus aktiv

#### Scenario: Modus beenden
- **WHEN** der Nutzer den Korb-Button erneut wählt
- **THEN** erscheint die volle Ansicht

#### Scenario: Bedienflächen auf dem Handy
- **WHEN** der Einkaufsmodus auf 390 px Breite aktiv ist
- **THEN** haben Checkbox und Eintragszeile mindestens 56 px Höhe und die Seite scrollt nicht horizontal
