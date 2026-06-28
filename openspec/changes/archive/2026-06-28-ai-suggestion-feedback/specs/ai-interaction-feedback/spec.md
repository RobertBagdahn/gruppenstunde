## ADDED Requirements

### Requirement: AiInteraction model

The system SHALL provide an `AiInteraction` model in the `content` app that persists every AI call. The model SHALL store:
- `id`: UUID primary key (auto-generated)
- `context`: CharField(50) with choices from `AiContextChoices`
- `prompt`: JSONField storing the Gemini input contents
- `response`: TextField storing the raw Gemini response text (blank for failed calls)
- `model`: CharField(100) storing the Gemini model name
- `user`: ForeignKey to User (nullable, for anonymous/management-command calls)
- `duration_ms`: IntegerField (nullable, the call duration)
- `success`: BooleanField indicating whether the call succeeded
- `error_code`: CharField(50, blank) for failed calls (rate_limit, auth_error, timeout, etc.)
- `vote`: CharField(10, blank=True, null=True) — "up" or "down"
- `voted_at`: DateTimeField (nullable, set when vote is cast)
- `created_at`: DateTimeField(auto_now_add=True)

#### Scenario: Successful AI call creates interaction record

- **WHEN** `gemini_call()` completes successfully
- **THEN** an `AiInteraction` record is created with prompt, response, model, user, duration_ms, success=True
- **AND** the record has `vote=None` and `voted_at=None`

#### Scenario: Failed AI call creates interaction record

- **WHEN** `gemini_call()` raises an exception (timeout, unavailable, etc.)
- **THEN** an `AiInteraction` record is created with prompt, success=False, error_code set, duration_ms set if available, response blank

#### Scenario: Rate-limited call creates interaction record

- **WHEN** the global rate limit is exceeded before the AI call
- **THEN** an `AiInteraction` record is created with prompt, success=False, error_code="rate_limit"

### Requirement: AiContextChoices enum

The system SHALL provide an `AiContextChoices` TextChoices enum with the following values:

| Value | Label |
|---|---|
| `content_improve_text` | Text verbessern |
| `content_suggest_tags` | Tags vorschlagen |
| `content_refurbish` | Inhalt aufbereiten |
| `content_generate_image` | Bild generieren |
| `content_suggest_supplies` | Materialien vorschlagen |
| `ingredient_ai_create` | Zutat erstellen |
| `ingredient_ai_suggest_all` | Zutatenfelder vorschlagen |
| `ingredient_import_url` | Zutat aus URL importieren |
| `recipe_ai_create` | Rezept erstellen |
| `recipe_ai_suggest_all` | Rezeptmetadaten vorschlagen |
| `recipe_ai_suggest_ingredients` | Rezeptzutaten vorschlagen |
| `packing_list_ai_suggest` | Packlistenvorschläge |
| `event_generate_invitation` | Einladung generieren |
| `documents_generate_text` | Dokumententext generieren |

#### Scenario: All contexts enumerated

- **WHEN** the system loads AiContextChoices
- **THEN** exactly the 14 values listed above SHALL be available

### Requirement: gemini_call() return type change

The `gemini_call()` function SHALL return a tuple `(GenerateContentResponse | None, UUID)` instead of just `GenerateContentResponse | None`. The UUID SHALL be the `id` of the newly created `AiInteraction` record.

The `gemini_image_call()` function SHALL follow the same pattern.

#### Scenario: Successful call returns interaction_id

- **WHEN** `gemini_call()` completes successfully
- **THEN** the response SHALL be a tuple `(response_object, interaction_uuid)`
- **AND** the `interaction_uuid` SHALL match the `id` of the created `AiInteraction` record

#### Scenario: Failed call returns interaction_id

- **WHEN** `gemini_call()` raises an exception
- **THEN** the exception SHALL still propagate
- **AND** the `AiInteraction` record SHALL have been created before the exception

### Requirement: gemini_call() interaction logging

The `gemini_call()` function SHALL log every interaction to the `AiInteraction` model:
1. Create the `AiInteraction` record with `prompt` and `user` BEFORE the Gemini API call
2. After the call completes, update `response`, `duration_ms`, `success=True`
3. On exception, update `success=False`, `error_code`, `duration_ms` (if timed)

#### Scenario: Interaction logged with timing

