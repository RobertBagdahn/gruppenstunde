## Why

The current meal plan print view is minimal and lacks visual structure. Print users struggle with:
- Poor page breaks (meals and days can split across pages)
- Low readability (small fonts, limited hierarchy)
- No space for handwritten notes during meal planning
- Missing shopping list summary for quick reference

This redesign transforms the print view into a professional, practical tool that Gruppenfuehrer can use on paper to coordinate meals during events.

## What Changes

- **Page breaks**: Each day starts on a new page (no more splitting). Meals stay together within a day.
- **Visual hierarchy**: Larger meal type labels (16pt), date headers (18pt), improved spacing
- **Day containers**: Each day in a visual box with clear structure and separation
- **Notes area**: Hybrid integration—small notes box beside meals + additional lines at day's end
- **Shopping list**: Two versions—per-day ingredient lists + comprehensive summary at document end
- **Typography**: Standard body (12pt), minimalist symbols (no large emojis), clean greyscale + green accents
- **Metadata**: Full header preserved (plan name, date range, portion count, reserve factor)
- **Seitenzahlen**: Footer with page numbering for multi-page plans

## Capabilities

### New Capabilities

- `meal-plan-print-layout`: Enhanced page break strategy, day-per-page structure, meal containers, visual boxes
- `meal-plan-print-typography`: Improved font sizing, weight, and hierarchy for readability
- `meal-plan-print-styling`: Greyscale + green accent color system, minimalist symbols, professional appearance
- `meal-plan-print-notes`: Integrated notes area (side boxes + end-of-day lines) for handwritten annotations
- `meal-plan-print-shopping-list`: Aggregated ingredient lists (per-day and totaled)
- `meal-plan-print-footer`: Page numbering and document metadata in footer

### Modified Capabilities

- `meal-plan-storage`: No change to data model; rendering change only

## Impact

**Frontend (React/TypeScript)**
- Modified: [MealPlanPrintPage.tsx](../../frontend-food/src/pages/planning/MealPlanPrintPage.tsx)
- New layout logic: Day-grouping, meal box rendering, notes area placement
- New component structure: DaySection, MealBox, NotesArea, ShoppingListSummary components

**Styling (CSS)**
- Enhanced: [index.css](../../frontend-food/src/index.css) — Add comprehensive print styles
- New page break rules, typography utilities, color system for print
- Print-specific spacing and layout rules

**Backend**
- No backend changes required; UI-only enhancement

**Dependencies**
- date-fns (existing) — Date formatting
- No new external dependencies

**Affected APIs**
- GET /meal-plans/{id} — No schema changes; existing response sufficient
