# context-recipe-suggestions Specification

## ADDED Requirements

### Requirement: Kontext-Vorschlags-Endpunkt

Das System SHALL einen API-Endpunkt `GET /api/meal-plans/{plan_id}/meal/{meal_id}/suggestions` bereitstellen, der genau 9 kontextbewusste Rezeptvorschläge für eine bestimmte Mahlzeit liefert.

#### Scenario: Erfolgreicher Aufruf

- **WHEN** ein authentifizierter User GET `/api/meal-plans/42/meal/123/suggestions` aufruft
- **THEN** returned der Endpunkt 9 Rezeptvorschläge in 3 Kategorien (top_picks, variety, discovery)
- **THEN** jeder Vorschlag enthält: id, title, slug, image_url, recipe_type, recipe_badge, reason, reason_text, usage_count, price_per_serving

#### Scenario: Nicht authentifiziert

- **WHEN** ein nicht-authentifizierter User den Endpunkt aufruft
- **THEN** returned der Endpunkt 401

#### Scenario: Nicht berechtigt

- **WHEN** ein User den Endpunkt für einen Plan aufruft, dessen Owner/Collaborator er nicht ist
- **THEN** returned der Endpunkt 403

#### Scenario: Mahlzeit existiert nicht

- **WHEN** ein User den Endpunkt mit einer nicht-existierenden meal_id aufruft
- **THEN** returned der Endpunkt 404

### Requirement: Harte Filter

Das System SHALL vor dem Scoring harte Filter anwenden. Rezepte, die diese Filter nicht passieren, werden komplett ausgeschlossen.

#### Scenario: Nur approved und eigene Rezepte

- **WHEN** Vorschläge generiert werden
- **THEN** werden nur Rezepte mit status="approved" UND owner=null (system verified) ODER owner=request.user (eigene Rezepte) berücksichtigt

#### Scenario: Bereits im Plan ausgeschlossen

- **WHEN** ein Rezept bereits in irgendeiner Mahlzeit desselben Plans vorkommt
- **THEN** wird es von den Vorschlägen ausgeschlossen

#### Scenario: Meal-Type Mapping

- **WHEN** die Mahlzeit meal_type="breakfast" hat
- **THEN** werden nur Rezepte mit recipe_type in ["breakfast", "drink", "dessert"] vorgeschlagen
- **WHEN** die Mahlzeit meal_type="lunch" oder "dinner" hat
- **THEN** werden nur Rezepte mit recipe_type in ["warm_meal", "cold_meal", "soup", "salad", "side", "drink"] vorgeschlagen
- **WHEN** die Mahlzeit meal_type="snack" hat
- **THEN** werden nur Rezepte mit recipe_type in ["snack", "drink", "dessert"] vorgeschlagen

#### Scenario: Nutritional Tags als harter Filter

- **WHEN** der MealPlan nutritional_tags hat (z.B. "vegan", "halal")
- **THEN** werden nur Rezepte vorgeschlagen, deren Zutaten ALLE diese Tags erfüllen
- **WHEN** der MealPlan keine nutritional_tags hat
- **THEN** werden keine tag-basierten Filter angewandt

### Requirement: Scoring-Engine

Das System SHALL eine Scoring-Engine bereitstellen, die Kandidaten-Rezepte nach 5 Dimensionen bewertet.

#### Scenario: Saison-Score

- **WHEN** ein Rezept im August 4 von 5 Zutaten in der Saison hat (z.B. Tomaten, Gurken, Paprika)
- **THEN** bekommt es einen season_score von 0.8 × 30 = 24 Punkten
- **WHEN** ein Rezept keine Zutaten mit Saison-Daten hat
- **THEN** bekommt es 0 Punkte für season_score (neutral)

#### Scenario: Popularitäts-Score

- **WHEN** ein Rezept im 90. Percentil des usage_count liegt
- **THEN** bekommt es 0.9 × 25 = 22.5 Punkte
- **WHEN** ein Rezept usage_count=0 hat
- **THEN** bekommt es 0 Punkte

