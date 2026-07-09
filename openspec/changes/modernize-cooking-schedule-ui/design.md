# Design: Modernize Cooking Schedule UI

## Context

**Current State:**
- CookingScheduleTab component displays meal categories with redundant visual indicators
  - Meal category header shows a colored dot (`MEAL_TYPE_DOT_COLORS`)
  - Timeline items also display colored dots and vertical connection lines
  - This creates visual clutter and cognitive load
- Icons are inconsistently sourced:
  - Material Design strings in `mealPlan.ts` (`MEAL_TYPE_ICONS`)
  - Mixed Lucide imports in components (some tabs use Lucide, some don't)
  - No single source of truth for meal category icons
- Tab navigation uses Lucide but other components don't follow the same pattern
- Color palette is split between `MEAL_TYPE_DOT_COLORS` and `MEAL_TYPE_COLORS`, creating maintenance burden
- No subtle interaction feedback (hover effects, transitions)

**Files affected:**
- `frontend-food/src/pages/planning/CookingScheduleTab.tsx` (main cooking schedule view)
- `frontend-food/src/pages/planning/MealEventDetailPage.tsx` (tab navigation)
- `frontend-food/src/schemas/mealPlan.ts` (icon and color definitions)
- `frontend-food/src/pages/planning/DayPlanView.tsx` and other related views

**Constraints:**
- Lucide React already installed (v0.447.0), no new dependencies needed
- Mobile-first design (320px minimum)
- Must maintain existing API contract (no backend changes)
- Tailwind CSS only, no inline styles

## Goals / Non-Goals

**Goals:**
- Remove visual redundancy (single, authoritative meal category indicator)
- Modernize all icons to Lucide React across meal planning views
- Establish unified color system for meal categories
- Add subtle, refined interaction feedback without distracting animations
- Maintain accessibility (WCAG 2.1 AA)
- Improve visual consistency across Inspi Food meal planning features

**Non-Goals:**
- Changing meal plan data structure or API
- Redesigning other meal plan tabs (Tagesplan, Nährwerte, etc.) beyond icon updates
- Adding new meal categories or types
- Backend refactoring or performance optimization
- Supporting additional icon libraries

## Decisions

### Decision 1: Single Authoritative Indicator in Category Header Only

**Choice:** Meal category dots appear ONLY in the category section header (e.g., "◉ Frühstück"). Timeline items display no dot.

**Rationale:**
- Eliminates visual redundancy while maintaining category color signaling
- Reduces visual weight of timeline items, improving scannability
- Users can infer item category from its position under the header

**Alternatives considered:**
- **Option A (chosen):** Dot only in header, clean timeline items
- **Option B:** Dot on both header and items with different styling → adds cognitive load
- **Option C:** No dots anywhere, icons only → loses quick color-coding benefit

### Decision 2: Lucide Icons as Single Source of Truth

**Choice:** Replace all `MEAL_TYPE_ICONS` Material Design strings with Lucide React components. Create a central mapping in `mealPlan.ts`:

```typescript
export const MEAL_TYPE_ICONS_LUCIDE: Record<string, React.ComponentType> = {
  breakfast: UtensilsCrossed,
  lunch: UtensilsCrossed,
  dinner: Moon,
  snack: Cookie,
};
```

**Rationale:**
- Lucide icons are already installed and used in tab navigation
- Consistent visual language across the product
- Easier to maintain and update (single source of truth)
- Better TypeScript support (component types vs strings)

**Alternatives considered:**
- **Option A (chosen):** Lucide icons, centralized constant
- **Option B:** Keep Material Design strings → inconsistent with existing tab icons, harder to maintain
- **Option C:** Create custom SVG icon set → requires design work and maintenance burden

### Decision 3: Unified Color Palette from MEAL_TYPE_COLORS

**Choice:** Update both `CookingScheduleTab.MEAL_TYPE_DOT_COLORS` and all references to use colors from centralized `MEAL_TYPE_COLORS`:

```typescript
// Single source in mealPlan.ts
export const MEAL_TYPE_COLORS: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  breakfast: { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-300', dot: 'bg-amber-400' },
  lunch: { text: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-300', dot: 'bg-emerald-400' },
  dinner: { text: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-300', dot: 'bg-indigo-400' },
  snack: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-300', dot: 'bg-rose-400' },
};
```

**Rationale:**
- Single source of truth prevents drift between components
- Easier to maintain and update colors globally
- Supports future theming or dark mode
- Aligns with shadcn/ui + Tailwind patterns used in codebase

**Alternatives considered:**
- **Option A (chosen):** Unified MEAL_TYPE_COLORS with dot property
- **Option B:** Keep separate `MEAL_TYPE_DOT_COLORS` → maintenance burden
- **Option C:** Use CSS variables → adds complexity, no benefit for this scope

### Decision 4: Remove Timeline Vertical Lines

**Choice:** Remove the connecting vertical lines between timeline items (lines 146-148 in TimelineItem).

**Rationale:**
- Timeline line serves visual connection purpose, but with cleaner category headers, it's redundant
- Reduces visual complexity and clutter
- Items are grouped by category header, which provides implicit connection
- Aligns with modern, minimal design direction

**Alternatives considered:**
- **Option A (chosen):** Remove lines entirely
- **Option B:** Keep lines but make them lighter → still visual clutter
- **Option C:** Use lines only between items of different categories → too complex

### Decision 5: Subtle Hover Effects

**Choice:** Add refined interaction feedback without aggressive animations:
- Category header hover: light background tint (5-10% opacity), icon scale 105% over 150ms
- Timeline item hover: subtle background highlight (hover:bg-muted/30)
- Button hovers: icon scale + color transition

**Rationale:**
- Provides visual feedback without being distracting
- Uses Tailwind transition utilities for consistency
- Improves perceived responsiveness of UI
- Accessibility-friendly (no auto-animations, user-triggered only)

**Alternatives considered:**
- **Option A (chosen):** Subtle, refined interactions
- **Option B:** No hover effects → less responsive feel
- **Option C:** Bold animations, scale transforms, shadows → distracting, slows down perception

### Decision 6: Icon-Only Action Buttons

**Choice:** Update Share and Settings buttons to display only icons (no text).

**Rationale:**
- Reduces horizontal space in header, allowing more room for meal plan title
- Icon + Lucide consistently communicates action (Share2, Settings)
- Maintains touch target size (44×44px minimum)
- Tooltips or ARIA labels provide accessibility

**Alternatives considered:**
- **Option A (chosen):** Icon-only with ARIA labels
- **Option B:** Keep Icon + Text → uses more space
- **Option C:** Dropdown menu → adds interaction complexity

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| **Visual regression on mobile** | Test on ≤320px viewport; ensure touch targets stay 44×44px; icon size scales responsively |
| **Color contrast accessibility** | Verify WCAG AA (≥4.5:1) for all dot colors + text combinations before shipping |
| **Icon-only buttons unclear** | Provide visible tooltips on hover or ARIA labels for screen readers |
| **Timeline item loses visual hierarchy** | Category header dot + color provides sufficient context; user testing recommended |
| **Performance with hover animations** | Use GPU-accelerated transforms (scale); test on lower-end devices; profile if needed |
| **Icon size inconsistency across tabs** | Define icon sizing standard in Tailwind (e.g., w-4 h-4 for tabs, w-3.5 h-3.5 for inline) |

## Migration Plan

**Phase 1: Foundation (Low Risk)**
1. Add new `MEAL_TYPE_COLORS` with `dot` property to `mealPlan.ts`
2. Update imports in `CookingScheduleTab.tsx` to use unified colors
3. Test that colors render correctly

**Phase 2: Icon Modernization**
1. Create `MEAL_TYPE_ICONS_LUCIDE` constant in `mealPlan.ts`
2. Update `CookingScheduleTab.tsx` to use Lucide icon components
3. Update tab navigation in `MealEventDetailPage.tsx` (already using Lucide, verify consistency)
4. Update any other meal plan views (DayPlanView, etc.) to use unified icons

**Phase 3: Timeline Cleanup**
1. Remove redundant timeline dots from `TimelineItem` (lines 149-150)
2. Remove vertical connecting lines (lines 146-148)
3. Test timeline rendering for all meal types

**Phase 4: UX Polish**
1. Add hover effects to category headers (scale + opacity)
2. Update button styles (Share, Settings) to icon-only
3. Add subtle transitions to expanded states
4. Verify WCAG AA compliance for all color/text combinations

**Phase 5: Testing & Rollout**
1. Manual testing: all meal types, multiple days, mobile/desktop
2. Accessibility audit (ARIA labels, contrast, keyboard navigation)
3. Cross-browser testing (Chrome, Firefox, Safari)
4. Rollout without feature flag (low-risk visual changes)

**Rollback Strategy:**
- All changes are CSS/React component updates; no data migrations
- If visual issues arise, revert commits and re-run QA
- Icon changes backward-compatible (existing Lucide components)

## Open Questions

1. **Meal category icons**: Should lunch also use `UtensilsCrossed` or a different icon? (Currently `restaurant`, but Lucide may have better alternatives like `Utensils` or `Plate`)
2. **Dinner icon**: Moon (`Moon`) chosen, but is `Wine` or `Utensils` better?
3. **Color brightness**: Should dot colors stay at `amber-400` (light) or align more with `MEAL_TYPE_COLORS` theme (e.g., `amber-600`)?
4. **Responsive icon sizes**: Define final Tailwind sizes for:
   - Tab icons (currently w-4 h-4)
   - Category header icons (should be w-4 h-4 or w-5 h-5?)
   - Timeline inline icons (Clock, ListChecks, UtensilsCrossed) (currently w-3.5 h-3.5)
5. **Dark mode**: Should this design consider future dark mode support (e.g., `dark:bg-slate-900`)?
