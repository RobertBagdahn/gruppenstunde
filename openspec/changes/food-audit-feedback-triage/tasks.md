## 1. Bestand und Abgrenzung

- [x] 1.1 Bestehende Omnibar-Spezifikation prüfen: fünf Treffer pro Gruppe und „Alle anzeigen“ sind bereits festgelegt.
- [x] 1.2 Bestehende Buffet-Builder-Spezifikation prüfen: eine Suche pro aktiver Rolle ist bereits festgelegt.
- [x] 1.3 Notizen und Brötchen-Stückzahlschätzungen als Wünsche, nicht als reproduzierte Bugs, einordnen.

## 2. Offene Produktentscheidungen

- [ ] 2.1 Geltungsbereich der Notizen festlegen: Zutaten, Rezepte oder beides.
- [ ] 2.2 Anzeigeorte und Sichtbarkeit/Berechtigungen für Notizen festlegen.
- [ ] 2.3 Verlässliche Brötchen-Portionsgewichte bestätigen und Quelle dokumentieren; ohne Bestätigung keine Schätzung implementieren.
- [ ] 2.4 Peters konkreten Plan-/Rollenfall mit Plan/Testdaten, Benutzerrolle, Mahlzeit, Buffet-Rolle, Suchbegriff und erwartetem Ergebnis beschreiben.

## 3. Manuelle Prüfung

- [x] 3.1 Omnibar mit mehr als fünf Treffern pro Gruppe prüfen: maximal fünf pro Gruppe in „Alle“ und „Alle anzeigen“ öffnet die vollständige Kategorie (vom Nutzer als vorhanden und getestet bestätigt; automatisierter Regressionstest ist ebenfalls vorhanden).
- [ ] 3.2 Buffet-Builder-Suche mit Peters bestätigtem Plan-/Rollenfall manuell ausführen; Auswahl speichern und Wiederöffnung prüfen.
- [ ] 3.3 Ergebnis, Testdaten und tatsächliches Verhalten dokumentieren. Nur reproduzierbare Abweichungen als Bug einstufen.
- [ ] 3.4 Falls ein Bug reproduziert wird, separates OpenSpec-Bugfix mit klaren Reproduktionsschritten und Soll-Verhalten anlegen.

## 4. Umsetzung nach Klärung

- [ ] 4.1 Erst nach Abschluss von 2.1–2.2 eine separate Spezifikation und Umsetzung für Notizen erstellen.
- [ ] 4.2 Erst nach Abschluss von 2.3 fachliche Stückzahlschätzung spezifizieren; nur bestätigte Gewichte verwenden und Unverfügbarkeit transparent behandeln.
