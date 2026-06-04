## MODIFIED Requirements

### Requirement: Kosten-Aggregation API

Das Backend berechnet aggregierte Kosten eines MealPlans basierend auf `Ingredient.price_per_kg`, Mengen und Portionsskalierung. Die Kostenskalierung SHALL ausschließlich `norm_portions` verwenden (ohne PAL/Aktivitätsfaktor). Die API SHALL die Gesamtkosten sowohl **ohne** Reservefaktor als auch **mit** Reservefaktor (`Kosten ohne Reserve × reserve_factor`) ausweisen.

#### Scenario: Kostenübersicht abrufen
- **WHEN** ein GET-Request an `/api/planner/meal-plans/{id}/costs/` gesendet wird
- **THEN** wird eine Zusammenfassung mit Gesamtkosten ohne Reserve, Gesamtkosten mit Reserve, Kosten pro Person, und Aufschlüsselung pro Tag/Mahlzeit zurückgegeben

#### Scenario: Gesamtkosten mit und ohne Reserve
- **WHEN** ein MealPlan `reserve_factor = 1.2` hat und die Gesamtkosten ohne Reserve `100.00 EUR` betragen
- **THEN** SHALL die Antwort `cost_without_reserve = 100.00` und `cost_with_reserve = 120.00` enthalten

#### Scenario: Zutaten ohne Preis
- **WHEN** Zutaten in einem MealItem kein `price_per_kg` haben
- **THEN** werden diese bei der Berechnung übersprungen und die Antwort enthält Informationen über die Abdeckung (z.B. "12 von 15 Zutaten mit Preis")

### Requirement: Kosten-Dashboard UI

Ein Tab "Kosten" in der MealPlan-Detailseite zeigt die aggregierten Preisdaten. Die Gesamtkosten SHALL mit und ohne Reservefaktor angezeigt werden.

#### Scenario: Dashboard-Anzeige
- **WHEN** der Benutzer den Tab "Kosten" auswählt
- **THEN** werden angezeigt: Gesamtkosten (ohne Reserve), Gesamtkosten inkl. Reserve, Kosten pro Person, eine Tabelle mit Kosten pro Tag und Kosten pro Tag pro Person

#### Scenario: Kosten pro Mahlzeit
- **WHEN** der Benutzer die Tagesaufschlüsselung betrachtet
- **THEN** sind die Kosten pro Mahlzeit (Frühstück, Mittag, Abend, Snack) innerhalb jedes Tages sichtbar

#### Scenario: Unvollständige Preisdaten
- **WHEN** nicht alle Zutaten einen Preis haben
- **THEN** wird ein Hinweis angezeigt, dass die Kosten geschätzt sind, mit Angabe der Abdeckung