- **WHEN** `gemini_call()` is called
- **THEN** the `duration_ms` field SHALL contain the wall-clock time of the Gemini API call in milliseconds

### Requirement: Vote API endpoint

The system SHALL provide a `PATCH /api/ai-interactions/{interaction_id}/vote/` endpoint that allows authenticated users to vote on an AI interaction. The endpoint SHALL:
- Accept `{"vote": "up"}` or `{"vote": "down"}` in the request body
- Return `{"status": "ok"}` on success
- Return 404 if the interaction_id does not exist
- Return 403 if the requesting user is not the owner of the interaction and not staff
- Set `voted_at` to the current timestamp when vote is cast

#### Scenario: Successful vote

- **WHEN** an authenticated user sends PATCH with `{"vote": "up"}` to their own interaction
- **THEN** the response SHALL be 200 with `{"status": "ok"}`
- **AND** the interaction's `vote` SHALL be "up"
- **AND** `voted_at` SHALL be set

#### Scenario: Vote on non-existent interaction

- **WHEN** a user sends PATCH with an invalid interaction_id
- **THEN** the response SHALL be 404

#### Scenario: Vote on another user's interaction

- **WHEN** a non-staff user sends PATCH to an interaction owned by another user
- **THEN** the response SHALL be 403

#### Scenario: Staff can vote on any interaction

- **WHEN** a staff user sends PATCH to any interaction
- **THEN** the response SHALL be 200

#### Scenario: Unauthenticated vote rejected

- **WHEN** an unauthenticated user sends PATCH
- **THEN** the response SHALL be 401

#### Scenario: Invalid vote value rejected

- **WHEN** a user sends PATCH with `{"vote": "invalid"}`
- **THEN** the response SHALL be 422

#### Scenario: Changing vote updates existing

- **WHEN** a user sends PATCH with `{"vote": "down"}` on an interaction that already has `vote="up"`
- **THEN** the vote SHALL be updated to "down"
- **AND** `voted_at` SHALL be updated

### Requirement: Aggregation API endpoint

The system SHALL provide a `GET /api/admin/ai-interactions/stats/` endpoint accessible only to staff users. The endpoint SHALL return aggregated statistics:

```json
{
  "total_calls": 1234,
  "calls_today": 12,
  "voted_calls": 89,
  "vote_rate": 7.2,
  "by_context": [
    {
      "context": "refurbish",
      "label": "Inhalt aufbereiten",
      "total": 342,
      "success_count": 338,
      "error_count": 4,
      "thumbs_up": 45,
      "thumbs_down": 8,
      "vote_rate": 15.5
    }
  ],
  "timeline": [
    {"date": "2026-06-01", "total": 28, "thumbs_up": 3, "thumbs_down": 1},
    {"date": "2026-06-02", "total": 32, "thumbs_up": 5, "thumbs_down": 0}
  ]
}
```

#### Scenario: Staff can access stats

- **WHEN** a staff user requests `GET /api/admin/ai-interactions/stats/`
- **THEN** the response SHALL be 200 with aggregated data

#### Scenario: Non-staff cannot access stats

- **WHEN** a non-staff authenticated user requests the stats endpoint
- **THEN** the response SHALL be 403

#### Scenario: Stats include timeline for last 30 days

- **WHEN** stats are requested
- **THEN** the timeline SHALL contain daily aggregates for the last 30 calendar days

### Requirement: Frontend AiVoteButtons component

The system SHALL provide a reusable `AiVoteButtons` React component that displays thumbs up/down icons after an AI suggestion interaction. The component SHALL:
- Accept an `interactionId` (UUID string) prop
- Show two outline buttons: 👍 and 👎
- Highlight the selected button after vote
- Call `PATCH /api/ai-interactions/{interactionId}/vote/` on click
- Show a brief toast/confirmation after successful vote
- Be disabled if the user already voted (prevent double-vote)

#### Scenario: Initial state shows both buttons

- **WHEN** the component renders with no vote yet
- **THEN** both 👍 and 👎 SHALL be displayed as outline icons
- **AND** neither SHALL be highlighted

#### Scenario: Clicking thumbs up highlights it

- **WHEN** the user clicks the 👍 button
- **THEN** the 👍 button SHALL become filled/highlighted
- **AND** the 👎 button SHALL remain outline
- **AND** a success toast SHALL appear

