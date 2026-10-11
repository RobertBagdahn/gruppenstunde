# Untersuchung und Reproduktion — keine Implementierung

## 1. Bestandsaufnahme

- [x] 1.1 Peters Screenshot- und Chat-Rückmeldungen in P-01 bis P-12 inventarisieren und als Bug, Wunsch, unbestätigt oder separates Infrastrukturthema kennzeichnen.
- [x] 1.2 Relevante Frontend-/Backend-Stellen für Essensplan-Items, Kopieren, Frühstücks-Extras, Buffet-Suche, Zahleneingaben und Portions-Zauberstab prüfen.
- [x] 1.3 Cloud-Run- und Cloud-SQL-Logs lesend auf den gemeldeten Portions-500 sowie gleiche Constraint-Fehler untersuchen; keine persönlichen Kennungen oder Request-Bodies in die Artefakte übernehmen.
- [x] 1.4 Überschneidungen mit den aktiven OpenSpec-Changes `buffet-free-selection`, `unified-buffet-wizard`, `fix-wizard-ingredient-review-and-quantities` und `fix-wizard-preview-units` erfassen.

## 2. Noch zu reproduzieren

- [x] 2.1 P-02: Kopieren mit unterschiedlichen Quell-/Ziel-Norm-Portionen reproduzieren; fehlende `portion`-Übernahme in beiden Kopierpfaden gefunden und mit Tests abgesichert.
- [x] 2.2 P-03: Fehlenden Portionswechsel und falsche Grammformatierung reproduziert; API, Tages-/Tabellenansicht und Regressionstests ergänzt.
- [ ] 2.3 P-05: Im Produktions-/Test-UI eine gespeicherte Buffet-Auswahl wieder öffnen, Belag entfernen/ersetzen, Suche ab zwei Zeichen und Trefferfilter prüfen; vorhandene Feature-Verfügbarkeit und Berechtigungen dokumentieren.
- [x] 2.4 P-07/P-08: Fehlendes Namen-/Portionen-Roundtrip im Frühstücks-Wizard reproduziert; Zustand, UI, Single-/Bulk-API und Regressionstests ergänzt.
- [x] 2.5 P-09: Kontrollierte Mengenfelder in Rezept-Schritt und Zutaten-Dialogen als Ursache reproduziert; leere/Null-/Dezimaleingaben bleiben editierbar und werden vor Übernahme validiert.
- [x] 2.6 P-10: Rang-1-Konflikt anhand der Cloud-Run-Logs und mit Backend-Test reproduziert; freie Rangwahl, atomarer Rollback und Konfliktantwort ergänzt.
- [ ] 2.7 P-11: Nicht reagierende Assistenten-Schaltfläche mit Peters Browser, Viewport, MealType, Planzustand und Bearbeitungsrecht reproduzieren; Route, Browserkonsole und Netzwerkresultat festhalten.
- [ ] 2.8 P-12: Zeitraum nach dem 02.10.2026 auf erneute DB-Verbindungslimit-Fehler untersuchen und Cloud-Run-/Cloud-SQL-Konfiguration samt aktuellem Status prüfen.

## 3. Produktfragen und Abschluss

- [x] 3.1 P-01: Notizen als MealItem-Notizen in Tages- und Tabellenansicht umsetzen; Einkaufslisten/PDFs bewusst nicht einbezogen.
- [ ] 3.2 P-04/P-05: Produktverhalten und gewünschte Akzeptanzkriterien mit Peter abstimmen; bestehende Suche-/Buffet-Bedienung im konkreten Produktionskontext prüfen.
- [x] 3.3 Alle Punkte als reproduzierter Bug, Produktwunsch, erwartetes Verhalten, nicht reproduzierbar oder weitere Angaben nötig abschließend klassifizieren.
- [x] 3.4 Für bestätigte, voneinander unabhängige Themen abgegrenzte Implementierungs-Changes und Given/When/Then-Anforderungen erstellen; bestehende Changes aktualisieren statt doppelte Anforderungen anzulegen.
- [x] 3.5 Bei allen Folgearbeiten Backend-Pydantic- und Food-Frontend-Zod-Verträge synchron halten, passende Regressionstests ergänzen und Produktionsänderungen separat freigeben.
