## MODIFIED Requirements

### Requirement: All recipes MUST have servings=1
Das System SHALL alle Rezeptmengen pro Person speichern. `Recipe.portions` MUST immer `1` sein, und jede `RecipeItem.quantity` (auch optionale Zutaten und Austausch-Alternativen) MUST die Menge für genau eine Person sein. Die Rezept-UI SHALL kein editierbares Portionen-Feld anzeigen und höchstens `portions: 1` senden. Die API MUST `portions != 1` beim Anlegen und Bearbeiten mit 422 und der Meldung „Rezepte werden immer für 1 Person gespeichert. Bitte gib die Mengen pro Person an.“ ablehnen, statt den Wert still zu verwerfen. Weder API noch Model DÜRFEN `portions` eines bestehenden Rezepts still auf `1` setzen, weil das gespeicherte Gesamtmengen als Pro-Person-Mengen umdeuten würde. Importe, die die Personenzahl der Quelle kennen, MUST die Mengen durch diese Zahl teilen und sie als `source_servings` speichern. Im Django-Admin MUST `portions` schreibgeschützt sein. Altdaten mit `portions > 1` werden ausschließlich über den Command `normalize_recipe_servings` normalisiert.

#### Scenario: Rezept-Anlage sendet höchstens portions=1
- **WHEN** ein Nutzer ein Rezept über die UI anlegt
- **THEN** enthält der Request kein `portions` oder `portions: 1`
- **THEN** zeigt die UI kein editierbares Portionen-Feld

#### Scenario: Import teilt durch die Personenzahl der Quelle
- **WHEN** ein Rezept aus einer Quelle mit 4 Personen und „Spaghetti 500 g“ importiert wird
- **THEN** speichert das Rezept „Spaghetti 125 g“, `portions=1` und `source_servings=4`

#### Scenario: Anlage mit portions ungleich 1
- **WHEN** ein Client `POST /api/recipes/` mit `portions=4` sendet
- **THEN** antwortet das System mit 422 am Feld `portions`
- **THEN** wird kein Rezept angelegt

#### Scenario: Bearbeiten mit portions ungleich 1
- **WHEN** ein Client `PATCH /api/recipes/{id}/` mit `portions=2` sendet
- **THEN** antwortet das System mit 422 und ändert weder Rezept noch Mengen

#### Scenario: portions=1 schreibt Altdaten nicht um
- **GIVEN** ein Altrezept hat `portions=4`
- **WHEN** ein Client es mit `portions=1` und einem neuen Titel bearbeitet
- **THEN** wird der Titel gespeichert, `portions` bleibt `4` und die Mengen bleiben unverändert

#### Scenario: Admin-Formular
- **WHEN** ein Admin ein Rezept im Django-Admin anlegt oder bearbeitet
- **THEN** ist `portions` nicht editierbar

#### Scenario: Command ordnet typabhängig ein
- **WHEN** `normalize_recipe_servings` ein Rezept mit `portions > 1` prüft
- **THEN** vergleicht es das Gesamtgewicht und das Gewicht geteilt durch `portions` mit dem plausiblen Pro-Person-Bereich des Rezepttyps (Soßen und Dips mit kleinerem Bereich)
- **THEN** ordnet es das Rezept als `per_person`, `total` oder `review` ein, wobei `review` gilt, wenn keine Deutung deutlich näher am Bereich liegt

#### Scenario: Command teilt Gesamtmengen
- **WHEN** ein Rezept als `total` eingeordnet oder per `--treat-as-total` vorgegeben ist und `--apply` gesetzt ist
- **THEN** werden alle `RecipeItem`-Mengen durch `portions` geteilt, `source_servings` erhält die alte Personenzahl (falls leer) und `portions` wird `1`
- **THEN** bleibt `RecipeStepIngredient.quantity_modifier` unverändert
- **THEN** wird der Rezept-Cache (Nährwerte, Gewicht, Preis) neu berechnet

#### Scenario: Command übernimmt Pro-Person-Mengen
- **WHEN** ein Rezept als `per_person` eingeordnet oder per `--treat-as-per-person` vorgegeben ist und `--apply` gesetzt ist
- **THEN** wird nur `portions` auf `1` gesetzt und der Cache neu berechnet

#### Scenario: Unklare Fälle bleiben unverändert
- **WHEN** ein Rezept als `review` eingeordnet ist und für seine ID keine Vorgabe existiert
- **THEN** ändert der Command das Rezept auch mit `--apply` nicht und meldet es zur Prüfung

#### Scenario: Ohne --apply wird nichts geschrieben
- **WHEN** der Command ohne `--apply` (oder mit `--dry-run`) läuft
- **THEN** zeigt er alle geplanten Änderungen an, ohne die Datenbank zu verändern
