# Structured Recipe Instructions — Developer Guide

## Overview for Developers

This guide explains the architecture and design patterns used in structured recipe instructions, for developers maintaining or extending the feature.

**Target Audience:** Backend engineers, frontend engineers, DevOps  
**Read Time:** 15-20 minutes

---

## Architecture Overview

```
┌─ Frontend (React + TypeScript) ───────────────────────────┐
│ Components → Hooks → Store → API Calls                    │
│ StepEditor, StepCard, ToneSelector, etc.                  │
└─────────────────────┬──────────────────────────────────────┘
                      │ HTTP/REST
                      ↓
┌─ Backend (Django + Django Ninja) ────────────────────────┐
│ Router → ViewFunction → Service → Model                  │
│ RecipeStep, RecipeStepIngredient models                  │
│ AiStepService (Gemini integration)                       │
└──────────────────────────────────────────────────────────┘
                      │
                      ↓
┌─ Database (PostgreSQL) ──────────────────────────────────┐
│ recipe_steps table, recipe_stepingredient table          │
│ ForeignKeys, Constraints, Indexes                        │
└──────────────────────────────────────────────────────────┘
```

---

## Backend Architecture

### File Structure

```
backend/recipe/
├── models/
│   ├── steps.py          # RecipeStep, RecipeStepIngredient models
│   └── __init__.py
├── services/
│   ├── step_ai_service.py  # Gemini integration, AI logic
│   └── __init__.py
├── api/
│   ├── steps.py          # Django Ninja router + endpoints
│   └── __init__.py
├── migrations/
│   ├── 0049_add_recipe_steps.py
│   └── ...
├── tests/
│   ├── test_steps_models.py
│   ├── test_steps_ai_service.py
│   ├── test_placeholder_resolution.py
│   └── ...
└── admin.py
```

### Database Schema

```sql
-- RecipeStep
CREATE TABLE recipe_steps (
  id SERIAL PRIMARY KEY,
  recipe_id INT NOT NULL REFERENCES recipes_recipe(id) ON DELETE CASCADE,
  sort_order INT NOT NULL,
  instruction TEXT NOT NULL,
  duration_minutes INT NULL,
  section VARCHAR(100) DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(recipe_id, sort_order),
  CHECK(instruction != '')
);

-- RecipeStepIngredient  
CREATE TABLE recipe_stepingredient (
  id SERIAL PRIMARY KEY,
  step_id INT NOT NULL REFERENCES recipe_steps(id) ON DELETE CASCADE,
  recipe_item_id INT NOT NULL REFERENCES recipe_recipeitem(id) ON DELETE CASCADE,
  quantity_modifier FLOAT DEFAULT 1.0,
  preparation VARCHAR(500) DEFAULT '',
  sort_order INT NOT NULL,
  UNIQUE(step_id, recipe_item_id),
  CHECK(quantity_modifier > 0)
);

CREATE INDEX idx_steps_recipe ON recipe_steps(recipe_id);
CREATE INDEX idx_steps_sort ON recipe_steps(recipe_id, sort_order);
CREATE INDEX idx_ingredients_step ON recipe_stepingredient(step_id);
```

### Model Implementation

**[backend/recipe/models/steps.py]**

```python
from django.db import models
from django.core.validators import MinValueValidator

class RecipeStep(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE)
    sort_order = models.IntegerField()
    instruction = models.TextField()
    duration_minutes = models.IntegerField(null=True, blank=True)
    section = models.CharField(max_length=100, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['recipe', 'sort_order'],
                name='unique_recipe_sort_order'
            ),
            models.CheckConstraint(
                check=models.Q(instruction__gt=''),
                name='instruction_not_empty'
            ),
        ]
        ordering = ['recipe', 'sort_order']
    
    def __str__(self):
        return f"Step {self.sort_order}: {self.instruction[:50]}"

class RecipeStepIngredient(models.Model):
    step = models.ForeignKey(
        RecipeStep,
        on_delete=models.CASCADE,
        related_name='step_ingredients'
    )
    recipe_item = models.ForeignKey(RecipeItem, on_delete=models.CASCADE)
    quantity_modifier = models.FloatField(default=1.0, validators=[MinValueValidator(0.1)])
    preparation = models.CharField(max_length=500, blank=True)
    sort_order = models.IntegerField()
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['step', 'recipe_item'],
                name='unique_step_item'
            ),
        ]
        ordering = ['step', 'sort_order']
    
    def __str__(self):
        return f"{self.recipe_item.name} ({self.quantity_modifier}x)"
```

