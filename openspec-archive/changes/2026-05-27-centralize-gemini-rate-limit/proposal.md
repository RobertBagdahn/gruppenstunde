## Why

All Gemini API calls are scattered across 7+ services with no shared rate limiting or auth enforcement. A single burst of requests from multiple users hitting different services can exceed Google's quota, causing 429 errors for everyone. Additionally, unauthenticated users can currently trigger AI calls in some code paths, wasting quota on anonymous traffic.

## What Changes

- **New centralized Gemini call function** (`core/services/gemini.py`): a single `gemini_call()` entry point that wraps all Gemini API interactions with global rate limiting (100 calls / 15 minutes) and authentication enforcement.
- **Refactor all existing Gemini call sites** to use the centralized function instead of creating their own `genai.Client` instances.
- **Remove per-service `_get_client()` methods** — client instantiation moves to the central module.
- **Enforce login requirement** — all AI features require `user.is_authenticated`.
- **Per-user rate limits remain** in services that already have them (suggestion_service, event API) as an additional layer.

## Capabilities

### New Capabilities
- `gemini-rate-limit`: Global rate limiting (100 calls/15min) and auth gating for all Gemini API calls via a centralized service function.

### Modified Capabilities

_(none — no spec-level behavior changes, only internal implementation)_

## Impact

- **Backend apps affected**: `core` (new), `content`, `recipe`, `supply`, `event`, `documents`, `packinglist`
- **Files to refactor**: `content/services/ai_service.py`, `content/services/ai_supply_service.py`, `recipe/services/suggestion_service.py`, `recipe/services/ai_ingredients_service.py`, `supply/services/ingredient_ai_service.py`, `event/api/events.py`, `documents/text_resolver.py`, `packinglist/services/suggestion_service.py`
- **Schemas**: No Pydantic/Zod schema changes (internal refactor only)
- **Migrations**: None required
- **Dependencies**: No new packages (uses existing `google-genai` SDK + Django cache)
