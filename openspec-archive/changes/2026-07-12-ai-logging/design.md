## Context

Die Plattform führt sämtliche Gemini-AI-Calls über einen zentralen Wrapper (`core/services/gemini.py`) aus. Jeder Call wird automatisch als `AiInteraction`-Record in der DB gespeichert. Aktuell fehlen jedoch Token-Zählung, Kostenberechnung, eine durchsuchbare Admin-Oberfläche und eine flächendeckende Vote-Propagation.

**Aktueller Datenfluss:**
```
API Endpoint → Domain Service → gemini_call() → _create_interaction()
                                                    ↓
                                              Gemini API
                                                    ↓
                                         _update_interaction()
                                                    ↓
                                   (interaction_id wird meist verworfen)
```

**Eingesetzte Modelle und Preise (Vertex AI Global, USD, Juli 2026):**

| Modell (Code) | Typ | Input/1M | Output/1M |
|---|---|---|---|
| `gemini-3.1-flash-lite` | Text | $0,25 | $1,50 |
| `gemini-3.1-flash-image-preview` | Bild | $0,25 | $1,50 (+ $30/1M Image-Output) |
| `gemini-embedding-001` | Embedding | $0,00015 | — |

## Goals / Non-Goals

**Goals:**
- Token-Extraktion aus `GenerateContentResponse.usage_metadata` bei jedem `gemini_call()`/`gemini_image_call()`
- Kostenberechnung in € basierend auf Modell-Preis-Tabelle mit festem USD→EUR-Kurs
- Paginierter Admin-Log mit Prompt/Response-Expand, Filter und Fehlersuche
- Kosten-pro-User-Ansicht (nur User-Calls, ohne Background)
- `ai_interaction_id` in allen 15 KI-API-Responses → flächendeckende Votes
- Internes Embedding-Logging ohne Signatur-Bruch

**Non-Goals:**
- Realtime-Kosten-Dashboard mit Charts (nur tabellarische Ansichten)
- Automatische Budget-Warnungen per E-Mail
- Kosten-Abrechnungs-API für End-User
- Retention-Policy / automatisches Löschen alter Logs
- Per-User-Rate-Limits basierend auf Kosten

## Decisions

### Decision 1: Token-Felder als nullable IntegerField

**Gewählt:** `prompt_tokens`, `completion_tokens`, `total_tokens`, `thoughts_tokens` als `IntegerField(null=True, default=None)`.

**Alternativen verworfen:**
- `PositiveBigIntegerField`: Overkill, Gemini-Tokens pro Call sind immer <1M
- Ein einziges JSON-Feld `token_breakdown`: Weniger queryable, keine Indizes möglich

**Begründung:** Einzelfelder erlauben SQL-Aggregation (`SUM(prompt_tokens)`) für Stats. Nullable weil Fehler-Calls keine Tokens haben.

### Decision 2: cost_eur als DecimalField(10,6)

**Gewählt:** `DecimalField(max_digits=10, decimal_places=6, null=True)`. 10×10^-6 = max 9999,999999€ pro Call. Bei 1,50€/1M Tokens × 1M Tokens = max 1,50€ — 10 Digits reichen weit.

**Alternativen verworfen:**
- `FloatField`: Rundungsfehler bei Geld
- `IntegerField` in Mikro-Cent: Unlesbar im Admin

**Begründung:** Decimal ist der Django-Standard für Geldbeträge, 6 Nachkommastellen decken selbst Embedding-Kosten (0,00000015€) ab.

### Decision 3: Pricing-Table in Django Settings

**Gewählt:** Dictionary in `settings.py`:
```python
GEMINI_PRICING = {
    "gemini-3.1-flash-lite": {
        "type": "text",
        "input_per_1m_usd": 0.25,
        "output_per_1m_usd": 1.50,
    },
    "gemini-3.1-flash-image-preview": {
        "type": "image",
        "input_per_1m_usd": 0.25,
        "output_per_1m_usd": 1.50,
        "image_output_per_1m_usd": 30.0,
    },
    "gemini-embedding-001": {
        "type": "embedding",
        "input_per_1m_usd": 0.00015,
    },
}
USD_TO_EUR = 0.92
```

**Alternativen verworfen:**
- DB-Model: Admin-UI für Preisänderungen — overkill, Preise ändern sich selten
- Hardcoded in `gemini.py`: Kein environment-spezifisches Override möglich

