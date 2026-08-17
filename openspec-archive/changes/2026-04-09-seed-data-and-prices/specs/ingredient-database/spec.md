## MODIFIED Requirements

### Requirement: Zutatenpreise pflegen

Alle Basis-Zutaten MÜSSEN einen realistischen `price_per_kg` Wert haben.

#### Scenario: Preis bei Seed-Zutaten
- **WHEN** eine Zutat über das Seed-Command erstellt wird
- **THEN** MUSS `price_per_kg` mit einem realistischen deutschen Supermarkt-Durchschnittspreis befüllt sein (Stand 2024/2025)

#### Scenario: Preis-Anzeige im Frontend
- **WHEN** ein Rezept Zutaten mit `price_per_kg` hat
- **THEN** MUSS der `cached_price_total` über den bestehenden `recalculate_recipe_cache` automatisch berechnet werden
- **THEN** MUSS die Preisanzeige auf der Rezept-Detailseite den berechneten Gesamtpreis anzeigen
