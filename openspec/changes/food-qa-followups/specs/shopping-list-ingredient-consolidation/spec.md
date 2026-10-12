## ADDED Requirements

### Requirement: Dubletten-Zutaten bilden eine Einkaufszeile
Das System SHALL Zutaten, die als Dubletten derselben Ware geführt sind (z. B. „Banane“ und „Bananen“, „Möhre“ und „Möhren“), in Einkaufsliste und Einkaufen-Tab zu einer Zeile zusammenfassen. Die Quellen (`sources`) MUST die ursprünglichen Zutaten weiterhin erkennbar machen.

#### Scenario: Banane und Bananen
- **GIVEN** ein Plan mit einem Rezept mit „Banane“ (110 g) und einem mit „Bananen“ (220 g)
- **WHEN** die Einkaufsliste berechnet wird
- **THEN** enthält sie eine Zeile „Bananen“ mit 330 g
- **AND** `sources` nennt beide Rezepte

### Requirement: Kaufbare Stückzahlen werden aufgerundet
Das System SHALL Stück- und Packungsangaben in der Einkaufsliste auf ganze Einheiten aufrunden. `quantity_g` MUST exakt bleiben.

#### Scenario: Bruchteil einer Packung
- **GIVEN** ein Bedarf von 1.375 g bei einer 500-g-Packung
- **WHEN** die Einkaufsliste angezeigt wird
- **THEN** steht dort „3 × 500g (Packung)“
- **AND** `quantity_g` ist 1375
