# Spec Delta

## MODIFIED Requirements

### Requirement: Inspi-Illustrationen in Cards MÜSSEN vollständig sichtbar sein

Card-Fallback-Bilder (wenn kein User-Upload vorhanden) MUST `object-contain` statt `object-cover` verwenden, damit die Inspi-Figur vollständig sichtbar ist und nicht abgeschnitten wird. Der Container MUST einen dezenten Hintergrund haben, damit der leere Raum um die Figur nicht störend wirkt. Rezeptkarten ohne Foto sind davon ausgenommen und zeigen die Rezepttyp-Fläche (`recipe-thumbnail`).

#### Scenario: RecipeCard-Fallback zeigt vollständiges Inspi

- **WHEN** eine RecipeCard ohne User-Bild gerendert wird
- **THEN** MUSS sie die Rezepttyp-Fläche mit Symbol zeigen (`recipe-thumbnail`) und KEIN `inspi_cook.png` verwenden

#### Scenario: BlogCard-Fallback zeigt vollständiges Inspi

- **WHEN** eine BlogCard ohne User-Bild gerendert wird und `inspi_flying.png` als Fallback verwendet wird
- **THEN** MUSS das Bild mit `object-contain` in einem `aspect-square`-Container mit Padding und Hintergrund dargestellt werden

#### Scenario: ContentCard-Fallback zeigt vollständiges Inspi

- **WHEN** eine ContentCard ohne User-Bild gerendert wird
- **THEN** MUSS das Fallback-Inspi-Bild mit `object-contain` dargestellt werden

#### Scenario: TitleImageEditor-Fallback zeigt vollständiges Inspi

- **WHEN** ein Detail-Page-Hero kein User-Bild hat und das Fallback-Inspi angezeigt wird
- **THEN** MUSS das Bild mit `object-contain` und Padding in einem `aspect-square`-Container dargestellt werden
