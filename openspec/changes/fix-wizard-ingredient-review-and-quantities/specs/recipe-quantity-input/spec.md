# Recipe Quantity Input

## ADDED Requirements

### Requirement: Dezimale Mengen- und Faktor-Eingaben behalten Zwischenstände
Bearbeitbare Mengen- und Faktor-Felder im Food-Frontend SHALL Dezimal-Komma und Dezimal-Punkt unterstützen und den Rohtext während der Eingabe erhalten. Ein leerer oder noch ungültiger Zwischenstand MUST NOT während des Tippens durch einen Standardwert oder einen Mindestwert ersetzt werden. Ungültige Werte SHALL nicht in den gespeicherten Zustand übernommen werden; beim Verlassen des Feldes SHALL ein ungültiger Zwischenstand auf den zuletzt gültigen Wert zurückgesetzt werden.

#### Scenario: Rezeptschritt-Faktor schrittweise eingeben
- **WHEN** ein Nutzer im Rezeptschritt-Feld `0,6` eingibt
- **THEN** bleibt der Zwischenstand `0,` beim Tippen sichtbar
- **AND** der gültige Faktor `0.6` wird übernommen, sobald er vollständig ist

#### Scenario: Mengen- und Faktorgrenzen einhalten
- **WHEN** ein Nutzer einen Wert unterhalb des erlaubten Mindestwerts eingibt und das Feld verlässt
- **THEN** wird kein ungültiger Wert übernommen
- **AND** das Feld zeigt wieder den letzten gültigen Wert innerhalb der konfigurierten Grenzen

#### Scenario: Frühstücks- und Referenzmahlzeit-Faktoren eingeben
- **WHEN** ein Nutzer einen Dezimalfaktor für ein warmes Gericht, eine Extra-Zutat oder ein Referenzmahlzeit-Rezept eingibt
- **THEN** bleibt der eingegebene Rohtext während der Bearbeitung erhalten
- **AND** ein gültiger Wert wird als Zahl an den bestehenden State-Handler übergeben
