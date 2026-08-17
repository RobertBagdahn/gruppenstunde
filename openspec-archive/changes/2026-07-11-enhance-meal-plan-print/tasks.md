## 1. Print Page Restructuring

- [x] 1.1 Refactor MealPlanPrintPage.tsx to separate layout logic from rendering
- [x] 1.2 Create helper function `groupMealsByDate()` to organize meals into day sections
- [x] 1.3 Implement `formatDate()` helper (if not already present) for consistent date formatting
- [x] 1.4 Create TypeScript interface for grouped meal structure (DaySection)

## 2. Day Section Layout & Page Breaks

- [x] 2.1 Add CSS rule for day headers: `page-break-before: always` in @media print
- [x] 2.2 Add CSS rule for meal containers: `break-inside: avoid` in @media print
- [x] 2.3 Implement day header component with formatted date (18pt, bold, green accent)
- [x] 2.4 Test page breaks with multi-day meal plans (3–7 days) in browser print preview
- [x] 2.5 Verify meal containers don't split across pages when day is on page boundary

## 3. Meal Box Styling & Typography

- [x] 3.1 Add CSS classes for meal container boxes (border-2, grey color, padding)
- [x] 3.2 Set up typography CSS: 18pt dates, 16pt meal types, 12pt body (in @media print)
- [x] 3.3 Add minimalist symbol styling for meal types (small, decorative, not oversized)
- [x] 3.4 Render meal type header with time inline (e.g., "FRÜHSTÜCK (08:00 Uhr)")
- [x] 3.5 Style ingredient list with bullets and consistent 12pt font
- [x] 3.6 Ensure contrast ratios meet print accessibility standards (black/dark grey on white)

## 4. Color System & Professional Styling

- [x] 4.1 Define print color palette in CSS: greyscale (#000, #333, #666, #d4d4d8) + green (#142 76% 36%)
- [x] 4.2 Apply greyscale to all borders and text except day headers
- [x] 4.3 Apply green accent only to day headers (background or border)
- [x] 4.4 Remove all background colors from meal boxes (keep white background)
- [x] 4.5 Remove shadows, gradients, and decorative elements from print context

## 5. Ingredient Display & Data Extraction

- [x] 5.1 Create helper function `formatIngredients()` to extract and format ingredients from recipe items
- [x] 5.2 Display format: "Recipe Name (Portionen) – Zutat 1 (Menge), Zutat 2 (Menge), ..."
- [x] 5.3 Handle missing ingredient data with "[Zutaten nicht verfügbar]" placeholder
- [x] 5.4 Test with various recipe types and meal plans to ensure data is complete

## 6. Notes Area Integration

- [x] 6.1 Create inline notes box component beside each meal (3–4cm wide)
- [x] 6.2 Add CSS styling for notes box: light grey background/border, "Notizen" label
- [x] 6.3 Implement day-end notes lines (2–3 horizontal lines per day)
- [x] 6.4 Position notes box to right of meal content; adjust layout to support narrow column
- [x] 6.5 Ensure notes areas don't overflow or affect meal content visibility
- [x] 6.6 Test notes area printing across browsers (Chrome, Firefox, Safari)

## 7. Shopping List Aggregation

- [x] 7.1 Create helper function `aggregateIngredientsByDay()` to group ingredients by day
- [x] 7.2 Create helper function `calculateTotalIngredients()` to sum ingredients across entire plan
- [x] 7.3 Create ShoppingListSummary component with per-day and totals sections
- [x] 7.4 Implement alphabetical or category sorting for ingredients
- [x] 7.5 Ensure units are preserved and displayed correctly (kg, g, L, Stück, etc.)
- [x] 7.6 Handle edge case: missing ingredient data in shopping list aggregation

## 8. Footer Implementation

- [x] 8.1 Add CSS @page rule with footer styling in @media print
- [x] 8.2 Implement page numbering using CSS counters (page, pages)
- [x] 8.3 Create footer template with "Seite X von Y" format (German)
- [x] 8.4 Add document reference (plan name + URL) to footer
- [x] 8.5 Style footer: 8–10pt font, light grey (#666), border-top separator
- [x] 8.6 Ensure footer respects margins and is printable on all pages

## 9. A4 Page Layout & Margins

- [x] 9.1 Set @page CSS margin to 2cm on all sides
- [x] 9.2 Constrain max-width to 21cm (A4 width minus margins)
- [x] 9.3 Set background to white and text to black/dark grey in @media print
- [x] 9.4 Test printability across multiple page configurations in browser

## 10. Data Handling & Error States

- [x] 10.1 Add null-safety checks for meal items, recipes, and ingredients
- [x] 10.2 Handle empty meal plans gracefully (show message or fallback)
- [x] 10.3 Test with meal plans that have incomplete recipe data
- [x] 10.4 Verify no console errors or warnings in production print

## 11. Print Preview & Browser Testing

- [x] 11.1 Test print preview in Chrome (desktop + mobile)
- [x] 11.2 Test print preview in Firefox (desktop + mobile)
- [x] 11.3 Test print preview in Safari (desktop + mobile)
- [x] 11.4 Verify page breaks are consistent across browsers
- [x] 11.5 Print actual documents and verify physical layout
- [x] 11.6 Test scaling options (100%, 95%, 90%) in browser print dialog

## 12. Visual Polish & QA

- [x] 12.1 Review typography hierarchy (dates 18pt, meals 16pt, body 12pt)
- [x] 12.2 Verify spacing consistency (2rem between days, 1rem between meals, 0.5rem between meal/ingredients)
- [x] 12.3 Check that minimalist symbols render correctly (no oversized emojis)
- [x] 12.4 Verify colour scheme: greyscale + green only (no other colours)
- [x] 12.5 Confirm notes areas don't interfere with meal content
- [x] 12.6 Spot-check shopping list aggregation for accuracy

## 13. Documentation & Final Testing

- [x] 13.1 Add code comments explaining page break logic and CSS rules
- [x] 13.2 Document printer settings recommendations in comments or UI tooltip
- [x] 13.3 Run final end-to-end test with 3–7 day meal plans
- [x] 13.4 Verify no regressions in non-print view or other meal plan pages
- [x] 13.5 Clean up any temporary debugging code
- [x] 13.6 Mark MealPlanPrintPage.tsx as ready for review
