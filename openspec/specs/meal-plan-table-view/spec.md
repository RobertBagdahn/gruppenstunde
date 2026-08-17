# meal-plan-table-view Specification

## Purpose

Tabellarische Darstellung des Essensplans mit Direktbearbeitung.

## Requirements

### Requirement: Tabellarisches Grid

Die Detailseite SHALL einen Tab „Tabelle“ mit `<table>` anbieten: geplante Tage als Spalten,
alle aktiven Mahlzeittypen einschließlich `drinks` als Zeilen. Mehrere Snacks eines Tages
stehen untereinander. Auf schmalen Bildschirmen ist die Tabelle horizontal scrollbar und die
erste Spalte bleibt sticky.

#### Scenario: Getränkezeile
- **WHEN** ein Plan einen Getränke-Slot enthält
- **THEN** zeigt die Tabelle eine lokalisierte Getränkezeile

### Requirement: Leere Slots und Bearbeitung

Leere, zeitlich gültige Slots SHALL ein Aktionsmenü für Rezept, Zutat und Notiz zeigen. Die Aktion
legt den Slot an und öffnet den passenden Editor. Bestehende Items bieten Faktor-, Notiz- und
Entfernen-Controls; alle Aktionen respektieren die serverseitigen Berechtigungen.

#### Scenario: Leerer Slot
- **WHEN** ein gültiger Slot leer ist
- **THEN** zeigt er das Aktionsmenü und legt den Slot bei Auswahl an

### Requirement: Zeitlich ungültige Slots

Slots außerhalb des Planzeitraums am ersten oder letzten Tag SHALL grau, nicht interaktiv und
ohne „Mahlzeit leer“-Warnung dargestellt.

#### Scenario: Slot außerhalb des Zeitraums
- **WHEN** ein Slot am ersten oder letzten Tag zeitlich nicht im Plan liegt
- **THEN** ist er grau und nicht interaktiv

### Requirement: Tagesbilanz

Der Footer SHALL pro Tag kcal-, Kosten- und Coverage-Werte anzeigen. Getränke zählen zu Kosten
und Einkaufsliste, aber nicht zur Tages-kcal-Bilanz. Kosten pro Person und alle Mahlzeitwerte
verwenden `effective_portions`; ein konfiguriertes Budget wird gegen die entsprechend
skalierte Tagesabdeckung geprüft.

#### Scenario: Getränke in der Tagesbilanz
- **WHEN** ein Tag ein Getränk enthält
- **THEN** fließen dessen Kosten ein, nicht aber dessen kcal in die Tagesbilanz
