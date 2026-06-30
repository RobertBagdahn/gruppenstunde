## 1. Editor-State

- [ ] 1.1 `InlineIngredientEditor.tsx`: eigenen `editPortions`-State einführen (statt read-only `displayPortions`), Initialwert = aktuelle Anzeige-Personenzahl (`portionsMultiplier`)
- [ ] 1.2 Personenzahl-Selector im Editor (Wiederverwendung `PortionScaler`-Muster), live Skalierung der Mengen
- [ ] 1.3 Sperre der Personenzahl im Edit-Modus entfernen

## 2. Einstiegspunkt

- [ ] 2.1 `RecipeDetailPage.tsx`: sichtbare Option „Für mehrere Personen bearbeiten" mit Personenzahl-Auswahl
- [ ] 2.2 Entkopplung von `portionsMultiplier` (Editor nutzt `editPortions`, nicht Anzeige-Multiplier)
- [ ] 2.3 Portions-Kontext im Edit-Modus sinnvoll anzeigen (nicht ausblenden)

## 3. Speichern

- [ ] 3.1 Bestehende Runter-Division durch `scale` und `portions: 1` beibehalten/verifizieren

## 4. Tests

- [ ] 4.1 Frontend: Eingabe für 4 Personen → gespeicherte Menge = Eingabe/4
- [ ] 4.2 Frontend: Personenzahl ändern skaliert Anzeige live
- [ ] 4.3 Frontend: Einstieg sichtbar/verfügbar bei Anzeige 1 Portion; nicht für Nutzer ohne Recht

## 5. Abschluss

- [ ] 5.1 Keine `any`/`console.log`; deutsche UI-Texte
