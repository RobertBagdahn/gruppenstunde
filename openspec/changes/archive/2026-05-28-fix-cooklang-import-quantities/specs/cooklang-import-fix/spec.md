## ADDED Requirements

### Requirement: Korrekte Unit-Zuordnung

Der Import muss Cooklang-Unit-Strings (`g`, `ml`, `EL`, `TL`, `kg`, `l`) korrekt auf die existierenden `MeasuringUnit`-Einträge in der Datenbank mappen.

#### Scenario: Standard-Gewichtseinheit
- **WHEN** ein Cooklang-Ingredient `@Mehl{500%g}` geparst wird
- **THEN** wird `measuring_unit` auf die DB-Unit mit Name `g` gesetzt

#### Scenario: Volumen-Einheit
- **WHEN** ein Cooklang-Ingredient `@Milch{200%ml}` geparst wird
- **THEN** wird `measuring_unit` auf die DB-Unit mit Name `ml` gesetzt

#### Scenario: Unbekannte Einheit
- **WHEN** die Cooklang-Unit nicht in der Alias-Map existiert
- **THEN** wird `measuring_unit = None` gesetzt und eine Warnung ausgegeben

---

### Requirement: Pro-Person-Menge

Importierte RecipeItems müssen `quantity_type="per_person"` verwenden mit der Menge pro Portion.

#### Scenario: Umrechnung Gesamtmenge zu Pro-Person
- **WHEN** ein Rezept mit `servings=4` eine Zutat `@Mehl{500%g}` hat
- **THEN** wird `quantity = 125.0` und `quantity_type = "per_person"` gespeichert

#### Scenario: Einheiten ohne Menge
- **WHEN** ein Cooklang-Ingredient `@Salz{}` keine Mengenangabe hat
- **THEN** wird `quantity = 1.0 / servings` und `quantity_type = "per_person"` gespeichert

---

### Requirement: Robuster Ingredient-Parser

Der Cooklang-Parser darf Fließtext nicht fälschlich als Zutat interpretieren.

#### Scenario: Numerischer Prefix im @-Match
- **WHEN** ein Cooklang-Text `@85-90g teilen...{...}` vorkommt
- **THEN** wird dies NICHT als Zutat geparst (Name beginnt mit Ziffer)

#### Scenario: Überlanger Name
- **WHEN** ein `@`-Match einen Namen > 50 Zeichen ergibt
- **THEN** wird dies nicht als Zutat geparst

---

### Requirement: Force-Reimport

Ein `--force` Flag erlaubt das Löschen und Neuimportieren von Cooklang-Rezepten.

#### Scenario: Force-Flag aktiv
- **WHEN** `--force` gesetzt ist
- **THEN** werden alle Rezepte mit `summary__startswith="Importiert aus Cooklang"` gelöscht vor dem Import

#### Scenario: Ohne Force-Flag
- **WHEN** `--force` nicht gesetzt ist und ein Rezept mit gleichem Titel existiert
- **THEN** wird das Rezept übersprungen (bestehendes Verhalten)
