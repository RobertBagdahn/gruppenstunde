## Context

Gemini API calls are spread across 8 files in 6 Django apps. Each service creates its own `genai.Client` instance and handles errors independently. There is no global call budget — the only protection is per-user limits in some services and catching 429s reactively from Google. The app runs on Cloud Run (multiple instances), so any global state must use Django cache (Redis).

## Goals / Non-Goals

**Goals:**
- Single entry point for all Gemini text generation calls with global rate limiting (100 calls / 15 min)
- Enforce authentication on all AI features
- Centralize error handling (429, invalid response, timeout)
- Keep per-user limits in services that already have them

**Non-Goals:**
- Changing the Gemini models used by each service
- Adding per-user global limits (services handle their own)
- Frontend changes (429 responses already handled by error-handling spec)
- Rate limiting embeddings calls (separate concern, different quota)
- Queuing or retry logic when limit is hit

## Decisions

### 1. New module: `core/services/gemini.py`

A single module providing `gemini_call()` and `gemini_image_call()`.

**Why `core/`**: Cross-cutting concern used by all apps. The `core` app already exists for shared utilities.

**Alternative considered**: A decorator on each service method — rejected because it doesn't prevent direct `genai.Client` usage and is harder to enforce.

### 2. Function signature

```python
def gemini_call(
    *,
    user: AbstractBaseUser,
    model: str,
    contents: str | list,
    config: types.GenerateContentConfig | None = None,
) -> types.GenerateContentResponse:
```

```python
def gemini_image_call(
    *,
    user: AbstractBaseUser,
    model: str,
    contents: str | list,
    config: types.GenerateContentConfig | None = None,
) -> types.GenerateContentResponse:
```

**Why pass `user` explicitly**: Makes auth enforcement unavoidable at the call site. If you don't have a user, you can't call Gemini.

### 3. Fixed-window rate limiting via Django cache

```python
GLOBAL_LIMIT = 100
WINDOW_SECONDS = 900  # 15 min

def _check_global_limit() -> None:
    key = "gemini_global_calls"
    count = cache.get(key, 0)
    if count >= GLOBAL_LIMIT:
        raise GeminiRateLimitError()
    cache.set(key, count + 1, timeout=WINDOW_SECONDS)
```

**Why fixed window over sliding window**: Simpler, good enough for cost protection. Worst case: 200 calls in a 15-min span at window boundary — acceptable.

**Why Django cache**: Works across Cloud Run instances (backed by Redis in production).

### 4. Auth check raises `HttpError(403)`

```python
if not user.is_authenticated:
    raise HttpError(403, "Anmeldung erforderlich")
```

### 5. Error handling consolidation

Move the `_handle_gemini_exception` pattern from `ai_service.py` into the central module. All services get consistent error handling:
- Google 429 → `HttpError(429, "KI-Limit erreicht...")`
- Invalid/empty response → `HttpError(502, "KI-Antwort ungültig...")`
- Connection errors → `HttpError(503, "KI nicht erreichbar...")`

### 6. Two separate clients (text vs image)

The image model (`gemini-3.1-flash-image-preview`) requires a separate client in some configurations. Keep two lazy-initialized module-level clients.

**Files affected:**
- `backend/core/services/gemini.py` (new)
- `backend/content/services/ai_service.py` (remove `_get_client`, `_get_image_client`, `_handle_gemini_exception`)
- `backend/content/services/ai_supply_service.py` (remove client creation)
- `backend/recipe/services/suggestion_service.py` (remove `_get_client`)
- `backend/recipe/services/ai_ingredients_service.py` (remove `_get_client`)
- `backend/supply/services/ingredient_ai_service.py` (remove `_get_client`)
- `backend/event/api/events.py` (replace direct client usage)
- `backend/documents/text_resolver.py` (replace inline `genai.Client()`)
- `backend/packinglist/services/suggestion_service.py` (replace client usage)

**API endpoint changes:** None — internal refactor only. Error responses remain the same format.

**Database migrations:** None required.

## Risks / Trade-offs

- **Fixed window allows burst at boundary** → Acceptable for cost protection; not a security-critical limit.
- **Single point of failure** → If `gemini_call()` has a bug, all AI features break. Mitigated by tests.
- **Cache unavailability** → If Redis is down, `cache.get` returns `None` (treated as 0). Calls proceed without rate limiting — fail-open. Acceptable since Google's own 429 is the backstop.
- **Management commands that use Gemini** (e.g., `normalize_recipe_portions`) → Need a system user or a bypass flag for batch operations.
