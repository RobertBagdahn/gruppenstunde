## Context

Der Gesundheits-Tab der Rezept-Detailseite (`/recipes/<slug>`) enthält einen Abschnitt „Verbesserungsvorschläge", der von der Komponente `RecipeImprovements` befüllt wird. Diese ruft `GET /api/recipes/{id}/improvements/` auf, dessen Antwort durch `compute_improvement_ranking()` in `improvement_ranking_service.py` erzeugt wird.

Der Service kombiniert zwei Quellen: Nutri-Score-Simulation und Rule-basierte Hinweise. Für Getränke und andere Rezepttypen ohne anwendbare Regeln, und wenn alle Nährwerte 0,0 sind (Nutri-Score-Simulation überspringt jeden Parameter mit `current_value == 0`), liefert der Service:

```json
{ "items": [], "all_good": false, "message": "" }
```

Das Frontend hat drei Render-Zweige: Skeleton, `all_good`-Karte, Item-Liste. Den vierten Zustand (`items == []`, `all_good == false`) behandelt niemand — der Abschnitt bleibt lautlos leer.

Ein identisches Muster existiert bereits in `RecipeRulesBox`: das `RecipeRulesOut`-Schema hat ein `is_applicable`-Flag und ein `message`-Feld. Bei `is_applicable == false` rendert die Box eine erklärende Info-Karte. Dasselbe Muster wird hier auf `ImprovementListOut` übertragen.

**Betroffene Dateien:**
- `backend/recipe/services/improvement_ranking_service.py`
- `backend/recipe/schemas/nutrition.py`
- `frontend-food/src/schemas/recipe.ts`
- `frontend-food/src/components/recipe/RecipeImprovements.tsx`

## Goals / Non-Goals

**Goals:**
- `ImprovementListOut` erhält ein `is_applicable: bool`-Feld und ein befülltes `message`-Feld für alle Leer-Fälle
- `compute_improvement_ranking()` klassifiziert den Grund für `items == []` und setzt `message` entsprechend
- `RecipeImprovements.tsx` rendert eine neutrale Info-Karte im 4. Zustand (`!all_good && items.length === 0`)
- Der stille `return null` bei API-Fehler wird durch einen minimalen Fehlerzustand ersetzt
- Zod-Schema in `frontend-food/src/schemas/recipe.ts` synchron zu Pydantic

**Non-Goals:**
- Keine echten Verbesserungsvorschläge für 0-Nährwert-Rezepte generieren (nicht sinnvoll)
- Keine LLM-Integration für diese Leer-Zustände
- Kein Zusammenführen/Deduplizieren mit dem `RecipeRulesBox`-Banner (die zwei Bereiche bleiben eigenständig)
- Keine Datenbankänderungen

## Decisions

### Entscheidung 1: `is_applicable`-Flag im Backend-Schema

**Gewählt:** Neues Feld `is_applicable: bool` in `ImprovementListOut`, analog zu `RecipeRulesOut`.

**Alternativen erwogen:**
- *Nur `message` befüllen, kein Flag*: Das Frontend müsste `message != ""` als Proxy nutzen — fragil, weil `message` auch bei guten Ergebnissen gesetzt sein könnte. Explizites Flag ist klarer.
- *Neues Enum-Feld `reason`*: Zu granular für den aktuellen Bedarf; `message` + `is_applicable` reicht.

**Rationale:** Spiegel des bewährten `RecipeRulesOut`-Musters. Konsistenz zwischen zwei verwandten Endpunkten erleichtert Wartung und Frontend-Logik.

### Entscheidung 2: Grund-Klassifikation im Service

`compute_improvement_ranking()` unterscheidet nach `items == []` drei Szenarien und setzt `message` + `is_applicable`:

