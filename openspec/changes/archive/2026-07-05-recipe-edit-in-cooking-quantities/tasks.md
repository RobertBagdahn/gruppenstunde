## 1. Editor-State

- [x] 1.1 `InlineIngredientEditor.tsx`: eigenen `editPortions`-State einführen (statt read-only `displayPortions`), Initialwert = aktuelle Anzeige-Personenzahl (`portionsMultiplier`)
- [x] 1.2 Personenzahl-Selector im Editor (Wiederverwendung `PortionScaler`-Muster), live Skalierung der Mengen
- [x] 1.3 Sperre der Personenzahl im Edit-Modus entfernen

## 2. Einstiegspunkt

- [x] 2.1 `RecipeDetailPage.tsx`: sichtbare Option „Für mehrere Personen bearbeiten" mit Personenzahl-Auswahl
- [x] 2.2 Entkopplung von `portionsMultiplier` (Editor nutzt `editPortions`, nicht Anzeige-Multiplier)
- [x] 2.3 Portions-Kontext im Edit-Modus sinnvoll anzeigen (nicht ausblenden)

## 3. Speichern

- [x] 3.1 Bestehende Runter-Division durch `scale` und `portions: 1` beibehalten/verifizieren

## 4. Tests

- [x] 4.1 Frontend: Eingabe für 4 Personen → gespeicherte Menge = Eingabe/4
- [x] 4.2 Frontend: Personenzahl ändern skaliert Anzeige live
- [x] 4.3 Frontend: Einstieg sichtbar/verfügbar bei Anzeige 1 Portion; nicht für Nutzer ohne Recht

## 5. Abschluss

- [x] 5.1 Keine `any`/`console.log`; deutsche UI-Texte