### API Endpoints Implementation

**[backend/recipe/api/steps.py]**

```python
from django.db import transaction
from django_ninja import Router
from pydantic import BaseModel

router = Router()

@router.get('/{slug}/steps/')
def list_steps(request, slug: str):
    """List all steps for a recipe"""
    recipe = get_object_or_404(Recipe, slug=slug)
    steps = RecipeStep.objects.filter(recipe=recipe).prefetch_related('step_ingredients')
    return [serialize_step(s) for s in steps]

@router.put('/{slug}/steps/batch')
@transaction.atomic  # All-or-nothing update
def batch_update_steps(request, slug: str, payload: BatchUpdateSchema):
    """Replace all steps (atomic transaction)"""
    recipe = get_object_or_404(Recipe, slug=slug)
    _can_edit(request, recipe)  # Permission check
    
    # Delete old steps (cascade deletes ingredients)
    RecipeStep.objects.filter(recipe=recipe).delete()
    
    # Create new steps (all at once)
    new_steps = [
        RecipeStep(recipe=recipe, **step_data)
        for step_data in payload.steps
    ]
    RecipeStep.objects.bulk_create(new_steps)
    
    return {'success': True, 'steps_updated': len(new_steps)}

@router.post('/{slug}/steps/generate-from-items/')
def generate_steps(request, slug: str):
    """Generate steps from recipe ingredients (KI)"""
    recipe = get_object_or_404(Recipe, slug=slug)
    _require_auth(request)
    
    # Call AI service
    steps = AiStepService.generate_steps_from_items(
        recipe=recipe,
        user=request.user,
        bypass_limits=False
    )
    
    return {'steps': steps}

@router.post('/{slug}/steps/{step_id}/improve/')
def improve_step(request, slug: str, step_id: int, payload: dict):
    """Rewrite step with tone (KI)"""
    step = get_object_or_404(RecipeStep, id=step_id, recipe__slug=slug)
    _can_edit(request, step.recipe)
    
    tone = payload.get('tone', 'normal')
    improved = AiStepService.improve_step_instruction(
        instruction=step.instruction,
        tone=tone,
        user=request.user,
        bypass_limits=False
    )
    
    return {'improved_instruction': improved, 'step_id': step_id}
```

### KI Service (Gemini Integration)

**[backend/recipe/services/step_ai_service.py]**