**Begründung:** Settings-Dict ist einfach, versionierbar in Git, environment-overridable via `os.environ`.

### Decision 4: Kostenformel

```python
def calculate_cost(model: str, usage_metadata) -> Decimal:
    pricing = settings.GEMINI_PRICING.get(model)
    if not pricing or not usage_metadata:
        return None

    input_tokens = usage_metadata.prompt_token_count or 0
    output_tokens = (usage_metadata.candidates_token_count or 0) + (usage_metadata.thoughts_token_count or 0)

    if pricing["type"] == "image":
        # Image: bis zum Modality-Spike (Open Question 1) werden alle Tokens
        # mit Text-Raten abgerechnet. image_output_per_1m_usd ist vordefiniert
        # fuer die spaetere Aktivierung, wenn IMAGE-modality erkannt wird.
        input_cost = input_tokens / 1_000_000 * pricing["input_per_1m_usd"]
        output_cost = output_tokens / 1_000_000 * pricing["output_per_1m_usd"]  # Text-Rate bis Spike
    else:  # text, embedding
        input_cost = input_tokens / 1_000_000 * pricing["input_per_1m_usd"]
        output_cost = output_tokens / 1_000_000 * pricing.get("output_per_1m_usd", 0)

    cost_usd = Decimal(str(input_cost + output_cost))
    cost_eur = cost_usd * Decimal(str(settings.USD_TO_EUR))
    return cost_eur.quantize(Decimal("0.000001"))
```

**Begründung:** `Decimal(str(x))` vermeidet Float-Ungenauigkeit. `quantize(6)` rundet auf Mikro-Euro.

### Decision 5: Auth-Check vor Logging

**Gewählt:** In `gemini_call()` und `gemini_image_call()` wird `_check_auth()` VOR `_create_interaction()` aufgerufen. Auth-Fehler erzeugen keinen DB-Record.

**Vorher:** `_create_interaction()` → `_check_auth()` → bei 403: Record mit `error_code="auth_error"` bleibt.

**Begründung:** Reduziert Rauschen in der Log-Tabelle. Rate-Limit-Fehler werden weiterhin geloggt (der Call scheitert erst nach Auth-Erfolg am Limit).

### Decision 6: `is_background` als expliziter Parameter

**Gewählt:** Neuer Keyword-Parameter in `gemini_call()` / `gemini_image_call()`:
```python
def gemini_call(*, user=None, model, contents, is_background=False, ...):
```

Management-Commands setzen `is_background=True`. User-Requests (Default) setzen nichts. Das Feld wird im `AiInteraction`-Model gespeichert und in Admin-Stats/Kostenansichten aus-gefiltert.

**Nicht gewählt:** `is_background = bypass_limits` — das würde Admin-getriggerte Batch-Jobs fälschlich als Background markieren.

### Decision 7: `gemini_embed()` — internes Logging, Signatur unverändert

**Gewählt:** `gemini_embed()` erstellt intern einen `AiInteraction`-Record mit `is_background=True`, gibt aber weiterhin nur `list[float] | None` zurück. Keine `interaction_id` im Return-Typ.

**Begründung:** Kein Breaking Change für bestehende Aufrufer (embedding_service, management commands). Embeddings sind hochvolumig und brauchen keine Vote-Buttons.

### Decision 8: Admin-API-Design

**Drei neue Endpoints (Staff-only):**

1. `GET /api/content/admin/ai-interactions/` — Paginierte Liste
   - Query-Params: `page`, `page_size`, `context`, `user_id`, `success`, `is_background`, `has_vote`, `date_from`, `date_to`, `search`
   - Response: Standard-Pagination `{ items: AiInteractionItemOut[], total, page, page_size, total_pages }`
   - `AiInteractionItemOut`: id, context, model, user_name, created_at, total_tokens, cost_eur, duration_ms, success, error_code, vote, is_background (ohne prompt/response für Listen-Performance)

2. `GET /api/content/admin/ai-interactions/{id}/` — Detail mit Prompt + Response
   - Response: vollständiger Record inkl. prompt (JSON) und response (Text)
   - Nur bei Klick auf Expand im Frontend geladen

3. `GET /api/content/admin/ai-interactions/user-costs/` — Pro-User-Kosten
   - Filter: `is_background=False`, `user__isnull=False`
   - Response: Liste `{ user_id, user_name, total_calls, total_tokens, total_cost_eur, cost_30d_eur, vote_rate }`

 4. Erweiterter Stats-Endpoint (`admin/ai-interactions/stats/`):
    - Zusätzlich: `total_cost_eur`, `total_tokens_all`
    - Default: nur `is_background=False`. Mit `?include_background=true` auch System-Calls
    - `by_context`-Eintraege erhalten `total_cost_eur` und `total_tokens`

