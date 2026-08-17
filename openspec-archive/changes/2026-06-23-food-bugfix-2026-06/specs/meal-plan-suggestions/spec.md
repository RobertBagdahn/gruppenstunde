## ADDED Requirements

### Requirement: Halal/Allergie-Konformitätsprüfung gegen Zutaten-Tags

Wenn ein `MealPlan` bestimmte Ernährungseigenschaften (z.B. Halal, vegan) als `nutritional_tags` trägt, SHALL das System alle eingeplanten Rezepte und deren Zutaten gegen diese Tags prüfen und Verstöße im Vorschläge-Tab anzeigen.

#### Scenario: Halal-Plan enthält nicht-Halal-Zutat

- **WHEN** ein `MealPlan` den Tag „Halal" hat
- **AND** ein eingeplantes Rezept eine Zutat enthält die das Tag „Halal" nicht trägt
- **THEN** erscheint im Vorschläge-Tab ein Eintrag: „Möglicher Verstoß: [Rezeptname] enthält [Zutatname] ohne Halal-Tag"

#### Scenario: Keine Verstöße bei konformen Zutaten

- **WHEN** alle Zutaten aller eingeplanten Rezepte das geforderte Tag tragen
- **THEN** zeigt der Vorschläge-Tab „Keine Verstöße gefunden" für diese Eigenschaft

#### Scenario: Mehrere Tags geprüft

- **WHEN** ein `MealPlan` mehrere Tags hat (z.B. „vegan" und „glutenfrei")
- **THEN** werden alle Tags einzeln geprüft und Verstöße pro Tag aufgelistet

## ADDED Requirements

### Requirement: Korrekte Kalorienberechnung für Teilfaktoren (Anreisetag)

Das Kalorien-Soll für einen Tag SHALL aus der Summe der `day_part_factor`-Werte aller tatsächlich geplanten Mahlzeiten dieses Tages berechnet werden — nicht als fixer Tageswert von 100%.

#### Scenario: Anreisetag mit nur Abendessen

- **WHEN** ein Tag nur eine Abendessen-Mahlzeit hat (day_part_factor = 0.30)
- **THEN** ist das Kalorien-Soll für diesen Tag 30% des täglichen Bedarfs
- **THEN** zeigt die Anzeige KEINEN „Kalorien-Mangel"-Hinweis für die fehlenden 70%

#### Scenario: Vollständiger Tag

- **WHEN** ein Tag Frühstück (0.25) + Mittagessen (0.35) + Abendessen (0.30) + Snack (0.10) hat
- **THEN** ist das Kalorien-Soll 100% des täglichen Bedarfs