```python
from google.generativeai import GenerativeModel
import logging

logger = logging.getLogger(__name__)
GEMINI_MODEL = 'gemini-1.5-pro'

class AiStepService:
    @staticmethod
    def generate_steps_from_items(recipe, user, bypass_limits=False):
        """Generate cooking steps from recipe ingredients using Gemini"""
        # Get ingredients
        items = recipe.items.all()
        item_names = ', '.join([f"{i.name} ({i.quantity}{i.unit})" for i in items])
        
        # Build prompt
        prompt = f"""
        Recipe: {recipe.title}
        Ingredients: {item_names}
        
        Generate 4-8 logical cooking steps for this recipe.
        Each step should:
        1. Use placeholders like {{1}}, {{2}} for ingredients
        2. Include estimated time in minutes
        3. Be clear and concise
        
        Return JSON array with this structure:
        [
          {{"sort_order": 1, "instruction": "...", "duration_minutes": 5, "section": "Preparation"}},
          ...
        ]
        """
        
        # Call Gemini
        response = GenerativeModel(GEMINI_MODEL).generate_content(prompt)
        steps_json = parse_json(response.text)
        
        logger.info(f"Generated {len(steps_json)} steps for recipe {recipe.id}")
        return steps_json
    
    @staticmethod
    def improve_step_instruction(instruction, tone='normal', user=None, bypass_limits=False):
        """Rewrite step instruction in selected tone"""
        tone_prompts = {
            'präzise': 'concise and technical',
            'ausführlich': 'detailed and step-by-step',
            'kurz': 'very short and brief',
            'lustig': 'humorous and casual',
            'wissenschaftlich': 'scientific and formal',
            'anfänger': 'beginner-friendly and simple'
        }
        
        tone_desc = tone_prompts.get(tone, 'clear and standard')
        
        prompt = f"""
        Rewrite this cooking instruction to be {tone_desc}:
        
        "{instruction}"
        
        Return ONLY the rewritten instruction, no quotes or explanation.
        """
        
        response = GenerativeModel(GEMINI_MODEL).generate_content(prompt)
        improved = response.text.strip()
        
        logger.info(f"Improved instruction with tone: {tone}")
        return improved
```

### Error Handling Pattern

```python
from django_ninja.errors import HttpError

# In view:
try:
    steps = AiStepService.generate_steps_from_items(recipe, user)
except RateLimitExceeded:
    raise HttpError(429, "Too many KI requests. Try again later.")
except GeminiAPIError as e:
    logger.error(f"Gemini API error: {e}")
    raise HttpError(503, "KI service temporarily unavailable")
except ValueError as e:
    raise HttpError(400, f"Invalid input: {str(e)}")
```

---

## Frontend Architecture

### File Structure

```
frontend-food/src/
├── components/recipe/
│   ├── StepEditor.tsx           # Main container, DnD context
│   ├── StepCard.tsx              # Single step display
│   ├── StepInstructionEditor.tsx # Textarea + fields
│   ├── StepZutatenPanel.tsx      # Ingredient management
│   ├── StepActionsBar.tsx        # Save, Undo/Redo buttons
│   ├── ToneSelector.tsx          # KI tone modal
│   ├── IngredientSuggestions.tsx # KI suggestion modal
│   └── LivePreview.tsx           # Placeholder preview
├── hooks/
│   └── useRecipeSteps.ts         # TanStack Query hooks
├── store/
│   └── useRecipeStepStore.ts     # Zustand store
├── services/
│   ├── stepHelpers.ts            # Placeholder resolution
│   └── csrf.ts                   # CSRF token handling
├── schemas/
│   └── recipeStep.ts             # Zod validation
└── test/
    ├── setup.ts                  # Vitest setup
    └── __mocks__/                # Mock API responses
```

### State Management (Zustand)

**[frontend-food/src/store/useRecipeStepStore.ts]**

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { RecipeStep } from '@/schemas/recipeStep';

interface StepStore {
  steps: RecipeStep[];
  selectedStepId: number | null;
  lastStates: RecipeStep[][];
  currentIndex: number;
  
  // Actions
  setSteps(steps: RecipeStep[]): void;
  addStep(step: RecipeStep): void;
  updateStep(id: number, updates: Partial<RecipeStep>): void;
  deleteStep(id: number): void;
  reorderSteps(ids: number[]): void;
  selectStep(id: number | null): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
}

