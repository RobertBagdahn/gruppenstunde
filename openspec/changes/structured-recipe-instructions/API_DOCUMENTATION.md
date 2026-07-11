# Structured Recipe Instructions — API Documentation

## Overview

This document describes the REST API endpoints for managing structured recipe instructions.

**Base URL:** `https://api.example.com/api`  
**Authentication:** Bearer token in `Authorization` header  
**Content-Type:** `application/json`  
**CSRF Protection:** Include `X-CSRFToken` header for POST/PUT/DELETE

---

## Data Models

### RecipeStep

Represents a single step in a recipe.

```json
{
  "id": 42,
  "recipe": 5,
  "sort_order": 1,
  "instruction": "Mix flour with water",
  "duration_minutes": 5,
  "section": "Preparation",
  "step_ingredients": [
    {
      "id": 101,
      "recipe_item": 12,
      "quantity_modifier": 1.0,
      "preparation": "sifted",
      "sort_order": 1
    }
  ],
  "created_at": "2026-07-10T10:00:00Z",
  "updated_at": "2026-07-10T10:00:00Z"
}
```

**Fields:**
- `id` (int, readonly): Unique step identifier
- `recipe` (int, FK): Recipe ID
- `sort_order` (int, required): Display order (unique per recipe)
- `instruction` (str, required, 1-2000 chars): Step instruction text
- `duration_minutes` (int, nullable): Cooking time in minutes
- `section` (str, max 100 chars): Category (e.g., "Preparation", "Cooking")
- `step_ingredients` (array): Ingredients used in this step
- `created_at` (datetime, readonly): Creation timestamp
- `updated_at` (datetime, readonly): Last modification timestamp

### RecipeStepIngredient

Links a recipe item to a step with quantity modifier.

```json
{
  "id": 101,
  "recipe_item": 12,
  "quantity_modifier": 1.5,
  "preparation": "finely diced",
  "sort_order": 1
}
```

**Fields:**
- `id` (int, readonly): Unique identifier
- `recipe_item` (int, FK, required): Recipe item ID
- `quantity_modifier` (float, default 1.0): Multiplier for item quantity
- `preparation` (str, max 500 chars): Preparation notes (e.g., "diced", "room temperature")
- `sort_order` (int, required): Order within step (unique per step)

**Constraints:**
- `quantity_modifier` must be > 0
- `unique_together(step, recipe_item)`: One item per step max

---

## Endpoints

### GET /recipes/{slug}/steps/

List all steps for a recipe.

**Request:**
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://api.example.com/api/recipes/pizza-margherita/steps/
```

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "sort_order": 1,
    "instruction": "Preheat oven to 250°C",
    "duration_minutes": 10,
    "section": "Preparation",
    "step_ingredients": []
  },
  {
    "id": 2,
    "sort_order": 2,
    "instruction": "Mix flour with water",
    "duration_minutes": 5,
    "section": "Preparation",
    "step_ingredients": [
      {
        "id": 101,
        "recipe_item": 1,
        "quantity_modifier": 1.0,
        "preparation": "sifted"
      }
    ]
  }
]
```

**Errors:**
- `404 Not Found`: Recipe not found
- `403 Forbidden`: Insufficient permissions

**Query Parameters:**
- None

---

### PUT /recipes/{slug}/steps/batch

Replace all steps for a recipe (atomic transaction).

**Request:**
```bash
curl -X PUT \
  -H "Authorization: Bearer TOKEN" \
  -H "X-CSRFToken: CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "steps": [
      {
        "sort_order": 1,
        "instruction": "Step 1",
        "duration_minutes": 5,
        "section": "Prep",
        "step_ingredients": []
      }
    ]
  }' \
  https://api.example.com/api/recipes/pizza/steps/batch
```

**Response:** `200 OK`
```json
{
  "success": true,
  "steps_updated": 2,
  "recipe": {
    "id": 5,
    "slug": "pizza",
    "steps_count": 2
  }
}
```

**Validation Rules:**
- `steps` array required
- Each step must have `instruction` (non-empty)
- `sort_order` must be unique within recipe (1, 2, 3, ...)
- If `sort_order` has gaps, they're renumbered (1, 3, 5 → 1, 2, 3)
- `quantity_modifier` must be > 0

**Error Responses:**

`400 Bad Request`:
```json
{
  "detail": "Invalid steps data",
  "errors": {
    "steps.0.instruction": ["This field is required"]
  }
}
```

`403 Forbidden`:
```json
{
  "detail": "Insufficient permissions to edit this recipe"
}
```

`404 Not Found`:
```json
{
  "detail": "Recipe not found"
}
```

`409 Conflict`:
```json
{
  "detail": "Recipe changed since you last viewed it. Please refresh."
}
```

**Atomicity:**
- If any validation fails, NO changes are made (all-or-nothing)
- Database transaction rolled back on error
- Client receives error details for all failed steps

---

### POST /recipes/{slug}/steps/generate-from-items/

