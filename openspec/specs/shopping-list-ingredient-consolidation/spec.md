# shopping-list-ingredient-consolidation Specification

## Purpose
Anforderungen an shopping list ingredient consolidation: Dubletten-Zutaten bilden eine Einkaufszeile; Verkaufsverpackungen werden aufgerundet.
## Requirements
### Requirement: Dubletten-Zutaten bilden eine Einkaufszeile
Das System SHALL Zutaten, die als Dubletten derselben Ware geführt sind (z. B. „Banane“ und „Bananen“, „Möhre“ und „Möhren“), per Datenmerge (`DUPLICATE_GROUPS`, Dry-Run als Standard) zu einer Zutat zusammenführen, sodass Einkaufsliste und Einkaufen-Tab eine Zeile zeigen. Die Quellen (`sources`) MUST die ursprünglichen Zutaten weiterhin erkennbar machen.

#### Scenario: Banane und Bananen
- **GIVEN** ein Plan mit einem Rezept mit „Banane“ (110 g) und einem mit „Bananen“ (220 g)
- **WHEN** die Einkaufsliste berechnet wird
- **THEN** enthält sie eine Zeile „Bananen“ mit 330 g
- **AND** `sources` nennt beide Rezepte

### Requirement: Verkaufsverpackungen werden aufgerundet
Das System SHALL die Stückäquivalent-Anzeige für Verkaufsverpackungen (Packung, Dose, Glas, Becher, Flasche, Beutel, Tüte) auf ganze Einheiten aufrunden. Andere Stückangaben (z. B. „≈ 9,2 Einzelstück“) behalten ihre Dezimalstelle. `quantity_g` MUST exakt bleiben.

#### Scenario: Bruchteil einer Packung
- **GIVEN** ein Bedarf von 1.375 g bei einer 500-g-Packung
- **WHEN** die Einkaufsliste angezeigt wird
- **THEN** steht dort „3 × 500g (Packung)“ statt „2,8 ×“
- **AND** `quantity_g` ist 1375
