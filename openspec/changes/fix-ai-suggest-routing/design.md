## Context

Die `POST /api/meal-plans/ai-suggest/` Route ist durch eine Routing-Kollision blockiert. Django Ninja generiert für `/{meal_plan_id}/` (mit `meal_plan_id: int`) ein URL-Pattern, das auch Strings wie `ai-suggest` matched. Da `meal_plan_router` vor `ai_suggest_router` registriert ist, fängt `GET /{meal_plan_id}/` die Anfrage ab und retourniert 405 (Method Not Allowed).

```ascii
Aktuell (urls.py Zeile 62-64):
  api.add_router("/meal-plans/", meal_plan_router)   # GET /{id}/ fängt "ai-suggest" ab
  api.add_router("/meal-plans/", ref_meal_router)
  api.add_router("/meal-plans/", ai_suggest_router)   # POST /ai-suggest/ – unerreichbar
```

## Goals / Non-Goals

**Goals:**
- `POST /api/meal-plans/ai/suggest/` funktioniert zuverlässig
- Nicht-numerische `meal_plan_id` Werte geben 404 (nicht 405)
- Zukünftige AI-Endpunkte haben einen dedizierten Namespace
- Router-Reihenfolge als Konvention dokumentiert

**Non-Goals:**
- Keine Änderung an Request/Response-Schemas
- Keine neuen AI-Endpunkte (nur der bestehende wird vershoben)
- Kein Refactoring der MealPlan-API-Struktur

## Decisions

### 1. Namespace `/meal-plans/ai/` für AI-Endpunkte

Der Endpunkt wechselt von `POST /meal-plans/ai-suggest/` → `POST /meal-plans/ai/suggest/`.

**Begründung:** Ein eigener AI-Namespace verhindert zukünftige Kollisionen und schafft Platz für weitere AI-Features (z.B. `/meal-plans/ai/analyze/`, `/meal-plans/ai/optimize/`). Der Pfad `ai/` ist kurz und semantisch klar.

**Alternative verworfen:** Nur die Router-Reihenfolge zu tauschen wäre fragil – jeder neue spezifische Router müsste wieder vor `meal_plan_router` stehen.

### 2. Router-Reihenfolge in urls.py

`ai_suggest_router` und `ref_meal_router` werden vor `meal_plan_router` registriert:

```python
api.add_router("/meal-plans/", ai_suggest_router)   # POST /ai/suggest/ – zuerst
api.add_router("/meal-plans/", ref_meal_router)     # /{plan_id}/ref-meals/ – zweitens
api.add_router("/meal-plans/", meal_plan_router)    # /{meal_plan_id}/ – catch-all zuletzt
```

**Begründung:** Django Ninja registriert URLs in der Reihenfolge der `add_router`-Aufrufe. Explizite Pfade (`/ai/suggest/`, `/{plan_id}/ref-meals/`) müssen vor parametrisierten Pfaden (`/{meal_plan_id}/`) stehen, damit sie zuerst gematcht werden.

### 3. Path Converter für `meal_plan_id`

`meal_plan_id: int` wird im URL-Pattern beibehalten. Django Ninja generiert daraus bereits ein `[^/]+`-Pattern. Ein eigener Path Converter mit `\d+` wäre möglich, ist aber für diesen Fix nicht nötig – die Kombination aus Namespace + Router-Reihenfolge löst das Problem vollständig.

**Begründung:** `ai/suggest/` wird durch den Namespace nie wieder mit `/{meal_plan_id}/` kollidieren. Die Router-Reihenfolge stellt sicher, dass zuerst der explizite Pfad matched wird.

### 4. Kein separater Router für den AI-Namespace

Der `ai_suggest_router` bleibt ein einzelner Router. Der Namespace wird durch die URL-Pfad-Änderung realisiert (`/ai/suggest/` statt `/ai-suggest/`), nicht durch einen weiteren `add_router`-Aufruf.

**Alternative verworfen:** Einen eigenen `ai_router` zu erstellen und dort alle AI-Endpunkte zu sammeln wäre Overhead für einen einzigen Endpunkt.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Frontend-URL muss synchron geändert werden | Frontend-Änderung in Tasks explizit als separater Schritt dokumentiert |
| Tests referenzieren alte URL | Tests werden im selben Change aktualisiert |
| `ref_meal_router` könnte mit `/{meal_plan_id}/` kollidieren | `ref_meal_router` verwendet `{plan_id}` als Parametername – wenn `plan_id` auch `int` ist, gilt dasselbe Problem. `ref-meals/` im Pfad verhindert die Kollision jedoch. |
| Zukünftige Routen könnten erneut kollidieren | AGENTS.md-Konvention verhindert das |