#### Scenario: Changing vote toggles highlight

- **WHEN** the user clicks 👎 after previously voting 👍
- **THEN** the 👎 SHALL become highlighted
- **AND** the 👍 SHALL return to outline

### Requirement: Frontend AiVoteButtons integration

The `AiVoteButtons` component SHALL be integrated into all frontend components that display AI suggestions:
- `AiCreateDialog` (main frontend)
- `AiSuggestDialog` (food frontend)
- `InlineIngredientEditor` (food frontend)
- All AI suggestion trigger points across both frontends

Each integration SHALL receive the `interaction_id` from the API response and pass it to `AiVoteButtons`.

#### Scenario: AiCreateDialog shows vote buttons after creation

- **WHEN** a user successfully creates content via `AiCreateDialog`
- **THEN** the dialog SHALL display `AiVoteButtons` with the interaction_id from the API response

#### Scenario: AiSuggestDialog shows vote buttons after suggestion

- **WHEN** `AiSuggestDialog` displays AI suggestions
- **THEN** the dialog SHALL display `AiVoteButtons` with the interaction_id from the API response

### Requirement: Admin dashboard page

The system SHALL provide an admin-only React page at `/admin/ai-feedback` that displays AI interaction analytics. The page SHALL:
- Be accessible only to staff users (is_staff check)
- Show overview cards: total calls, calls today, voted calls, vote rate
- Show a table of stats per context (context name, total, success count, thumbs up/down, vote rate)
- Show a timeline chart of votes over the last 30 days
- Include a filter/search to find specific interactions
- Include a detail view for individual interactions (input, output, vote, metadata)

#### Scenario: Admin page loads stats

- **WHEN** a staff user navigates to `/admin/ai-feedback`
- **THEN** the page SHALL fetch stats from `GET /api/admin/ai-interactions/stats/`
- **AND** display overview cards with the fetched data

#### Scenario: Non-staff redirected

- **WHEN** a non-staff user navigates to `/admin/ai-feedback`
- **THEN** the user SHALL be redirected to the home page

#### Scenario: Detail view shows interaction data

- **WHEN** a staff user clicks on an interaction in the list
- **THEN** the detail view SHALL display the full prompt, full response, vote, user, duration, and timestamp

### Requirement: Pydantic schemas (Backend)

The system SHALL provide the following Pydantic schemas in the `content` app:

- `AiVoteIn`: `{ vote: Literal["up", "down"] }`
- `AiVoteOut`: `{ status: Literal["ok"] }`
- `AiInteractionStatsOut`: aggregated stats as defined in the Aggregation API
- `AiContextStatsOut`: per-context stats
- `AiTimelineEntryOut`: daily timeline data

#### Scenario: AiVoteIn validates vote values

- **WHEN** a request body with `vote="up"` or `vote="down"` is validated
- **THEN** the schema SHALL accept it
- **WHEN** any other value is provided
- **THEN** validation SHALL fail

### Requirement: Zod schemas (Frontend)

The system SHALL provide Zod schemas in both frontends (`frontend/` and `frontend-food/`) that match the Pydantic schemas exactly:

- `AiVoteInSchema`: `z.object({ vote: z.enum(["up", "down"]) })`
- `AiVoteOutSchema`: `z.object({ status: z.literal("ok") })`
- `AiInteractionStatsSchema`: full stats response schema
- `AiContextStatsSchema`: per-context stats
- `AiTimelineEntrySchema`: daily timeline entry

#### Scenario: Zod schemas match Pydantic schemas

- **WHEN** comparing Zod and Pydantic schemas
- **THEN** the field names and types SHALL match 1:1

### Requirement: TanStack Query hooks (Frontend)

The system SHALL provide TanStack Query hooks for all feedback-related API calls:

- `useVoteAiInteraction()`: mutation for PATCH vote endpoint
- `useAiInteractionStats()`: query for GET stats endpoint (admin only)

#### Scenario: Vote mutation sends correct request

- **WHEN** `useVoteAiInteraction().mutate({ interactionId, vote: "up" })` is called
- **THEN** a PATCH request SHALL be sent to `/api/ai-interactions/{interactionId}/vote/` with body `{"vote": "up"}`
