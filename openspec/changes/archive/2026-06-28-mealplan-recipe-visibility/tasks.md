## 1. Regular Items – Recipe & Ingredient Cards

- [x] 1.1 Wrap each regular item row in a colored card container: `div.pl-7.py-1 > div.rounded-lg.p-3.(mealColors.bg).border.(mealColors.border)/30.group`
- [x] 1.2 Remove `pl-7` and `py-1.5` from the inner flex div, increase gap from 2 to 3
- [x] 1.3 Apply `mealColors.bg` and `mealColors.border` classes to the card container using the existing `mealColors` variable
- [x] 1.4 Re-add `text-muted-foreground` class conditionally for `meal.is_synced` items on the card container

## 2. Variant Groups – Grouped Card

- [x] 2.1 Wrap the entire variant group container in the same colored card pattern: `div.pl-7.py-1 > div.rounded-lg.p-3.(mealColors.bg).border.(mealColors.border)/30`
- [x] 2.2 Keep recipe header (image + title + NutriTagBadge) unchanged inside the card
- [x] 2.3 Change variant children from `pl-12` to `ml-6` for reduced indent within the card

## 3. Verify

- [x] 3.1 Open `/meal-plans/:id` and confirm all recipe items render in colored cards matching their meal type
- [x] 3.2 Verify variant groups show as a single card with indented children
- [x] 3.3 Verify empty meal slots show no cards (empty state CTA unchanged)
- [x] 3.4 Verify delete buttons still appear on hover
- [x] 3.5 Verify layout at 320px viewport width — no overflow, all content accessible
