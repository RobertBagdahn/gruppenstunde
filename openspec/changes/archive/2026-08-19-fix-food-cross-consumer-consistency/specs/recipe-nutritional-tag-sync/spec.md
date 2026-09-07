# recipe-nutritional-tag-sync Specification

## Purpose

Der Nutritional-Tag-Sync (`sync_recipe_nutritional_tags`) berechnet die AND-Schnittmenge
der Ernährungstags über die Zutaten eines Rezepts. Austausch-Alternativen und
soft-gelöschte Portionen MÜSSEN dabei ignoriert werden, damit inaktive Zutaten die
Schnittmenge nicht verfälschen (Grundlage für den Zutaten-Radar).

## ADDED Requirements

### Requirement: Tag-Sync schließt Austausch-Alternativen aus

`sync_recipe_nutritional_tags` SHALL RecipeItems ausschließen, die zu einer
Austausch-Gruppe gehören und `exchange_position > 0` haben, konsistent mit
`get_recipe_nutritional_values`.

#### Scenario: Austausch-Alternative verfälscht AND-Schnittmenge nicht

- **GIVEN** ein Rezept mit der Austausch-Gruppe „Käse" (`position 0`, nicht vegan) und „Hefeflocken" (`position 1`, vegan)
- **AND** alle übrigen Zutaten sind vegan
- **WHEN** der Tag-Sync ausgeführt wird
- **THEN** SHALL „Vegan" als Tag gesetzt bleiben
- **AND** SHALL der nicht-vegane Käse die Schnittmenge nicht beeinflussen

### Requirement: Tag-Sync schließt soft-deleted Portionen aus

`sync_recipe_nutritional_tags` SHALL RecipeItems ausschließen, deren Portion
soft-gelöscht ist (`portion.deleted_at IS NOT NULL`).

#### Scenario: Soft-deleted Portion beeinflusst Tags nicht

- **GIVEN** ein Rezept, dessen eine Zutat über eine soft-gelöschte Portion referenziert wird
- **WHEN** der Tag-Sync ausgeführt wird
- **THEN** SHALL diese Zutat nicht in die AND-Schnittmenge einfließen