AI-powered step generation from recipe ingredients.

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "X-CSRFToken: CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://api.example.com/api/recipes/pizza/steps/generate-from-items/
```

**Response:** `200 OK`
```json
{
  "steps": [
    {
      "sort_order": 1,
      "instruction": "Preheat oven to 250°C and let it warm up for 15 minutes",
      "duration_minutes": 15,
      "section": "Preparation",
      "step_ingredients": []
    },
    {
      "sort_order": 2,
      "instruction": "Mix flour and water to form dough",
      "duration_minutes": 10,
      "section": "Preparation",
      "step_ingredients": []
    }
  ]
}
```

**Behavior:**
- Analyzes recipe's ingredients
- Generates 4-8 logical cooking steps
- Steps are NOT saved yet (user reviews first)
- User must call `PUT /recipes/{slug}/steps/batch` to save

**Error Responses:**

`400 Bad Request`: Recipe has no ingredients
```json
{
  "detail": "Recipe must have at least 3 ingredients to generate steps"
}
```

`429 Too Many Requests`: Rate limit exceeded (3 per hour)
```json
{
  "detail": "KI generation rate limited. Please try again later."
}
```

`503 Service Unavailable`: Gemini API down
```json
{
  "detail": "KI service temporarily unavailable. Please try again."
}
```

**Rate Limiting:**
- Max 3 generations per recipe per day
- Max 10 generations per user per day
- Applies across all recipes

---

### POST /recipes/{slug}/steps/suggest-ingredients/

AI-powered ingredient suggestion for a step.

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "X-CSRFToken: CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "step_instruction": "Mix flour with water and salt"
  }' \
  https://api.example.com/api/recipes/bread/steps/suggest-ingredients/
```

**Response:** `200 OK`
```json
{
  "suggestions": [
    {
      "id": 1,
      "name": "Flour",
      "preparation": "sifted",
      "confidence": 0.95
    },
    {
      "id": 2,
      "name": "Water",
      "preparation": "room temperature",
      "confidence": 0.92
    },
    {
      "id": 5,
      "name": "Salt",
      "preparation": null,
      "confidence": 0.88
    }
  ]
}
```

**Parameters:**
- `step_instruction` (str, required): The step text to analyze

**Behavior:**
- Scans recipe ingredients
- Matches instruction text to likely ingredients
- Returns candidates sorted by confidence
- NOT saved yet (user selects subset to add)

**Error Responses:**

`400 Bad Request`: Missing instruction
```json
{
  "detail": "step_instruction is required"
}
```

`404 Not Found`: Recipe not found
```json
{
  "detail": "Recipe not found"
}
```

`503 Service Unavailable`: KI service error
```json
{
  "detail": "Unable to process suggestions. Please try again."
}
```

---

### POST /recipes/{slug}/steps/{step_id}/improve/

Rewrite step instruction with selected tone.

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "X-CSRFToken: CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tone": "präzise"
  }' \
  https://api.example.com/api/recipes/pizza/steps/42/improve/
```

**Response:** `200 OK`
```json
{
  "improved_instruction": "2 min kräftig rühren, bis homogen",
  "step_id": 42
}
```

**Tone Options:**
| Tone | Description | Example |
|------|-------------|---------|
| `präzise` | Concise, technical | "2 min rühren" |
| `ausführlich` | Detailed, step-by-step | "Rühren Sie kontinuierlich 2 Minuten..." |
| `kurz` | Very brief, telegram style | "rühren 2min" |
| `lustig` | Humorous, casual | "Krümmel da weg! Gut rühren!" |
| `wissenschaftlich` | Scientific, formal | "Durchmischen für Homogenisierung..." |
| `anfänger` | Beginner-friendly | "Rühren Sie langsam mit..." |

**Behavior:**
- Rewrites step instruction in selected tone
- Returns improved text for preview
- NOT automatically saved (client decides)
- Client calls `PUT /recipes/{slug}/steps/batch` to save

**Error Responses:**

`400 Bad Request`: Invalid tone
```json
{
  "detail": "Invalid tone. Must be one of: präzise, ausführlich, kurz, lustig, wissenschaftlich, anfänger"
}
```

`404 Not Found`: Step not found
```json
{
  "detail": "Step not found"
}
```

`403 Forbidden`: No permission to edit
```json
{
  "detail": "Insufficient permissions"
}
```

`429 Too Many Requests`: Rate limit
```json
{
  "detail": "Too many improvement requests. Try again in 1 hour."
}
```

---

## Pagination & Filtering

**Not implemented for steps** (typically < 100 per recipe).  
All endpoints return full results.

If pagination needed in future:
```bash
GET /recipes/{slug}/steps/?page=1&page_size=20&sort=sort_order
```

---

## Placeholder Syntax

Steps can use placeholders for ingredient names, resolved at display time.

### Supported Formats

| Format | Example | Resolves To |
|--------|---------|-------------|
| `{1}` | "Mix {1} with water" | First ingredient name |
| `{2}` | "Add {2} at end" | Second ingredient name |
| `{ingredient_name}` | "Mix {ingredient_name}" | First ingredient name |
| `{name}` | "Use {name}" | First ingredient name |

### Resolution Rules

1. Placeholders resolved based on `step_ingredients` order
2. `{1}` → 1st ingredient in step's `sort_order`
3. `{ingredient_name}` → 1st ingredient by order
4. If ingredient missing → placeholder stays as-is
5. Special characters in names preserved

### Example

**Step:**
```json
{
  "instruction": "Mix {1} with {2}",
  "step_ingredients": [
    {"id": 101, "recipe_item": 1, "sort_order": 1},
    {"id": 102, "recipe_item": 2, "sort_order": 2}
  ]
}
```

**After resolution (in UI):**
```
Mix Flour (200g) with Water (100ml)
```

---

## Error Handling

### Common Error Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 400 | Validation failed | Check request body |
| 401 | Unauthenticated | Login and retry |
| 403 | Unauthorized | Check permissions |
| 404 | Not found | Verify slug/ID |
| 409 | Conflict (race condition) | Refresh and retry |
| 429 | Rate limited | Retry after delay |
| 500 | Server error | Try again later |
| 503 | Service unavailable | KI service down |

### Error Response Format

```json
{
  "detail": "Human-readable error message",
  "errors": {
    "field_name": ["Error for this field"],
    "another_field": ["Error 1", "Error 2"]
  },
  "request_id": "abc-123-def-456"
}
```

### Retry Strategy

```python
import time
import requests

