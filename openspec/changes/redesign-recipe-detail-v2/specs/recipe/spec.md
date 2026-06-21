## MODIFIED Requirements

### Requirement: Recipe embedding auto-generated on save
Das System SHALL bei Erstellung und bei Aktualisierung eines Recipes das Embedding neu generieren, wenn sich embedding-relevante Felder geändert haben. Die Erkennung geänderter Felder SHALL über `update_fields` bzw. einen Feld-Tracker erfolgen und SHALL NICHT auf ein nicht existierendes `instance.tracker`-Attribut zugreifen.

#### Scenario: Embedding bei Update aktualisiert
- **WHEN** ein bestehendes Recipe mit geänderten embedding-relevanten Feldern gespeichert wird
- **THEN** SHALL das Embedding asynchron neu generiert werden
- **THEN** SHALL kein AttributeError auftreten und das Update nicht stillschweigend ausgelassen werden

#### Scenario: Embedding bei Create erzeugt
- **WHEN** ein neues Recipe erstellt wird
- **THEN** SHALL das Embedding asynchron generiert werden

## ADDED Requirements

### Requirement: Cache-Gewicht und -Preis berücksichtigen alle Portion-Typen
`recalculate_recipe_cache` SHALL das Gesamtgewicht und damit `cached_weight_g`, `cached_energy_total_kcal` und `cached_price_total` konsistent zur Live-Berechnung (`get_recipe_total_weight_g`) ermitteln, indem sowohl gewichtsbasierte (`portion.weight_g`) als auch mengeneinheitsbasierte Portionen (`quantity * portion.quantity * measuring_unit.quantity`) berücksichtigt werden.

#### Scenario: Mengeneinheits-Portion im Cache
- **WHEN** ein Rezept Zutaten mit mengeneinheitsbasierten Portionen (ohne gesetztes `weight_g`) enthält
- **THEN** SHALL das gecachte Gewicht/Energie/Preis dem live berechneten Wert entsprechen (keine Unterzählung/0)

### Requirement: Sichtbarkeitsfilter auf Detail-Endpunkten
Die Endpunkte `GET /api/recipes/{recipe_id}/` und `GET /api/recipes/by-slug/{slug}/` SHALL denselben Sichtbarkeitsfilter wie der Listen-Endpunkt anwenden, sodass nicht-sichtbare Rezepte (privat/Entwurf/fremde Gruppe) mit 404 beantwortet werden.

#### Scenario: Privates Rezept fremder Nutzer
- **WHEN** ein nicht berechtigter (oder anonymer) Nutzer ein privates/Entwurf-Rezept per ID oder Slug abruft
- **THEN** SHALL die Antwort 404 sein

#### Scenario: Sichtbares Rezept
- **WHEN** ein berechtigter Nutzer ein für ihn sichtbares Rezept abruft
- **THEN** SHALL das Rezept normal zurückgegeben werden

### Requirement: Einheitliche Bearbeitungs-Berechtigung
Die Bearbeitungs-Berechtigung für RecipeItems SHALL identisch zur Recipe-Bearbeitungs-Berechtigung sein und insbesondere den `owner_id`-Check einschließen.

#### Scenario: Owner bearbeitet eigene Items
- **WHEN** der Besitzer (owner) eines persönlichen Rezepts dessen RecipeItems bearbeitet
- **THEN** SHALL die Bearbeitung erlaubt sein (kein 403)

### Requirement: Portion-Normalisierung beim Speichern
Das Backend SHALL Rezepte stets pro-1-Portion speichern. Das Frontend SHALL beim Speichern modifizierter Zutaten pro-1-Portion-Mengen senden und kein `portions`-Feld übermitteln. Items ohne gültige `portion_id` SHALL nicht zu einem Integritätsfehler führen, sondern abgewiesen oder gefiltert werden.

#### Scenario: Speichern ohne portions-Feld
- **WHEN** modifizierte Zutaten gespeichert werden
- **THEN** SHALL das Frontend kein `portions`-Feld senden und das Backend pro-1-Portion speichern

#### Scenario: Item ohne portion_id
- **WHEN** ein zu speicherndes Item keine gültige `portion_id` hat
- **THEN** SHALL kein IntegrityError auftreten (Item wird abgewiesen oder gefiltert)
