## ADDED Requirements

### Requirement: Normportionen-basierte Rezeptmengen
Alle RecipeItem-Mengen (`quantity`) SHALL immer für exakt 1 Normportion gespeichert werden. Das `servings`-Feld auf Recipe SHALL den Default-Wert 1 haben und als reine Referenz dienen.

#### Scenario: RecipeItem-Mengen für 1 Normportion
- **WHEN** ein RecipeItem erstellt oder bearbeitet wird
- **THEN** SHALL die `quantity` die Menge für 1 Normportion repräsentieren
- **THEN** SHALL die API die Menge unverändert für 1 Portion zurückgeben

#### Scenario: Bestehende Rezepte migrieren
- **WHEN** die Data-Migration ausgeführt wird
- **THEN** SHALL jede RecipeItem.quantity durch das zugehörige Recipe.servings dividiert werden
- **THEN** SHALL Recipe.servings auf 1 gesetzt werden

### Requirement: Interaktiver Portionsrechner
Die Rezeptdetailseite SHALL einen interaktiven Skalierungsrechner anzeigen, mit dem Nutzer die Personenzahl anpassen können. Alle Mengen SHALL in Echtzeit clientseitig skaliert werden.

#### Scenario: Portionsrechner auf Rezeptdetailseite
- **WHEN** ein Nutzer die Rezeptdetailseite aufruft
- **THEN** SHALL ein Portionsrechner mit Slider oder +/- Buttons angezeigt werden
- **THEN** SHALL der Standard-Wert 1 Portion sein
- **THEN** SHALL der Bereich von 1 bis 100 Portionen reichen

#### Scenario: Mengen skalieren bei Portionsänderung
- **WHEN** ein Nutzer die Portionszahl im Rechner ändert (z.B. auf 4)
- **THEN** SHALL jede RecipeItem-Menge mit dem Faktor multipliziert werden (quantity * 4)
- **THEN** SHALL die Anzeige sofort aktualisiert werden (kein API-Call)

#### Scenario: Portionsrechner in MealEvent-Kontext
- **WHEN** ein Rezept im Kontext eines MealEvents angezeigt wird
- **THEN** SHALL der Portionsrechner den MealEvent-Skalierungsfaktor (norm_portions * activity_factor * reserve_factor * meal_item.factor) als Default verwenden

### Requirement: Intelligente Einheiten-Umrechnung
Das System SHALL skalierte Mengen in sinnvolle Einheiten umrechnen mit kontextgerechter Rundung.

#### Scenario: Gramm zu Kilogramm
- **WHEN** eine Menge >= 1000g beträgt
- **THEN** SHALL sie in Kilogramm angezeigt werden (z.B. "1,2 kg" statt "1200 g")

#### Scenario: Milliliter zu Liter
- **WHEN** eine Menge >= 1000ml beträgt
- **THEN** SHALL sie in Liter angezeigt werden (z.B. "1,5 l" statt "1500 ml")

#### Scenario: Sinnvolle Rundung
- **WHEN** eine Menge unter 100g liegt
- **THEN** SHALL auf 5g-Schritte gerundet werden
- **WHEN** eine Menge zwischen 100g und 1000g liegt
- **THEN** SHALL auf 10g-Schritte gerundet werden
- **WHEN** eine Menge über 1000g liegt
- **THEN** SHALL auf 50g-Schritte gerundet werden

#### Scenario: Default-Einheit basierend auf Zutat
- **WHEN** eine Zutat `physical_viscosity` = "solid" hat
- **THEN** SHALL die Primäreinheit Gewicht (g/kg) sein
- **WHEN** eine Zutat `physical_viscosity` = "beverage" hat
- **THEN** SHALL die Primäreinheit Volumen (ml/l) sein

#### Scenario: Umrechnung zwischen Gewicht und Volumen
- **WHEN** eine Zutat `physical_density` gesetzt hat und die Zieleinheit Volumen ist
- **THEN** SHALL die Umrechnung über die Dichte erfolgen: ml = g / density
- **WHEN** eine Zutat keine `physical_density` hat
- **THEN** SHALL keine Umrechnung zwischen g und ml angeboten werden

### Requirement: Natürliche Portionsanzeige
Neben der Gewichts/Volumen-Anzeige SHALL das System natürliche Portionsdarstellungen anzeigen, basierend auf den verfügbaren `Portion`-Einträgen einer Zutat.

#### Scenario: Alle Portionen anzeigen
- **WHEN** eine Zutat in einem Rezept angezeigt wird und die skalierte Menge berechnet ist
- **THEN** SHALL neben der Gewichtsangabe die natürliche Portionsanzeige erscheinen (z.B. "1,2 kg Äpfel (ca. 8 Stück)")
- **THEN** SHALL alle verfügbaren Portionen einer Zutat angezeigt werden können (z.B. "1,2 kg = ca. 8 Stück = ca. 3 Beutel")

#### Scenario: Portions-Priorität bestimmt Anzeige
- **WHEN** eine Zutat mehrere Portionen hat
- **THEN** SHALL die Portion mit `is_default=True` als erste neben der Gewichtsangabe angezeigt werden
- **THEN** SHALL die restlichen Portionen nach `priority` sortiert (höchste zuerst) in einer erweiterten Ansicht verfügbar sein

#### Scenario: Natürliche Portion berechnen
- **WHEN** die skalierte Menge in Gramm bekannt ist und eine Portion `weight_g` hat
- **THEN** SHALL die Anzahl natürlicher Portionen berechnet werden als: `skalierte_menge_g / portion.weight_g`
- **THEN** SHALL das Ergebnis mit "ca." prefixed und sinnvoll gerundet werden (auf 0,5 oder ganze Zahlen)

### Requirement: Portionsanzeige in Einkaufslisten
Einkaufslisten SHALL ebenfalls die natürliche Portionsanzeige unterstützen.

#### Scenario: Natürliche Portionen in Einkaufsliste
- **WHEN** ein Item in einer Einkaufsliste angezeigt wird und die Zutat Portionen hat
- **THEN** SHALL neben der Gewichtsangabe die natürliche Portionsanzeige erscheinen
- **THEN** SHALL die Default-Portion der Zutat verwendet werden

### Requirement: MealEvent-Skalierungsintegration
Der Portionsrechner SHALL sich nahtlos in das bestehende MealEvent-Skalierungssystem integrieren.

#### Scenario: MealEvent Shopping-List mit Skalierung
- **WHEN** eine Einkaufsliste aus einem MealEvent exportiert wird
- **THEN** SHALL der MealEvent-Skalierungsfaktor angewendet werden
- **THEN** SHALL die Einheiten-Umrechnung auf die skalierten Mengen angewendet werden

#### Scenario: Skalierung im MealEvent anpassen
- **WHEN** ein Nutzer auf der MealEvent-Detailseite `norm_portions`, `activity_factor` oder `reserve_factor` ändert
- **THEN** SHALL die Shopping-List-Mengen sofort aktualisiert werden
