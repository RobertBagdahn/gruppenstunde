## Why

Die Rezeptvorschläge im Essensplan erkennen nicht, ob es ein Sommerlager, eine Wochenendfahrt oder eine normale Gruppenstunde ist. Sie berücksichtigen weder den Lagertyp (Equipment, Wetter, Aktivitätslevel) noch die Stimmung oder die konkrete Beschreibung des Events. Das führt zu generischen Vorschlägen — z.B. aufwändige Ofengerichte für ein Lager ohne Küche. Der bestehende KI-Reranking-Mechanismus (Gemini) bekommt zu wenig Kontext, um wirklich gute Entscheidungen zu treffen.

## What Changes

- **Neues MealPlan-Tag-Feld** — eigenständiges Tag-Modell oder einfaches Text-Array auf MealPlan (nicht content.Tag), damit Nutzer dem Plan Kontext geben können (z.B. `sommerlager`, `lagerfeuer`, `wenig_küche`)
- **Erweiterter Gemini-Prompt** — Gemini erhält nicht nur 15 Kandidaten, sondern:
  - Den kompletten Event-Kontext (Titel, Beschreibung, Datum, alle Tags)
  - Die MealPlan-Tags + Beschreibung
  - Den aktuell geplanten Essensplan (was gibt's schon? wie oft Nudeln?)
  - **Top 30 Kandidaten** (gemischt, nicht pro Typ) statt Top 15
- **Gemini wird primärer Vorschlagsweg** — nicht mehr nur optionales Reranking, sondern der Standard
- **Algorithmisches Scoring bleibt als Vorauswahl** — die bestehenden 5 Dimensionen filtern weiterhin auf Top 30
- **Keine Feedback-Schleife** — jeder Prompt ist frisch

## Capabilities

### New Capabilities
- `meal-plan-tags`: Nutzer können dem MealPlan Tags hinzufügen (eigenes Tag-System, nicht content.Tag), die als Kontext an Gemini übergeben werden

### Modified Capabilities
- `context-recipe-suggestions`: Der Gemini-Prompt wird um Event-Kontext, MealPlan-Tags, Beschreibung und den gesamten geplanten Essensplan erweitert. Die Kandidatenanzahl steigt von 15 auf 30. Gemini-Enhancement wird zum Standard.

## Impact

- **Backend**: `planner/models/` — neues Tag-Modell für MealPlan (oder JSON-Feld). `planner/services/intelligent_suggestions_service.py` — Prompt-Engine erweitern. `planner/api/meal_plan.py` — CRUD-Endpunkte für Tags.
- **Backend**: `planner/schemas/` — neue Pydantic-Schemas für Tags + erweitertes IntelligentSuggestionOut
- **Frontend**: `frontend-food/src/` — UI zur Tag-Pflege im SettingsPanel, erweiterte Suggestions-Anzeige
- **Migrations**: Neue Tabelle für MealPlan-Tags
- **Keine Breaking Changes** — bestehende API-Endpunkte bleiben erhalten, Response wird nur um Kontext-Felder erweitert
