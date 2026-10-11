## 1. Bestand und Abgrenzung

- [x] 1.1 Bestehende Omnibar-Spezifikation prüfen: fünf Treffer pro Gruppe und „Alle anzeigen“ sind bereits festgelegt.
- [x] 1.2 Bestehende Buffet-Builder-Spezifikation prüfen: eine Suche pro aktiver Rolle ist bereits festgelegt.
- [x] 1.3 Notizen und Brötchen-Stückzahlschätzungen als Wünsche, nicht als reproduzierte Bugs, einordnen.

## 2. Offene Produktentscheidungen

- [x] 2.1 Geltungsbereich der Notizen festlegen: Zutaten, Rezepte oder beides. – Erledigt durch die Main-Spec `meal-item-note` (Umsetzung `MealItem.note`, auch in `peter-food-feedback-fixes` 6.x): Notizen hängen an Einzelzutaten-MealItems im Essensplan.
- [x] 2.2 Anzeigeorte und Sichtbarkeit/Berechtigungen für Notizen festlegen. – Erledigt durch `meal-item-note`: Plan-Zeile (Tages- und Tabellenansicht), Hinzufügen-Dialog und Essensplan-PDF; ändern nur mit Bearbeitungsrecht.
- [ ] 2.3 Verlässliche Brötchen-Portionsgewichte bestätigen und Quelle dokumentieren; ohne Bestätigung keine Schätzung implementieren.

## 3. Manuelle Prüfung

- [x] 3.1 Omnibar mit mehr als fünf Treffern pro Gruppe prüfen: maximal fünf pro Gruppe in „Alle“ und „Alle anzeigen“ öffnet die vollständige Kategorie (vom Nutzer als vorhanden und getestet bestätigt; automatisierter Regressionstest ist ebenfalls vorhanden).

Peters Plan-/Rollenfall im Buffet-Builder (früher 2.4 und 3.2–3.4) wird seit 2026-10-11 ausschließlich in `peter-food-feedback-exploration` (Tasks 2.3, 2.3a und 3.2) geführt.

## 4. Umsetzung nach Klärung

- [x] 4.1 Erst nach Abschluss von 2.1–2.2 eine separate Spezifikation und Umsetzung für Notizen erstellen. – Erledigt: Main-Spec `meal-item-note`, Umsetzung `MealItem.note` (Migration `planner.0013`).
- [ ] 4.2 Erst nach Abschluss von 2.3 fachliche Stückzahlschätzung spezifizieren; nur bestätigte Gewichte verwenden und Unverfügbarkeit transparent behandeln. – Hinweis: `peter-food-feedback-fixes` (`buffet-piece-estimate`) zeigt die Näherung bereits nur bei bestätigtem/importiertem Stückgewicht; offen bleibt, ob die Brötchen-Gewichte in den Daten bestätigt sind (2.3).
