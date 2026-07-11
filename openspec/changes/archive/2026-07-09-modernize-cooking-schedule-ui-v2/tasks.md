## 1. Foundation & Configuration

- [x] 1.1 Add `MEAL_TYPE_ICONS_LUCIDE` mapping to `frontend-food/src/schemas/mealPlan.ts` with Lucide components (UtensilsCrossed, Moon, Cookie)
- [x] 1.2 Update `MEAL_TYPE_COLORS` in `mealPlan.ts` to add `dot` property for unified color usage
- [x] 1.3 Verify all MEAL_TYPE color values meet WCAG AA contrast ratios (≥4.5:1) against white/dark backgrounds
- [x] 1.4 Update Lucide imports in `CookingScheduleTab.tsx` to ensure all needed icons are imported

## 2. Timeline Cleanup

- [x] 2.1 Remove redundant timeline dots from `TimelineItem` component (delete lines 149-150: `<div className="absolute left-[4px]...` colored dot)
- [x] 2.2 Remove vertical connection lines between timeline items (delete lines 146-148: connecting line SVG)
- [x] 2.3 Test timeline rendering for all meal types (breakfast, lunch, dinner, snack) to verify no layout shift

## 3. Icon Modernization - CookingScheduleTab

- [x] 3.1 Update category header section to use Lucide icons from `MEAL_TYPE_ICONS_LUCIDE` mapping
- [x] 3.2 Replace inline emoji icons (👥, ⏱, 📝) with Lucide icons (Users, Clock, FileText)
- [x] 3.3 Update Allergen chip dangerous indicator from `AlertTriangle` emoji to Lucide component
- [x] 3.4 Verify all icon sizes are consistent (w-3.5 h-3.5 for inline, w-4 h-4 for headers)

## 4. Icon Modernization - Tab Navigation

- [x] 4.1 Verify `MealEventDetailPage.tsx` tab icons use Lucide correctly (Calendar, Grid3X3, ChefHat, Scale, DollarSign, ShoppingCart, Lightbulb)
- [x] 4.2 Add ARIA labels to all tab icons (e.g., `aria-label="Tagesplan"`)
- [x] 4.3 Ensure tab icon sizes match cooking schedule icons (w-4 h-4)

## 5. Color Palette Unification

- [x] 5.1 Update `CookingScheduleTab` to use `MEAL_TYPE_COLORS.dot` instead of `MEAL_TYPE_DOT_COLORS`
- [x] 5.2 Update category header styling in `DayTimeline` to use unified colors
- [x] 5.3 Verify color consistency across all meal plan views (Tagesplan, Tabelle, Kochplan)
- [x] 5.4 Remove old `MEAL_TYPE_DOT_COLORS` definition if no longer used elsewhere

## 6. UX Polish - Hover Effects

- [x] 6.1 Add hover state to category headers: `hover:bg-muted/30` + icon scale `group-hover:scale-105` with `transition-transform` 150ms
- [x] 6.2 Add hover state to timeline items: `hover:bg-muted/30`
- [x] 6.3 Add hover state to meal category header dot + name: subtle opacity/scale on hover
- [x] 6.4 Test hover effects on touch devices (no false positives)

## 7. Button Styling - Icon Only

- [x] 7.1 Update Share button in meal plan header to display only icon (remove text)
- [x] 7.2 Update Settings button to display only icon
- [x] 7.3 Ensure minimum touch target size of 44×44px for buttons
- [x] 7.4 Add ARIA labels to Share button: `aria-label="Essensplan teilen"`
- [x] 7.5 Add ARIA labels to Settings button: `aria-label="Einstellungen"`

## 8. Accessibility & Testing

- [x] 8.1 Verify all icons have `aria-label` attributes (screen reader support)
- [x] 8.2 Test tab navigation with keyboard (Tab, Enter keys)
- [x] 8.3 Test color contrast of meal category indicators with WebAIM contrast checker
- [x] 8.4 Test responsive behavior at mobile (≤320px), tablet, and desktop viewports)
- [x] 8.5 Verify icon visibility and alignment on all supported browsers (Chrome, Firefox, Safari)

## 9. Integration & Cross-Component Testing

- [x] 9.1 Test cooking schedule with multiple days of meal data
- [x] 9.2 Test all meal category types render correctly (breakfast, lunch, dinner, snack)
- [x] 9.3 Verify expanded/collapsed item details work smoothly (animations, layout)
- [x] 9.4 Test on mobile device or browser dev tools (mobile emulation) for final verification
- [x] 9.5 Ensure no TypeScript type errors (`npm run build` succeeds)

## 10. Documentation & Cleanup

- [x] 10.1 Update inline comments in `CookingScheduleTab.tsx` if needed (explain design decisions)
- [x] 10.2 Add comment to `MEAL_TYPE_ICONS_LUCIDE` constant explaining icon mapping
- [x] 10.3 Verify no console.log or debug code remains
- [x] 10.4 Remove commented-out old code if any
- [x] 10.5 Commit with clear message: `feat: modernize cooking schedule icons and colors`
