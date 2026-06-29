## 1. Code-Änderung

- [ ] 1.1 Even-Split-Logik aus `StepBasis.tsx` entfernen (Zeilen 31–39: `if (initial.length > 1)`-Block)
- [ ] 1.2 Sicherstellen, dass die initiale Zuweisung `i === 0 ? 100 : 0` als Default erhalten bleibt
- [ ] 1.3 Fallback-Logik prüfen: falls erstes Base-Ingredient nicht Bauernbrot ist, wird trotzdem 100% gesetzt

## 2. Spec-Update

- [ ] 2.1 Delta-Spec in `openspec/specs/breakfast-wizard/spec.md` integrieren:
  - "Kein RefMeal → Redirect zu Wizard": "leerem Standardzustand" durch "Bauernbrot = 100%, alle anderen = 0%" ersetzen
  - "Schritt 1 — Basis mit Sortenverteilung": Default-Verhalten + Fallback + "Gespeicherte Verteilung hat Vorrang" ergänzen
  - "DirectMeal-Mode"-Scenario: Default auf 100% Bauernbrot aktualisieren

## 3. Verifikation

- [ ] 3.1 Wizard im RefMeal-Mode neu öffnen → 100% Bauernbrot bestätigen
- [ ] 3.2 Wizard im DirectMeal-Mode neu öffnen → 100% Bauernbrot bestätigen
- [ ] 3.3 Vorhandenes RefMeal mit gespeicherter Verteilung öffnen → gespeicherte Werte werden geladen
- [ ] 3.4 BE/Person und Gramm/Kcal bei 100% Bauernbrot korrekt berechnet
- [ ] 3.5 Slider-Rebalance funktioniert beim Ändern von Anteilen korrekt
