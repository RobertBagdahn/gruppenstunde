## 1. Print Page Restructuring

- [ ] 1.1 Refactor MealPlanPrintPage.tsx to separate layout logic from rendering
- [ ] 1.2 Create helper function `groupMealsByDate()` to organize meals into day sections
- [ ] 1.3 Implement `formatDate()` helper (if not already present) for consistent date formatting
- [ ] 1.4 Create TypeScript interface for grouped meal structure (DaySection)

## 2. Day Section Layout & Page Breaks

- [ ] 2.1 Add CSS rule for day headers: `page-break-before: always` in @media print
- [ ] 2.2 Add CSS rule for meal containers: `break-inside: avoid` in @media print
- [ ] 2.3 Implement day header component with formatted date (18pt, bold, green accent)
- [ ] 2.4 Test page breaks with multi-day meal plans (3–7 days) in browser print preview
- [ ] 2.5 Verify meal containers don't split across pages when day is on page boundary

## 3. Meal Box Styling & Typography

- [ ] 3.1 Add CSS classes for meal container boxes (border-2, grey color, padding)
- [ ] 3.2 Set up typography CSS: 18pt dates, 16pt meal types, 12pt body (in @media print)
- [ ] 3.3 Add minimalist symbol styling for meal types (small, decorative, not oversized)
- [ ] 3.4 Render meal type header with time inline (e.g., "FRÜHSTÜCK (08:00 Uhr)")
- [ ] 3.5 Style ingredient list with bullets and consistent 12pt font
- [ ] 3.6 Ensure contrast ratios meet print accessibility standards (black/dark grey on white)

## 4. Color System & Professional Styling

- [ ] 4.1 Define print color palette in CSS: greyscale (#000, #333, #666, #d4d4d8) + green (#142 76% 36%)
- [ ] 4.2 Apply greyscale to all borders and text except day headers
- [ ] 4.3 Apply green accent only to day headers (background or border)
- [ ] 4.4 Remove all background colors from meal boxes (keep white background)
- [ ] 4.5 Remove shadows, gradients, and decorative elements from print context

## 5. Ingredient Display & Data Extraction

- [ ] 5.1 Create helper function `formatIngredients()` to extract and format ingredients from recipe items
- [ ] 5.2 Display format: "Recipe Name (Portionen) – Zutat 1 (Menge), Zutat 2 (Menge), ..."
- [ ] 5.3 Handle missing ingredient data with "[Zutaten nicht verfügbar]" placeholder
- [ ] 5.4 Test with various recipe types and meal plans to ensure data is complete

## 6. Notes Area Integration

- [ ] 6.1 Create inline notes box component beside each meal (3–4cm wide)
- [ ] 6.2 Add CSS styling for notes box: light grey background/border, "Notizen" label
- [ ] 6.3 Implement day-end notes lines (2–3 horizontal lines per day)
- [ ] 6.4 Position notes box to right of meal content; adjust layout to support narrow column
- [ ] 6.5 Ensure notes areas don't overflow or affect meal content visibility
- [ ] 6.6 Test notes area printing across browsers (Chrome, Firefox, Safari)

## 7. Shopping List Aggregation

- [ ] 7.1 Create helper function `aggregateIngredientsByDay()` to group ingredients by day
- [ ] 7.2 Create helper function `calculateTotalIngredients()` to sum ingredients across entire plan
- [ ] 7.3 Create ShoppingListSummary component with per-day and totals sections
- [ ] 7.4 Implement alphabetical or category sorting for ingredients
- [ ] 7.5 Ensure units are preserved and displayed correctly (kg, g, L, Stück, etc.)
- [ ] 7.6 Handle edge case: missing ingredient data in shopping list aggregation

## 8. Footer Implementation

- [ ] 8.1 Add CSS @page rule with footer styling in @media print
- [ ] 8.2 Implement page numbering using CSS counters (page, pages)
- [ ] 8.3 Create footer template with "Seite X von Y" format (German)
- [ ] 8.4 Add document reference (plan name + URL) to footer
- [ ] 8.5 Style footer: 8–10pt font, light grey (#666), border-top separator
- [ ] 8.6 Ensure footer respects margins and is printable on all pages

## 9. A4 Page Layout & Margins

- [ ] 9.1 Set @page CSS margin to 2cm on all sides
- [ ] 9.2 Constrain max-width to 21cm (A4 width minus margins)
- [ ] 9.3 Set background to white and text to black/dark grey in @media print
- [ ] 9.4 Test printability across multiple page configurations in browser

## 10. Data Handling & Error States

- [ ] 10.1 Add null-safety checks for meal items, recipes, and ingredients
- [ ] 10.2 Handle empty meal plans gracefully (show message or fallback)
- [ ] 10.3 Test with meal plans that have incomplete recipe data
- [ ] 10.4 Verify no console errors or warnings in production print

## 11. Print Preview & Browser Testing

- [ ] 11.1 Test print preview in Chrome (desktop + mobile)
- [ ] 11.2 Test print preview in Firefox (desktop + mobile)
- [ ] 11.3 Test print preview in Safari (desktop + mobile)
- [ ] 11.4 Verify page breaks are consistent across browsers
- [ ] 11.5 Print actual documents and verify physical layout
- [ ] 11.6 Test scaling options (100%, 95%, 90%) in browser print dialog

## 12. Visual Polish & QA

- [ ] 12.1 Review typography hierarchy (dates 18pt, meals 16pt, body 12pt)
- [ ] 12.2 Verify spacing consistency (2rem between days, 1rem between meals, 0.5rem between meal/ingredients)
- [ ] 12.3 Check that minimalist symbols render correctly (no oversized emojis)
- [ ] 12.4 Verify colour scheme: greyscale + green only (no other colours)
- [ ] 12.5 Confirm notes areas don't interfere with meal content
- [ ] 12.6 Spot-check shopping list aggregation for accuracy

## 13. Documentation & Final Testing

- [ ] 13.1 Add code comments explaining page break logic and CSS rules
- [ ] 13.2 Document printer settings recommendations in comments or UI tooltip
- [ ] 13.3 Run final end-to-end test with 3–7 day meal plans
- [ ] 13.4 Verify no regressions in non-print view or other meal plan pages
- [ ] 13.5 Clean up any temporary debugging code
- [ ] 13.6 Mark MealPlanPrintPage.tsx as ready for review
