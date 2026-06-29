## ADDED Requirements

### Requirement: AI-Generierung via Gemini

Das System SHALL einen API-Endpoint `POST /api/meal-plans/ai-suggest/` bereitstellen, der einen Freitext-Prompt + Parameter entgegennimmt und eine strukturierte Liste von Tages-Vorschlägen mit existierenden Rezepten zurückgibt. Die Generierung erfolgt via Google Gemini (Vertex AI).

#### Scenario: Erfolgreiche AI-Generierung
- **WHEN** ein authentifizierter User `POST /api/meal-plans/ai-suggest/` mit gültigem Prompt, Personenanzahl, Tagesanzahl, Start-Datum und optionalen Ernährungstags aufruft
- **THEN** wird eine strukturierte Response mit einer Liste von Tagen und zugeordneten Mahlzeiten/Rezepten zurückgegeben
- **AND** alle zurückgegebenen recipe_ids existieren in der Datenbank

### Requirement: Request-Schema for AI Generation

Der Endpoint SHALL folgende Parameter akzeptieren:

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `prompt` | string | ja | Freitext-Beschreibung des Lagers/der Verpflegung |
| `num_persons` | int | ja | Anzahl der Personen (1-500) |
| `num_days` | int | ja | Anzahl der Tage (1-30) |
| `start_date` | date | ja | Start-Datum des Essensplans |
| `nutritional_tag_ids` | list[int] | nein | IDs der Ernährungstags (vegan, glutenfrei, etc.) |
| `budget_per_person_per_day` | float | nein | Budget in Euro pro Person und Tag |

#### Scenario: Request ohne optionale Felder
- **WHEN** der Request keine `nutritional_tag_ids` und kein `budget_per_person_per_day` enthält
- **THEN** generiert die KI ohne diätetische Einschränkungen und ohne Budget-Vorgabe

#### Scenario: Request mit Ernährungstags
- **WHEN** der Request `nutritional_tag_ids=[1, 3]` enthält (vegan, glutenfrei)
- **THEN** generiert die KI nur Vorschläge, die den entsprechenden Ernährungstags entsprechen

### Requirement: Response-Schema for AI Generation

Der Endpoint SHALL folgende strukturierte Response zurückgeben:

```json
{
  "days": [
    {
      "date": "2026-08-14",
      "meals": [
        { "meal_type": "breakfast", "recipe_id": 42, "recipe_title": "Haferporridge mit Beeren" },
        { "meal_type": "lunch", "recipe_id": 128, "recipe_title": "Kartoffelsuppe" },
        { "meal_type": "dinner", "recipe_id": 256, "recipe_title": "Veganes Curry mit Reis" },
        { "meal_type": "snack", "recipe_id": 384, "recipe_title": "Obstspieße" }
      ]
    }
  ]
}
```

Pro Tag SHALL mindestens `breakfast`, `lunch` und `dinner` vorgeschlagen werden. `snack` ist optional.

#### Scenario: Response enthält alle Pflicht-Mahlzeiten pro Tag
- **WHEN** die AI-Generierung erfolgreich war
- **THEN** enthält jeder Tag mindestens breakfast, lunch und dinner

#### Scenario: Alle recipe_ids sind validiert
- **WHEN** die AI-Generierung abgeschlossen ist
- **THEN** werden alle recipe_ids gegen die Datenbank validiert
- **AND** nicht-existente recipe_ids werden aus der Response entfernt

### Requirement: Gemini-Prompt-Konstruktion

Das Backend SHALL einen strukturierten Prompt für Gemini konstruieren, der folgende Informationen enthält:
- User-Prompt (Freitext)
- Personenanzahl und Tagesanzahl
- Diätetische Einschränkungen (aus NutritionalTags)
- Budget-Vorgabe (falls gesetzt)
- Anweisung, NUR existierende Rezepte aus der Datenbank vorzuschlagen
- Anweisung, das JSON-Output-Format einzuhalten

Die Ausgabe SHALL per Pydantic-Schema validiert werden, bevor sie an den Client geht.

#### Scenario: Prompt enthält alle Kontext-Informationen
- **WHEN** der Gemini-Call ausgeführt wird
- **THEN** enthält der Prompt alle vom User übergebenen Parameter sowie die Anweisung zum JSON-Output-Format

#### Scenario: Gemini-Response ist ungültiges JSON
- **WHEN** die Gemini-Response nicht als valides JSON geparst werden kann
- **THEN** wird ein 502 Bad Gateway mit Fehlermeldung „AI-Antwort konnte nicht verarbeitet werden" zurückgegeben

### Requirement: Timeout-Handling

Der AI-Endpoint SHALL ein Timeout von 60 Sekunden haben. Bei Überschreitung SHALL ein 504 Gateway Timeout mit der Möglichkeit zum erneuten Versuch zurückgegeben werden.

#### Scenario: Timeout bei AI-Call
- **WHEN** der Gemini-Call länger als 60 Sekunden dauert
- **THEN** wird ein 504 Gateway Timeout zurückgegeben

#### Scenario: Erfolgreicher Retry nach Timeout
- **WHEN** ein User nach einem Timeout den gleichen Request erneut sendet
- **THEN** wird der Gemini-Call erneut ausgeführt
