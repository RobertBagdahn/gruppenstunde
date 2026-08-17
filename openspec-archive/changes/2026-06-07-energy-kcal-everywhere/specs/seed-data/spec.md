## MODIFIED Requirements

### Requirement: Seed-Data Management Command

Das System MUSS ein Management Command bereitstellen das realistische Beispieldaten erstellt.

#### Scenario: Zutaten mit vollständigen Daten
- **WHEN** eine Zutat über das Seed-Command erstellt wird
- **THEN** MUSS sie folgende Felder befüllt haben: `name`, `slug`, `energy_kcal`, `protein_g`, `fat_g`, `fat_sat_g`, `carbohydrate_g`, `sugar_g`, `fibre_g`, `salt_g`, `price_per_kg`, `nutri_score`, `nutri_class`, `status=verified`
- **THEN** MUSS mindestens eine `Portion` mit `weight_g` und `measuring_unit` zugeordnet sein
- **THEN** MUSS `energy_kcal` in Kilokalorien gespeichert sein (gerundet auf ganze Zahlen)