export const useRecipeStepStore = create<StepStore>()(
  immer((set, get) => ({
    steps: [],
    selectedStepId: null,
    lastStates: [],
    currentIndex: -1,
    
    setSteps(steps) {
      set((state) => {
        state.steps = steps;
        // Save to undo history
        state.lastStates = [...state.lastStates, JSON.parse(JSON.stringify(state.steps))];
        state.currentIndex = state.lastStates.length - 1;
      });
    },
    
    addStep(step) {
      set((state) => {
        state.steps.push(step);
        // Save undo state
        state.lastStates.push(JSON.parse(JSON.stringify(state.steps)));
        state.currentIndex = state.lastStates.length - 1;
      });
    },
    
    updateStep(id, updates) {
      set((state) => {
        const step = state.steps.find((s) => s.id === id);
        if (step) {
          Object.assign(step, updates);
          // Save undo state
          state.lastStates.push(JSON.parse(JSON.stringify(state.steps)));
          state.currentIndex = state.lastStates.length - 1;
        }
      });
    },
    
    undo() {
      set((state) => {
        if (state.currentIndex > 0) {
          state.currentIndex--;
          state.steps = JSON.parse(JSON.stringify(state.lastStates[state.currentIndex]));
        }
      });
    },
    
    canUndo() {
      return get().currentIndex > 0;
    },
  }))
);
```

### API Integration (TanStack Query)

**[frontend-food/src/hooks/useRecipeSteps.ts]**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCsrfToken } from '@/utils/csrf';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function useRecipeSteps(slug: string) {
  return useQuery({
    queryKey: ['recipes', slug, 'steps'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/recipes/${slug}/steps/`);
      if (!response.ok) throw new Error('Failed to fetch steps');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useBatchUpdateSteps() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: { recipe_slug: string; steps: RecipeStep[] }) => {
      const response = await fetch(
        `${API_BASE}/recipes/${input.recipe_slug}/steps/batch`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          body: JSON.stringify({ steps: input.steps }),
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update steps');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['recipes', variables.recipe_slug, 'steps'],
      });
    },
  });
}
```

### Component Pattern (DnD)

**[frontend-food/src/components/recipe/StepEditor.tsx]**

```typescript
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useRecipeStepStore } from '@/store/useRecipeStepStore';

