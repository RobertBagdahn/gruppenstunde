# Design: bestätigte Food-Audit-Quick-Wins

## Entscheidungen

- PDF-Ausgaben formatieren gecachte Decimal-Preise erst beim Eintritt in die bestehende Float-basierte PDF-Berechnung. Rezept-Nährwerte pro Portion beziehen sich auf die gespeicherte Normportion; eine temporäre Export-Portionszahl skaliert Zutaten, ändert aber nicht die fachliche Nährwertdefinition pro Portion.
- MealItem-Faktoren und abgeleitete Servings müssen positiv sein. Erstellungs- und Aktualisierungsschemas lehnen ungültige Werte mit 422 ab.
- Content-Titel werden an der API validiert; Rezepttypen werden gegen die erlaubten Choice-Werte geprüft und Fehler verständlich formuliert.
- Der Frühstücks-Wizard benötigt eine aktive Basis-Auswahl. Ein leerer Katalog bietet eine Aktion zum Erstellen einer Basis; Nährwertanzeigen dürfen fehlende Daten nicht als belastbare Summen ausgeben.
- Vorschautexte werden als Markdown gerendert. Zutateneditor-Zeilen umbrechen auf kleinen Displays.
- Gewichtsrundung verwendet kaufmännisches Runden auch im kg-Bereich; Frontend und Backend teilen dieselben Grenzwert-Fixtures.

## Grenzen

Keine Einkaufslisten-Aktualisierung bestehender Listen, umfassenden Parameter-Obergrenzen, direkte Gramm-Zeilen-Architektur oder Katalogbereinigung. Die gemeldeten UI-Kleinigkeiten werden nur an den konkret gefundenen Food-Views korrigiert.
