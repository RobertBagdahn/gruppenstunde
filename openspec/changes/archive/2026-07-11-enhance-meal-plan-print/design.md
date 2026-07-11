## Context

Currently, `MealPlanPrintPage.tsx` renders a basic A4-optimized view with minimal styling. The layout uses `break-inside-avoid` on day sections but lacks:
- Explicit page-break strategy (new day = new page)
- Visual containment for meals (no boxes/hierarchy)
- Integrated notes area
- Shopping list aggregation
- Professional typography and spacing

This design specifies the technical approach to transform this into a production-ready print layout.

## Goals / Non-Goals

**Goals:**
- Ensure each day starts on a new page with no content spillover
- Keep meals and their ingredients together (never split across pages)
- Introduce visual hierarchy through typography (18pt dates, 16pt meal types, 12pt body)
- Provide practical features: notes areas + shopping list
- Maintain readability with greyscale + limited green accents
- Support 3–7 day plans (~10–20 meals) without excessive page count

**Non-Goals:**
- Changes to backend data model or API response format
- Internationalization (remains German)
- Interactive PDF generation (use browser print)
- Mobile-specific print optimization
- User preferences/customization for print layout

## Decisions

### 1. Page Break Strategy: Day-Per-Page

**Decision**: Use CSS `page-break-before: always` on day section headers; `break-inside: avoid` on meal containers.

**Rationale**: 
- Ensures visual clarity: users see "Day 1" at top of page 1, "Day 2" at top of page 2, etc.
- Prevents confusion when reading printed documents
- Sacrifices some paper efficiency for clarity (acceptable trade-off per user feedback)

**Alternative Considered**: Allow days to flow continuously with section breaks. Rejected because users specifically requested "new day = new page."

---

### 2. Visual Containment: Bordered Meal Boxes

**Decision**: Render each meal in a bordered box (`border-2 border-gray-300`) with internal padding.

**Rationale**:
- Clear visual separation between meals
- Supports notes area placement (small box or lines beside meal)
- Professional appearance consistent with print design standards

**Alternative Considered**: Use background colors for each meal. Rejected: adds visual complexity, conflicts with "sparse colors" requirement.

---

### 3. Typography Hierarchy

**Decision**: 
- Date header: 18pt, bold, green accent
- Meal type: 16pt, bold, grey
- Meal time: 12pt, normal, inline
- Ingredients: 12pt, normal list with bullet points

**Rationale**:
- Prioritizes readability (users requested Lesbarkeit)
- Clear visual flow: date → meals → ingredients
- 12pt body complies with print accessibility standards

**Alternative Considered**: Larger overall (13pt body, 20pt date). Rejected: reduces content per page, conflicts with "standard" sizing preference.

---

### 4. Ingredient Display: Full Detail in Meal, Aggregated in Summary

**Decision**:
- Each meal shows: "Rezept-Name (Portionen) – Zutat 1 (Menge), Zutat 2 (Menge), ..."
- End of document: Shopping list section with aggregated ingredients per day + totals

**Rationale**:
- Users see full ingredient detail at meal level (no searching)
- Separate shopping list supports purchasing workflow
- Per-day aggregation helps coordinate supplies by day

**Implementation**: 
- Meal rendering: Extract ingredients from recipe via API response
- Shopping list: Sum ingredients by name across all meals, group by day, provide totals

---

### 5. Notes Area: Hybrid Approach

**Decision**: 
- Small box (3–4cm wide) beside each meal for quick notes
- Additional line areas at day's end for larger notes

**Rationale**:
- Supports both quick jottings (beside meal) and longer notes (at day's end)
- Balances between utility and space efficiency
- Users requested "hybrid" explicitly

**Implementation**:
```
┌─────────────────────────────────────┬─────────────────┐
│ Meal Box                            │ Notes area      │
│ [meal content]                      │ (3–4cm)         │
│                                     │ ..................
└─────────────────────────────────────┴─────────────────┘
Day notes: ..........................................
           ..........................................
```

---

### 6. Color System: Greyscale + Green Accents

**Decision**:
- Black/grey for text and borders
- Green (from theme `--primary` = `142 76% 36%`) only for day headers
- No other background colors in meal sections

**Rationale**:
- "Sparse colors" requirement met
- Reduces printer ink usage
- Green headers visually separate days without overwhelming

---

### 7. Shopping List Structure: Per-Day + Totals

**Decision**:
- At end of document, show two sections:
  - Per-day breakdown: Day 1 ingredients, Day 2 ingredients, etc.
  - Totals section: All ingredients summed across plan

**Rationale**:
- Supports coordinate-by-day shopping (purchase for Day 1, then Day 2)
- Totals section enables bulk purchasing decisions
- Matches user request for "both" (pro-day + totals)

---

### 8. File Structure and Component Organization

**Decision**:
- Keep rendering logic in `MealPlanPrintPage.tsx` (no new components)
- Extract helper functions for aggregation (ingredients, shopping list)
- Use existing `index.css` for print-specific styles

**Rationale**:
- Simpler than creating sub-components (DaySection, ShoppingList, etc.)
- Page is already isolated (no layout wrapper)
- Print-specific CSS is already centralized

**Alternative Considered**: Create component library (DaySection.tsx, ShoppingListSummary.tsx). Rejected: over-engineering for single-use page.

---

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| **Paper usage increases** with day-per-page strategy | Acceptable trade-off per user feedback; users prioritize readability |
| **Ingredient aggregation complexity** (many recipes, nested data) | Write robust aggregation logic with null-safety; test with various meal plans |
| **Notes areas may not print uniformly** across browsers | Test in Chrome, Firefox, Safari; document printer settings (margins, scaling) |
| **Large ingredient lists overflow** meal boxes on single line | Format as multi-line where needed; adjust box height dynamically |
| **Shopping list at end is easy to miss** | Add "🛒 EINKAUFSLISTE" header; consider page number reference |
| **Performance with very large plans** (50+ days) | Likely not in scope, but optimize rendering with useMemo if needed |

## Migration Plan

1. **Deploy**: Replace `MealPlanPrintPage.tsx` with new version; add new CSS rules to `index.css`
2. **Test**: Print 3–7 day plans in multiple browsers; verify page breaks and layout
3. **Rollback**: If critical issues found, revert both files
4. **Monitoring**: No tracking needed (UI-only change)

## Open Questions

- Should ingredient quantities be scaled to `norm_portions` automatically, or shown as-is?
  - → Spec will clarify
- What if a day has 8+ meals? Should we force-break or allow overflow?
  - → Design decision: allow overflow, add warning note at meal level
- Should recipes without details (missing ingredient data) show a placeholder?
  - → Yes: "[Zutaten nicht verfügbar]"