def call_with_retry(method, url, max_retries=3):
    for attempt in range(max_retries):
        try:
            response = requests.request(method, url)
            
            # Success
            if response.status_code < 400:
                return response.json()
            
            # Rate limited: exponential backoff
            if response.status_code == 429:
                wait_time = 2 ** attempt
                time.sleep(wait_time)
                continue
            
            # Temporary error: retry
            if response.status_code >= 500:
                if attempt < max_retries - 1:
                    time.sleep(1)
                    continue
            
            # Permanent error: fail
            raise Exception(response.json()["detail"])
        
        except requests.exceptions.ConnectionError:
            if attempt < max_retries - 1:
                time.sleep(1)
            else:
                raise
    
    raise Exception("Max retries exceeded")
```

---

## Rate Limiting

**KI Features Only:**
- `generate-from-items`: 3 per recipe per day, 10 per user per day
- `improve`: 20 per step per day, 50 per user per day
- `suggest-ingredients`: 10 per step per day, 30 per user per day

**Headers in 429 Response:**
```
X-RateLimit-Limit: 3
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1720000000 (Unix timestamp)
```

---

## CSRF Protection

Required for all state-modifying requests (POST, PUT, DELETE).

**Headers:**
```
X-CSRFToken: <token from document.cookie['csrftoken']>
```

**Frontend Helper:**
```typescript
function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

const headers = {
  'X-CSRFToken': getCsrfToken(),
  'Content-Type': 'application/json',
};
```

---

## Webhooks (Future)

Not currently implemented. Future versions may support:

```
POST /webhooks/recipe.steps.created
POST /webhooks/recipe.steps.updated
POST /webhooks/recipe.steps.deleted
```

---

## Client Libraries

### Python

```python
import requests

class RecipeStepsClient:
    def __init__(self, token):
        self.token = token
        self.base_url = "https://api.example.com/api"
    
    def get_steps(self, slug):
        return requests.get(
            f"{self.base_url}/recipes/{slug}/steps/",
            headers={"Authorization": f"Bearer {self.token}"}
        ).json()
    
    def update_steps(self, slug, steps):
        return requests.put(
            f"{self.base_url}/recipes/{slug}/steps/batch",
            json={"steps": steps},
            headers={"Authorization": f"Bearer {self.token}"}
        ).json()

# Usage
client = RecipeStepsClient("YOUR_TOKEN")
steps = client.get_steps("pizza")
```

### JavaScript / TypeScript

```typescript
import { getCsrfToken } from './csrf';

class RecipeStepsClient {
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async getSteps(slug: string) {
    const response = await fetch(`${this.baseUrl}/recipes/${slug}/steps/`);
    return response.json();
  }

  async updateSteps(slug: string, steps: RecipeStep[]) {
    return fetch(`${this.baseUrl}/recipes/${slug}/steps/batch`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      body: JSON.stringify({ steps }),
    }).then(r => r.json());
  }
}
```

---

## Changelog

### v1.0 (2026-07-10)

**Initial Release:**
- ✓ LIST, CREATE, UPDATE, DELETE steps
- ✓ KI generation from ingredients
- ✓ KI tone-based rewriting
- ✓ Ingredient suggestion
- ✓ Atomic batch updates
- ✓ Placeholder resolution

**Known Limitations:**
- No pagination (assuming < 100 steps per recipe)
- No subscription webhooks
- No batch ingredient assignment

---

## Support

For API issues:
- **GitHub Issues:** https://github.com/example/issues
- **Slack:** #dev-api channel
- **Email:** api-support@example.com

---

**API Version:** 1.0  
**Last Updated:** 2026-07-10  
**Next Review:** Before public beta
