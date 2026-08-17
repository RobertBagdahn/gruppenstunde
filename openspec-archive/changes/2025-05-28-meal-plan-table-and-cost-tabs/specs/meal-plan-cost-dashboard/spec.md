## ADDED Requirements

### Requirement: Kosten-Aggregation API

Das Backend berechnet aggregierte Kosten eines MealPlans basierend auf `Ingredient.price_per_kg`, Mengen und Portionsskalierung.

#### Scenario: Kostenübersicht abrufen
- **WHEN** ein GET-Request an `/api/planner/meal-plans/{id}/costs/` gesendet wird
- **THEN** wird eine Zusammenfassung mit Gesamtkosten, Kosten pro Person, und Aufschlüsselung pro Tag/Mahlzeit zurückgegeben

#### Scenario: Zutaten ohne Preis
- **WHEN** Zutaten in einem MealItem kein `price_per_kg` haben
- **THEN** werden diese bei der Berechnung übersprungen und die Antwort enthält Informationen über die Abdeckung (z.B. "12 von 15 Zutaten mit Preis")

### Requirement: Kosten-Dashboard UI

Ein Tab "Kosten" in der MealPlan-Detailseite zeigt die aggregierten Preisdaten.

#### Scenario: Dashboard-Anzeige
- **WHEN** der Benutzer den Tab "Kosten" auswählt
- **THEN** werden angezeigt: Gesamtkosten, Kosten pro Person, eine Tabelle mit Kosten pro Tag und Kosten pro Tag pro Person

#### Scenario: Kosten pro Mahlzeit
- **WHEN** der Benutzer die Tagesaufschlüsselung betrachtet
- **THEN** sind die Kosten pro Mahlzeit (Frühstück, Mittag, Abend, Snack) innerhalb jedes Tages sichtbar

#### Scenario: Unvollständige Preisdaten
- **WHEN** nicht alle Zutaten einen Preis haben
- **THEN** wird ein Hinweis angezeigt, dass die Kosten geschätzt sind, mit Angabe der Abdeckung