#### Scenario: Abwechslungs-Score

- **WHEN** ein Rezept keine gemeinsamen Hauptzutaten mit bereits im Plan enthaltenen Rezepten hat
- **THEN** bekommt es 20 Punkte
- **WHEN** ein Rezept alle Hauptzutaten mit einem bereits geplanten Rezept teilt
- **THEN** bekommt es 0 Punkte

#### Scenario: Rezenz-Score

- **WHEN** ein Rezept in den letzten 30 Tagen nicht vom User verwendet wurde
- **THEN** bekommt es 15 Punkte
- **WHEN** ein Rezept gestern vom User verwendet wurde
- **THEN** bekommt es 0 Punkte

#### Scenario: Budget-Score

- **WHEN** der Plan ein Budget hat und das Rezept darunter liegt
- **WHEN** der Plan kein Budget hat
- **THEN** bekommt es 10 Punkte (neutral)
- **WHEN** der Plan ein Budget hat und das Rezept 50% darüber liegt
- **THEN** bekommt es 0 Punkte

### Requirement: Kategorisierung der Vorschläge

Das System SHALL die 9 Vorschläge in 3 Kategorien einteilen: top_picks, variety, discovery.

#### Scenario: Top-Picks

- **WHEN** die Top 3 scoring-Rezepte von mindestens 2 verschiedenen recipe_types stammen
- **THEN** werden diese 3 als top_picks markiert
- **WHEN** die Top 3 nur einen recipe_type abdecken
- **THEN** wird das drittplatzierte durch das nächsthöhere eines anderen recipe_types ersetzt

#### Scenario: Variety

- **WHEN** top_picks vergeben sind
- **THEN** werden 3 Rezepte mit minimaler Zutaten-Überschneidung zu top_picks als variety markiert
- **THEN** variety-Rezepte haben unterschiedliche recipe_types zueinander

#### Scenario: Discovery

- **WHEN** variety vergeben ist
- **THEN** werden 3 Rezepte aus den verbleibenden Kandidaten mit Bonus für niedrigen usage_count als discovery markiert
- **THEN** discovery-Rezepte haben einen usage_count unter dem Median

#### Scenario: Weniger als 9 Kandidaten

- **WHEN** nach harten Filtern nur 5 Rezepte übrig sind
- **THEN** werden 2 als top_picks, 2 als variety, 1 als discovery kategorisiert
- **WHEN** nur 1 Rezept übrig ist
- **THEN** wird es als top_picks kategorisiert, variety und discovery sind leer

### Requirement: KI-Reranking (optional)

Das System SHALL optional ein KI-Reranking unterstützen, bei dem Gemini die Top 15 Scoring-Ergebnisse auf 9 reranked.

#### Scenario: KI-Enhancement aktiv

- **WHEN** der Query-Parameter `ai_enhance=true` gesetzt ist
- **THEN** werden die Top 15 Scoring-Ergebnisse an Gemini gesendet
- **THEN** Gemini returned 9 rerankte Rezepte mit Kategorisierung und reason_text
- **THEN** das Response-Feld `ai_enhanced` ist true

#### Scenario: KI-Fehler (Fallback)

- **WHEN** `ai_enhance=true` gesetzt, aber Gemini nicht erreichbar ist
- **THEN** wird auf das rein algorithmische Scoring zurückgefallen
- **THEN** das Response-Feld `ai_enhanced` ist false

#### Scenario: KI deaktiviert (Default)

- **WHEN** `ai_enhance` nicht gesetzt oder false ist
- **THEN** werden rein algorithmische Vorschläge geliefert
- **THEN** das Response-Feld `ai_enhanced` ist false

### Requirement: Reason-Feld

Jeder Vorschlag SHALL ein `reason`-Feld (Kurzform) und ein `reason_text`-Feld (lesbarer Text) enthalten.

#### Scenario: Reason-Werte

