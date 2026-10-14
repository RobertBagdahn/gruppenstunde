# Tasks

## 1. Backend: Portions-Zauberstab

- [x] 1.1 Bei neu angelegten Portionen bestehenden Rang 1 erhalten und einen freien Rang für neue Portionen bestimmen.
- [x] 1.2 Verbleibende Rang-1-Constraint-Verletzungen kontrolliert als HTTP 409 beantworten; atomaren Rollback sicherstellen.
- [x] 1.3 Regressionstest mit vorhandener gewichteter Rang-1-Portion und neuem `Stück`-Vorschlag ergänzen.

## 2. Backend: Frühstücks-Portionen

- [x] 2.1 Im Single-Wizard-Endpoint gewählte Portion aus `portion_id` auflösen, zur Zutat validieren und am MealItem speichern.
- [x] 2.2 Dasselbe Verhalten für den Bulk-Wizard-Endpunkt umsetzen.
- [x] 2.3 Tests für Happy Path, ungültige/fremde Portion und atomaren Bulk-Speicher ergänzen.

## 3. Food-Frontend: Frühstücks-Extras

- [x] 3.1 Extra-Zustand um gewählte Portion und sichtbaren Namen ergänzen, ohne die Gramm-basierte kcal-Berechnung zu verfälschen.
- [x] 3.2 Portion, Menge und Einheit beim Erstellen/Speichern der Wizard-Items übertragen.
- [x] 3.3 Round-trip-Tests für extraIngredientNames und Portionen ergänzen.
- [x] 3.4 Frei gesuchte Extras außerhalb des Katalogs behalten Portion und bleiben beim Wiederöffnen erhalten (WP-03; Browser-Prüfung 2026-10-11: Tomatenmark 2 EL, Gurkenwasser 2 Glas).

## 4. Food-Frontend: Mengen- und Einheitenanzeige

- [x] 4.1 Kontrollierte Mengen-Dialoge während der Eingabe leeren und bearbeiten lassen; erst bei Bestätigung positive Werte verlangen.
- [x] 4.2 Tests für temporär leere Werte und gültige Dezimalwerte ergänzen.
- [x] 4.3 Gramm-/Milliliter-Aliase in MealSlot als direkte Masseeinheiten formatieren; Tests ergänzen.
- [x] 4.4 Einheitenwechsel für Einzelzutaten in Tages- und Tabellenansicht anbieten; ein Wechsel ohne neue Menge wird sofort mit konstantem Gewicht gespeichert (Backend rechnet über `resolve_grams` um, drei Nachkommastellen, z. B. 55 g → 0,55 Stück) und mit „Einheit geändert“/„Rückgängig“ bestätigt.
- [x] 4.5 Regressionstests für Einheitenwechsel mit konstantem Gewicht, Rückgängig, Einheit ohne Gewicht, View-only und ungültige/fremde Portion ergänzen.

## 5. Kopierverhalten und Abschluss

- [x] 5.1 Beide Kopierpfade (Einträge kopieren und gesamten Plan duplizieren) um Portion und Buffet-/Frühstücksmetadaten erweitern.
- [x] 5.2 Backend-Copy-Tests mit Menge, Portion, Einheit, Faktor, Anzeigename und Variantendaten ergänzen.
- [x] 5.3 Den Copy-Flow mit unterschiedlichen Normportionen reproduzieren; nur bei verbleibendem Fehler weitere Anzeige-/Skalierungsursachen korrigieren.
- [x] 5.4 Nach den Erweiterungen geänderte Dateien mit Frontend-Tests/Typecheck und gezielten `uv run pytest`-Tests validieren; anschließend Migration-Check ausführen.
- [x] 5.5 Offene Wünsche aus der Explore getrennt halten, sofern für sie fachliche Akzeptanzkriterien fehlen.

## 6. Einzelnotizen an MealItems

- [x] 6.1 `MealItem.note` als optional befüllbares CharField (max. 500 Zeichen, leerer Default) ergänzen und additive Migration erstellen.
- [x] 6.2 `MealItemOut`/Zod und `MealItemUpdateIn` synchron erweitern; Update-API soll leere Notizen speichern können.
- [x] 6.3 Notizen in Tages- und Tabellenansicht anzeigen, hinzufügen, ändern und löschen; View-only nur lesend.
- [x] 6.4 Einzel-Item-Kopie und Plan-Duplikation erhalten die Item-Notiz.
- [x] 6.5 Backend-/Frontend-Regressionstests für Notizspeicherung, Löschen, Read-only und Kopieren ergänzen.

## 7. Buffet-Stückzahlschätzung

- [x] 7.1 Aus aktiven Portionen pro Zutat ein `piece_weight_g` nur bei stückartigem Namen und vertrauenswürdigem Gewicht ableiten.
- [x] 7.2 Buffet-Katalog, Suche und gespeicherter Builder-State um optionales `piece_weight_g` ergänzen; Zod synchron halten.
- [x] 7.3 Im Builder die gerundete Näherung aus g/P × Item-Anteil × Personen ÷ g/Stück zeigen, nur bei g-Rolle und bestätigtem Stückgewicht.
- [x] 7.4 Backend-/Frontend-Tests für Näherungsrechnung, Share-Anteil, fehlendes/unbestätigtes Gewicht, Rezept und ml-Rolle ergänzen.

## 8. Spec-Abgleich (Review 2026-10-11)

- [x] 8.1 Doppelte Deltas `meal-item-portion-update` und `meal-plan-frontend` in ein MODIFIED-Delta von `meal-item-unit-edit` überführt; Gramm-/ml-Anzeige aufgenommen.
- [x] 8.2 `meal-item-note` als MODIFIED/ADDED-Delta zur bestehenden Main-Spec statt zweiter Notiz-Anforderung; PDF-Aussage im Design korrigiert.
- [x] 8.3 „Portion und Maßeinheit speichern“ an das Datenmodell angepasst (Portion ohne `measuring_unit`).
- [x] 8.4 Testlücken geschlossen: Bulk-Wizard mit fremder/inaktiver Portion bei vorhandenen Einträgen rollt alles zurück (`test_wizard_items.py`), Zauberstab-Rollback ohne `save`-Mock bei späterem Fehler (`test_portion_magic_wand.py`; der echte Rang-409 entsteht nur im Race und bleibt mit Mock getestet), `BuffetBuilder.test.tsx` enthält laut `tsc --noUnusedLocals` und ESLint keinen toten Code.