| Szenario | `is_applicable` | `message` |
|---|---|---|
| `all_good == true` | `true` | `ALL_GOOD_MESSAGE` |
| Rezepttyp hat keine anwendbaren Regeln UND keine Nutri-Kandidaten | `false` | Typ-spezifische Erklärung |
| Nutri-Werte alle 0 (fehlende Nährwertdaten) | `true` | Hinweis auf fehlende Daten |
| Nichts Umsetzbares trotz vorhandener Daten | `true` | Generischer Hinweis |

Für „Rezepttyp nicht anwendbar" greift der Service auf dieselbe Logik wie `evaluate_recipe_rules()` zurück: kein einziger Rule-Match und alle Nutri-Kandidaten 0 aufgrund fehlender Grundwerte — das ist das Getränke-Muster.

**Konkrete Nachrichten (Deutsch):**
- Typ nicht anwendbar: `"Für diesen Rezepttyp werden Nährwert-Regeln im Essensplaner auf die gesamte Mahlzeit angewandt — nicht auf das Einzelrezept."`
- Fehlende Nährwertdaten: `"Keine Nährwertdaten für die Zutaten hinterlegt – sobald Nährwerte erfasst sind, erscheinen hier Vorschläge."`
- Nichts Umsetzbares: `"Keine konkreten Verbesserungen gefunden – das Rezept liegt in allen bewerteten Dimensionen im Rahmen."`

### Entscheidung 3: Frontend 4. Render-Zweig

Neuer Zweig direkt nach dem `all_good`-Zweig:

```
isLoading       → Skeleton
error || !data  → Fehlerkarte (minimaler Zustand)
data.all_good   → Grüne Erfolgskarte
!applicable || items==[] → Neutrale Info-Karte mit data.message
items.map(...)  → Verbesserungskarten
```

**Visuelle Gestaltung der Info-Karte:** Neutral (weder grün noch rot), `bg-muted/40 border-border`, Info-Icon (`info` Material Symbol), `data.message` als Text. Orientiert sich am `!is_applicable`-Block in `RecipeRulesBox.tsx`.

### Entscheidung 4: Fehlerbehandlung

Aktuell: `if (error || !data) return null` — völlig lautlos.
Neu: Kleine Fehlerkarte `"Verbesserungsvorschläge konnten nicht geladen werden."` mit Retry-Möglichkeit (TanStack Query `refetch`). Kein aufwendiges Error-Boundary.

## Risks / Trade-offs

**[Risiko] Falsche Klassifikation im Service** — Der Service bestimmt `is_applicable` heuristisch (keine explizite Typ-Whitelist). Wenn ein neuer Rezepttyp eingeführt wird, der zufällig keine Nährwertdaten hat, könnte er als „nicht anwendbar" eingestuft werden.
→ *Mitigation:* Die Klassifikation prüft explizit, ob `nutri_candidates` leer sind UND `hint_matches` leer sind UND alle gecachten Nährwerte ≤ 0. Das ist ein starkes Signal; Fehlklassifikationen sind unwahrscheinlich.

**[Trade-off] Zwei Erklärungsorte** — Der `RecipeRulesBox`-Banner erklärt das Gleiche am Seitenende. Nach dem Fix gibt es zwei Stellen, die erklären, warum keine Auswertung stattfindet.
→ *Akzeptiert:* Beide Bereiche (Verbesserungsvorschläge im HealthTab, Rezeptregeln als eigenständige Box) sind konzeptuell getrennt und haben unterschiedliche Nutzer-Stories. Die Redundanz ist vertretbar und könnte in einem späteren Refactoring aufgeräumt werden.

**[Risiko] Pydantic/Zod-Desync** — `is_applicable` wird im Backend als `bool` eingeführt; falls das Zod-Schema nicht synchron aktualisiert wird, schlagen Frontend-Validierungen lautlos fehl (Zod ignoriert unbekannte Felder standardmäßig).
→ *Mitigation:* Tasks schreiben Schema-Sync als expliziten Schritt vor dem Frontend-Task.
