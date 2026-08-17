## ADDED Requirements

### Requirement: Zod request schema for ai-create endpoint
The frontend SHALL define a `RecipeAiCreateInSchema` Zod schema matching the backend `RecipeAiCreateIn` Pydantic schema with a single `prompt: z.string().min(1)` field.

#### Scenario: Schema validates valid request body
- **WHEN** a request body `{ "prompt": "Nudelauflauf mit Hackfleisch" }` is validated against `RecipeAiCreateInSchema`
- **THEN** the validation SHALL succeed

#### Scenario: Schema rejects empty prompt
- **WHEN** a request body `{ "prompt": "" }` is validated against `RecipeAiCreateInSchema`
- **THEN** the validation SHALL fail

#### Scenario: Schema rejects missing prompt
- **WHEN** a request body `{}` is validated against `RecipeAiCreateInSchema`
- **THEN** the validation SHALL fail

### Requirement: TanStack Query mutation hook for ai-create
The frontend SHALL provide a `useRecipeAiCreate()` mutation hook that sends a validated prompt to `POST /api/recipes/ai-create/` and returns the created recipe validated against `RecipeDetailSchema`.

#### Scenario: Successful recipe creation via hook
- **WHEN** an authenticated user calls `useRecipeAiCreate().mutateAsync({ prompt: "Kaiserschmarrn" })`
- **THEN** the hook SHALL send `POST /api/recipes/ai-create/` with body `{ "prompt": "Kaiserschmarrn" }` and return the parsed `RecipeDetail`

#### Scenario: Hook handles API error
- **WHEN** the API returns a non-2xx response
- **THEN** the mutation SHALL throw with the backend error message

### Requirement: Wizard uses type-safe hook for AI generation
The `WizardStepMethod` component SHALL use the `useRecipeAiCreate()` hook instead of a raw `fetch()` call for AI recipe creation.

#### Scenario: AI generation triggers mutation
- **WHEN** the user enters a prompt and clicks "Generieren"
- **THEN** the component SHALL call `useRecipeAiCreate().mutateAsync({ prompt: aiPrompt.trim() })`