- **WHEN** ein Rezept wegen Saisonalität vorgeschlagen wird
- **THEN** ist reason="season" und reason_text="Im August besonders beliebt"
- **WHEN** ein Rezept wegen hoher Popularität vorgeschlagen wird
- **THEN** ist reason="popular" und reason_text="Das beliebteste Rezept seiner Kategorie"
- **WHEN** ein Rezept wegen Abwechslung vorgeschlagen wird
- **THEN** ist reason="variety" und reason_text="Eine gute Abwechslung zu den anderen Gerichten"
- **WHEN** ein Rezept wegen Budget-Freundlichkeit vorgeschlagen wird
- **THEN** ist reason="budget_friendly" und reason_text="Besonders günstig pro Portion"
- **WHEN** ein Rezept als Entdeckung vorgeschlagen wird
- **THEN** ist reason="discovery" und reason_text="Ein Geheimtipp, den du vielleicht noch nicht kennst"

### Requirement: IngredientSeason Modell

Das System SHALL ein IngredientSeason-Modell bereitstellen, das saisonale Verfügbarkeit von Zutaten abbildet.

#### Scenario: Modell-Struktur

- **WHEN** ein IngredientSeason-Eintrag angelegt wird
- **THEN** enthält er: ingredient FK, month (1-12), is_high_season (Boolean, default=True)
- **THEN** hat er einen UniqueConstraint auf (ingredient, month)

#### Scenario: Saison-Score Berechnung

- **WHEN** ein Rezept 10 Zutaten hat, davon 4 mit IngredientSeason-Einträgen für den aktuellen Monat
- **THEN** hat es einen season_score von 4/10 = 0.4
- **WHEN** ein Rezept 10 Zutaten hat, aber keine mit Saison-Einträgen
- **THEN** wird es als "neutral" behandelt (season_score = 0, kein Malus)
- **WHEN** ein Rezept 10 Zutaten hat, davon 2 mit is_high_season=true im aktuellen Monat
- **THEN** zählen diese 2 als "in season"

### Requirement: Response-Schema

Der Endpunkt SHALL ein einheitliches Response-Schema verwenden.

#### Scenario: Erfolgs-Response

- **WHEN** der Endpunkt erfolgreich aufgerufen wird
- **THEN** hat die Response folgende Struktur:
```json
{
  "suggestions": {
    "top_picks": [
      {
        "id": 1,
        "title": "Nudelsalat",
        "slug": "nudelsalat",
        "image_url": "/media/...",
        "recipe_type": "cold_meal",
        "recipe_badge": "verified",
        "reason": "season",
        "reason_text": "Im August besonders beliebt",
        "usage_count": 42,
        "price_per_serving": 2.50
      }
    ],
    "variety": [...],
    "discovery": [...]
  },
  "total": 9,
  "ai_enhanced": false,
  "meal_type": "lunch",
  "day_number": 3
}
```

### Requirement: Frontend-Integration

Das Frontend SHALL die kontextbewussten Vorschläge im RecipeSearchDialog als Standard-Ansicht anzeigen.

#### Scenario: Dialog öffnet mit Vorschlägen

- **WHEN** ein User den "Rezept oder Zutat wählen"-Button in einer MealSlot klickt
- **THEN** wird der RecipeSearchDialog geöffnet
- **THEN** wird der neue Endpunkt aufgerufen
- **THEN** werden die 9 Vorschläge als 3×3 Grid angezeigt
- **THEN** jeder Vorschlag zeigt: Bild, Titel, recipe_badge, reason_text
- **THEN** die Suche bleibt als Tab/Button verfügbar ("Alle Rezepte durchsuchen")

#### Scenario: Vorschlag auswählen

- **WHEN** ein User auf einen Vorschlag klickt
- **THEN** wird der RecipePreviewInline geöffnet (gleicher Flow wie bisher)
- **THEN** nach "Hinzufügen" wird der Vorschlags-Endpunkt erneut aufgerufen (aktualisiert, da das Rezept jetzt im Plan ist)
