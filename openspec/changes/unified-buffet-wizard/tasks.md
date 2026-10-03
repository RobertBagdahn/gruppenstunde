## 1. Frühstücksassistent und gemeinsamer Wizard-Stil

- [x] 1.1 Einen einzelnen MealSlot-Einstieg für den Assistenten anbieten: Frühstück öffnet den direkten Frühstücks-Wizard, andere Mahlzeitentypen den generischen Buffet-Wizard; den Referenzmahlzeiten-Modus erhalten.
- [x] 1.2 Den Frühstückswizard um einen echten ersten Profil-Schritt mit den fünf bestätigten Varianten ergänzen; die vorhandenen Basis-, Fett-, Belag-, Extras-, Getränke- und Cockpit-Schritte sowie Share-Slider bewahren.
- [x] 1.3 Gemeinsame Stepper-Progress-/Navigation-Komponenten für Frühstücks- und Buffet-Wizard implementieren und beidseitig verwenden.
- [x] 1.4 Vom Frühstücks-Profil-Schritt eine separate „Freies Buffet“-Option in den generischen Buffet-Wizard ermöglichen.

## 2. Preset-first Buffet-Wizard

- [x] 2.1 Den bisherigen Ein-Schritt-Dialog in Preset-, Zusammenstellen- und Prüfen-Schritte überführen; Zurück/Weiter, Abbrechen, Retry und Abschlusszustand vollständig behandeln.
- [x] 2.2 Vorhandene aktive Vorlagen pro MealType nach `sort_order` anzeigen, höchstens sechs hervorheben, Free als stets separate Kachel zeigen und weitere aktive Vorlagen erreichbar halten.
- [x] 2.3 Für bestehende und neue Presets vollständige Default-Auswahlen konfigurieren; Standard-Items ohne globalen Rollen-Tag nur dann im Katalog zeigen, wenn sie durch die bestehende Food-Access-Policy sichtbar sind.
- [x] 2.4 Neue Getränke-Vorlagen „Hausfahrt mit Säften“ und „Lager mit Zitronentee“ idempotent ergänzen; Standard-Items aus vorhandenen Prod-Katalogdaten verwenden.
- [x] 2.5 Globale Vorlage/Rollen-Definitionen Staff/Admin vorbehalten; Nutzer können nur die konkrete Mahlzeit und deren Item-Auswahl ändern.

## 3. Item-Shares und Speichervertrag

- [x] 3.1 `MealItem.buffet_share_percent` und `MealItem.is_breakfast_assistant` als additive Planner-Felder ergänzen; bestehende MealItems bleiben gültig.
- [x] 3.2 Pydantic-/Zod-Requests und Responses für Shares pro Item, `manual_items_policy` und Manual-Item-Zähler synchronisieren.
- [x] 3.3 Backend-Mengenberechnung auf Rollen-Gesamtmenge plus Item-Share umstellen; Shares validieren und Recipe-/Ingredient-Faktoren korrekt ableiten.
- [x] 3.4 Dieselbe Zutat oder dasselbe Rezept in verschiedenen Rollen zulassen; Eindeutigkeit auf eine Rolle begrenzen und Datenbank-Constraint entsprechend aktualisieren.
- [x] 3.5 Gespeicherte Item-Shares, Preset, Rollenbeträge und Preserve/Replace-Entscheidung beim Wiederöffnen wiederherstellen.
- [x] 3.6 Tests für Share-Normalisierung, alte MealItems ohne gespeicherte Shares, doppelte Items pro Rolle, Mehrfachrollen, Recipe-Weight-Fallback und Save-Policy ergänzen.

## 4. Tests und Abnahme

- [x] 4.1 Frontend-Tests für die Frühstücks-Einstiegskachel, fünf Profile, Free-Wechsel, MealType-Presetkarten und Wizard-Navigation ergänzen.
- [x] 4.2 Food-Frontend-Tests für Item-Suche/-Auswahl, Share-Slider, Rollenmenge, Review- und Save-Policy ergänzen.
- [x] 4.3 Backend-Regressionstests für direkte/ref Breakfast-Modi, Preset-Defaults, Katalogsichtbarkeit und Wizard-Restore ergänzen.
- [x] 4.4 `uv run python manage.py makemigrations --check`, relevante `uv run pytest`, Food-Frontend-Tests, TypeScript-Build, gezieltes ESLint und Ruff ausführen.
- [ ] 4.5 Den 320-px-Layoutcheck und einen vollständigen integrierten Breakfast/Lunch/Dinner/Snack/Drinks-End-to-End-Ablauf testen; dieser Change selbst führt kein Prod-Deploy oder Prod-Apply aus.
