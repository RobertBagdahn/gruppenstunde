## MODIFIED Requirements

### Requirement: Einheitliche effektive Portionen

`effective_portions = override_portions or norm_portions`. Alle Mengen-, Energie-, Kosten-,
Einkaufslisten- und Kochplanberechnungen SHALL diese Zahl verwenden. Pro-Person-Aggregationen
werden je Mahlzeit berechnet und gemäß `meal-plan-cost-dashboard` als gewichtetes Mittel
aggregiert: `Summe(Teilkosten) / Summe(effective_portions)`.

`norm_portions` und `effective_portions` unterstützen Float-Werte. Tagesgenaue Portionen bleiben
außerhalb dieses Changes und werden in einer eigenen Spec definiert.

#### Scenario: Override-Portionen
- **WHEN** `override_portions` gesetzt ist
- **THEN** verwenden alle Ausgabepfade diesen Wert statt `norm_portions`