### Decision 9: ai_interaction_id-Propagation

**Gewählt:** Jeder Service, der `gemini_call()` aufruft, gibt die `interaction_id` an den API-Layer weiter. Der API-Layer fügt `ai_interaction_id: str | None` in das Response-Schema ein.

**Bei Multi-Call-Endpoints:** Nur der prominenteste Gemini-Call gibt seine ID weiter (z.B. bei `refurbish` der Haupt-Call, nicht der optionale Ingredient-Call).

**Schema-Konvention:** Alle AI-Response-Schemas erhalten:
```python
ai_interaction_id: str | None = None
```
Und im Frontend-Zod:
```typescript
ai_interaction_id: z.string().uuid().nullable().optional()
```

**Frontend-Komponenten:** `AiVoteButtons` wird in allen Komponenten eingebaut, die KI-Ergebnisse rendern:
- `ContentStepper` (improve_text, refurbish)
- `InlineEditor` (improve_text)
- `TitleImageEditor` (generate_image)
- `AiSuggestSupplyDialog` (suggest_supplies)
- `StepInvitationText` (event invitation)
- `PackingListDetailPage` (packing list AI)
- Recipe Wizard Steps (ai-create, ai-suggest-all)
- Ingredient Creation Stepper (ai-create, ai-suggest-all)
- Meal Plan Suggest Dialog

### Decision 10: Prompt-Trunkierung für Image-Calls

**Gewählt:** Der `prompt`-Eintrag im `AiInteraction`-Record wird vor dem Speichern auf Text-only gekürzt. Bild-Base64-Daten werden durch `[Bilddaten: {size} Bytes]` ersetzt.

**Implementierung:** In `_create_interaction()` prüfen, ob `contents` ein List mit Image-Parts enthält. Falls ja, Image-Parts aus JSON serialisieren aber mit Platzhalter statt Base64.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Gemini SDK-Update ändert `usage_metadata`-Struktur | `getattr` mit Default-Werten, graceful fallback auf `None` |
| Kosten-Ungenauigkeit durch veralteten USD→EUR-Kurs | Kurs in Settings → Environment-Override beim Deploy möglich |
| Image-Generation pricing vom SDK falsch gemeldet | `pricing_model`-Feld dokumentiert verwendete Rate; manuell nachvollziehbar |
| `AiInteraction`-Tabelle wächst unbegrenzt | Kein Auto-Cleanup (Non-Goal), aber Admin kann manuell löschen |
| Prompt/Response-Daten enthalten User-PII | Staff-only Zugriff, Klartext-Anzeige (bewusste Entscheidung) |
| 13 Schema-Änderungen → Merge-Konflikte mit parallelen Changes | Früh im Cycle deployen, vor anderen Feature-Branches |

## Migration Plan

1. Migration für AiInteraction-Model (7 neue nullable Felder) → rückwärtskompatibel, bestehende Daten bleiben
2. Settings-Update in `backend/inspi/settings.py`
3. Gemini-Wrapper-Refactoring in `core/services/gemini.py`
4. Deploy: Kein Downtime, bestehende Calls funktionieren ohne Token-Felder weiter

## Open Questions

1. **Image-Pricing-Token-Mapping:** Die `usage_metadata` für Image-Calls wurde noch nicht verifiziert (Spike nur für Text). Zeigt sie `modality='IMAGE'` oder werden Images als Text-Tokens gezählt? → Im ersten Task nach dem Spike entscheiden, ob `image_output_per_1m_usd` ($30/1M) aktiviert wird. Bis dahin werden alle Image-Tokens mit Text-Raten ($1,50/1M) berechnet (konservative Unterschätzung).
2. **Embedding pricing:** `gemini-embedding-001` pricing ist $0,00015/1M Input. Ob der embedding-Endpoint `usage_metadata` returned, ist ungetestet. → Im Embedding-Task verifizieren.
3. **Client-Unavailable:** Wenn `_get_client()` `None` returned (GOOGLE_CLOUD_PROJECT nicht gesetzt), wird der AiInteraction-Record jetzt mit `error_code="client_unavailable"` markiert (vorher: kein error_code).
