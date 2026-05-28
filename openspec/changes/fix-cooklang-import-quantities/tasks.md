## 1. Fix Unit-Mapping

- [x] 1.1 `unit_aliases` Dict umschreiben: Cooklang-Strings → tatsächliche DB-Unit-Namen (`g`, `Kg`, `ml`, `l`, `EL`, `TL`, `Msp`, `Pr`)
- [x] 1.2 `gram_unit` Lookup korrigieren: `unit_map.get("g")` statt `unit_map.get("gramm")`
- [x] 1.3 Fallback-Verhalten ändern: Bei unbekannter Unit `None` setzen + Warnung ausgeben (statt stillschweigend `gram_unit` zuweisen)

## 2. Fix quantity_type und Mengenberechnung

- [x] 2.1 Nach dem Parsen: `quantity = parsed_quantity / servings` berechnen
- [x] 2.2 `quantity_type="per_person"` beim `RecipeItem.objects.create()` setzen
- [x] 2.3 Edge-Case: Wenn `quantity_raw` leer → `quantity = 1.0 / servings`

## 3. Cooklang-Parser verbessern

- [x] 3.1 `INGREDIENT_RE` Regex anpassen: Name muss mit Buchstabe beginnen, max 50 Zeichen
- [x] 3.2 Post-Filter: Matches mit verdächtigen Namen (nur Zahlen, Satzzeichen) verwerfen
- [x] 3.3 Testen mit problematischen Beispielen: `@85-90g teilen...`, `@Prise Salz{1%Stück}`

## 4. --force Flag implementieren

- [x] 4.1 `--force` Argument in `add_arguments` hinzufügen
- [x] 4.2 Bei `--force`: `Recipe.objects.filter(summary__startswith="Importiert aus Cooklang").delete()` vor Import
- [x] 4.3 Anzahl gelöschter Rezepte im Output anzeigen

## 5. Testen und Verifizieren

- [x] 5.1 `--dry-run` mit den Cooklang-Files ausführen, Output prüfen
- [x] 5.2 `--force` Import ausführen, ein Rezept in DB prüfen (Unit + quantity_type + quantity)
- [x] 5.3 Frontend-Darstellung verifizieren: Mengen korrekt angezeigt
