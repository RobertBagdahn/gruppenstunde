## Context

Die bestehende Vorschlags-Engine in `IntelligentSuggestionsService` verwendet 5 Scoring-Dimensionen (Saison, Popularität, Abwechslung, Rezenz, Budget) und übergibt optional Top 15 an Gemini für ein Reranking. Die Vorschläge sind aber generisch, weil Gemini kaum Kontext bekommt — nur Rezeptdaten, keinen Event-Kontext, keine MealPlan-Beschreibung, keine Tags.

Dieses Design erweitert den Gemini-Prompt massiv und führt MealPlan-Tags als vom Nutzer pflegbare Kontextquelle ein.

## Goals / Non-Goals

**Goals:**
- Nutzer können MealPlan-Tags vergeben (z.B. `sommerlager`, `lagerfeuer`, `wenig_küche`)
- Gemini bekommt vollen Kontext: Event-Daten, Tags, Beschreibung, gesamter Essensplan, Top 30 Kandidaten
- Gemini-Vorschläge werden zum Standard (nicht mehr optional)
- Algorithmisches Scoring bleibt als Vorauswahl für die Top-30-Kandidaten erhalten
- Tags im Frontend pflegbar (SettingsPanel)

**Non-Goals:**
- Kein Feedback-Loop / Lernen aus Ablehnungen
- Keine Änderung am algorithmischen Scoring selbst
- Keine Änderung an der bestehenden Frontend-UI für Vorschläge (nur Erweiterung)
- Kein Event-Typ-Taxonomie (Tags ersetzen das)

## Decisions

### Decision: MealPlanTag als eigenes Model statt JSON-Feld
- **Wahl**: Neues Model `MealPlanTag` mit `name` (CharField) + `meal_plan` (FK, CASCADE) + UniqueConstraint(meal_plan, name)
- **Alternativen**: JSONField auf MealPlan, simpler Tag-String
- **Rationale**: Validierbar, indizierbar, saubere CRUD-API, einfach erweiterbar

### Decision: Prompt-Architektur — Alles in einen Call
- **Wahl**: Ein Gemini-Call mit komplettem Kontext
- **Alternativen**: Multi-Turn (erst Kategorien, dann Rezepte), separates Context-Embedding
- **Rationale**: Einfachster Weg, Gemini hat maximale Information

### Decision: Top 30 Kandidaten (gemischt) statt Top 15
- **Wahl**: Nach hartem Filter + Scoring → Top 30 Kandidaten, gemischt (nicht nach Rezepttyp getrennt)
- **Alternativen**: Top 15 wie bisher, Top 50 (zu viele Token)
- **Rationale**: Gemini bekommt genug Auswahl, ohne das Tokens-Limit zu sprengen

### Decision: ai_enhance Query-Parameter bleibt, wird aber zum Default
- **Wahl**: `ai_enhance` heißt jetzt `context_enhance`, Default `true`. Bei `false` wird rein algorithmisch gescort + kategorisiert (wie bisher ohne Gemini)
- **Alternativen**: Neuer Endpunkt komplett, Breaking Change am Query-Parameter
- **Rationale**: Abwärtskompatibel, Fallback bei Gemini-Ausfall

### Decision: Tags live in den Prompt interpolieren
- **Wahl**: Tags werden als deutscher Satz in den Prompt eingebaut (z.B. "Der Nutzer hat diesen Plan mit folgenden Tags markiert: sommerlager, lagerfeuer, wenig_küche")
- **Alternativen**: Tags als JSON-Array
- **Rationale**: Prompt-Sprache ist Deutsch, natürlicher für Gemini

## Risks / Trade-offs

- **[Cost] Mehr Tokens pro Call** → Gemini Flash-Lite ist günstig (~$0.03/1M Input Tokens). Ein Prompt mit Event + Plan + 30 Rezepten sind ca. 3-5k Tokens. Selbst bei 1000 Calls/Monat < $0.50.
- **[Latency] Gemini-Call blockiert API-Response** → Aktuell schon so (ai_enhance=true). Wir können timeout+Fallback beibehalten.
- **[Quality] Gemini wählt suboptimale Rezepte** → Fallback auf algorithmisches Scoring wenn Gemini fehlschlägt oder Müll liefert.
- **[Flexibility] Tags sind frei, nicht normiert** → Nutzer könnten irrelevante Tags vergeben. Aber das ist Feature, kein Bug — maximale Flexibilität.
- **[Data volume] Essenplan serialisieren** → Wir serialisieren nur Meal + Recipe-Titel + MealItem-Recipes (keine Full-Recipe-Objects)