export function StepEditor({ steps: initialSteps, recipeSlug }: Props) {
  const store = useRecipeStepStore();
  const [steps, setSteps] = useState(initialSteps);
  const { mutate: batchUpdate } = useBatchUpdateSteps();
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    // Reorder steps
    const newSteps = Array.from(steps);
    const activeIdx = newSteps.findIndex((s) => s.id === active.id);
    const overIdx = newSteps.findIndex((s) => s.id === over.id);
    
    [newSteps[activeIdx], newSteps[overIdx]] = [newSteps[overIdx], newSteps[activeIdx]];
    
    // Update sort_order
    newSteps.forEach((step, idx) => {
      step.sort_order = idx + 1;
    });
    
    setSteps(newSteps);
  };
  
  return (
    <DndContext onDragEnd={handleDragEnd}>
      <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        {steps.map((step) => (
          <StepCard key={step.id} step={step} recipeSlug={recipeSlug} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

---

## Testing Strategy

### Backend Tests

```python
# test_steps_models.py
class RecipeStepModelTests(TestCase):
    def test_unique_sort_order_per_recipe(self):
        """Two steps in same recipe can't have same sort_order"""
        step1 = RecipeStep.objects.create(recipe=self.recipe, sort_order=1)
        with self.assertRaises(IntegrityError):
            RecipeStep.objects.create(recipe=self.recipe, sort_order=1)

# test_steps_ai_service.py
@patch('recipe.services.step_ai_service.GenerativeModel')
def test_generate_steps(self, mock_model):
    """KI generation returns valid steps"""
    mock_model.return_value.generate_content.return_value.text = '''
    [{"sort_order": 1, "instruction": "Step 1", ...}]
    '''
    
    steps = AiStepService.generate_steps_from_items(recipe, user)
    self.assertEqual(len(steps), 1)
```

### Frontend Tests

```typescript
// useRecipeSteps.test.ts
describe('useRecipeSteps', () => {
  it('should fetch steps with CSRF token', async () => {
    const { result } = renderHook(() => useRecipeSteps('test-recipe'), {
      wrapper: QueryClientProvider,
    });
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/recipes/test-recipe/steps/'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-CSRFToken': expect.any(String),
        }),
      })
    );
  });
});

// Store tests
describe('useRecipeStepStore', () => {
  it('should maintain undo/redo history', () => {
    const { result } = renderHook(() => useRecipeStepStore());
    
    act(() => result.current.addStep(mockStep);
    expect(result.current.canUndo()).toBe(true);
    
    act(() => result.current.undo());
    expect(result.current.canRedo()).toBe(true);
  });
});
```

---

## Common Tasks

### Adding a New Tone for Improvement

1. **Backend** (step_ai_service.py):
```python
tone_prompts = {
    'your_tone': 'description for prompt',
}
```

2. **Frontend** (ToneSelector.tsx):
```typescript
const TONES = [
  { value: 'your_tone', label: 'Your Tone', description: 'Description' },
];
```

3. **Test**:
```python
def test_improve_with_new_tone(self):
    result = AiStepService.improve_step_instruction(
        instruction="Test",
        tone="your_tone",
        user=user
    )
    self.assertIn("expected result", result)
```

### Changing Placeholder Syntax

**Old:** `{1}`, `{2}`  
**New:** `{ingredient_1}`, `{ingredient_2}`

1. Update regex in `stepHelpers.ts`:
```typescript
const PLACEHOLDER_REGEX = /\{ingredient_\d+\}/g;
```

2. Update Gemini prompt to use new syntax
3. Update tests

### Adding Ingredient Assignment Limit

```python
# In step_ai_service.py
if len(recipe.items.all()) > 100:
    raise ValueError("Recipe has too many ingredients for KI processing")
```

---

## Performance Optimization

### Query Optimization

```python
# BAD: N+1 queries
for step in steps:
    print(step.step_ingredients.all())  # Queries DB for each step

# GOOD: Prefetch
steps = RecipeStep.objects.prefetch_related('step_ingredients')
```

### Caching

```typescript
// TanStack Query caching
const { data: steps } = useRecipeSteps(slug);
// Automatically cached for 5 minutes, then stale
```

### Lazy Loading

```typescript
// Load steps only when needed
const [showEditor, setShowEditor] = useState(false);

{showEditor && <StepEditor slug={slug} />}
```

---

## Security Considerations

### CSRF Protection

All POST/PUT/DELETE requests require `X-CSRFToken` header.

```typescript
// Frontend
const headers = {
  'X-CSRFToken': getCsrfToken(),
};
```

### Permission Checks

```python
# Backend
def _can_edit_recipe(request, recipe):
    if recipe.created_by != request.user:
        raise HttpError(403, "Permission denied")
```

### Rate Limiting (KI Features)

```python
# Max 3 generations per recipe per day
cache.get(f"gen_limit_{recipe_id}_{user_id}", 0)
```

---

## Debugging

### Enable Debug Logging

```python
# settings.py
LOGGING = {
    'loggers': {
        'recipe.services.step_ai_service': {
            'level': 'DEBUG',
        },
    },
}
```

### Frontend DevTools

```typescript
// Log store state changes
useRecipeStepStore.subscribe((state) => {
  console.log('Store updated:', state);
});
```

### Inspect API Calls

**Network tab → Filter 'steps' → Check headers/body**

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "CSRF token missing" | Check `getCsrfToken()` in component |
| Steps don't save | Check network tab, ensure 200 response |
| DnD doesn't work | Ensure @dnd-kit/core is installed |
| KI returns slow | Check Gemini API quota and latency |
| Placeholder not resolving | Verify ingredient IDs in step_ingredients |

---

## Resources

- **Django Ninja Docs:** https://django-ninja.rest-framework.org/
- **TanStack Query:** https://tanstack.com/query/latest
- **Zustand:** https://github.com/pmndrs/zustand
- **Dnd-kit:** https://docs.dndkit.com/
- **Zod:** https://zod.dev/

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-10  
**Maintainers:** Backend Team, Frontend Team
