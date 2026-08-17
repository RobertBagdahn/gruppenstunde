# Structured Recipe Instructions — QA Testing Checklist

## Test Execution Tracking

**Test Date:** _______________  
**Tester(s):** _______________  
**Environment:** [ ] Dev [ ] Staging [ ] Production  
**Browser/Device:** _______________  
**Build Version:** _______________

---

## Section A: Recipe Creation & Editing

### A1. Create New Recipe with Structured Steps

- [ ] Navigate to Create Recipe page
- [ ] Select "Structured Steps" mode (vs. Markdown)
- [ ] Recipe title required: "Test Recipe"
- [ ] Add 3-5 ingredients:
  - [ ] Flour (200g)
  - [ ] Water (100ml)
  - [ ] Salt (5g)
  - [ ] Butter (50g)
  - [ ] Eggs (2 pcs)
- [ ] Click "Create Recipe"
- [ ] Redirects to recipe detail page with StepEditor
- [ ] StepEditor displays empty state with "Add Step" button
- [ ] **PASS / FAIL**

### A2. Add Steps Manually

- [ ] Click "Add Step" button
- [ ] New step appears in list
- [ ] Step instruction field is editable
- [ ] Can enter text: "Mix flour with water"
- [ ] Duration field accepts numbers (e.g., "5" minutes)
- [ ] Section dropdown shows options: "Preparation", "Cooking", etc.
- [ ] Can add multiple steps (5+)
- [ ] Step numbers display correctly (1, 2, 3, ...)
- [ ] **PASS / FAIL**

### A3. Edit Step Instruction

- [ ] Click on step instruction text
- [ ] Text becomes editable
- [ ] Change instruction to "Combine dry ingredients"
- [ ] Click outside to save
- [ ] Change persists when viewing step again
- [ ] LivePreview updates to show resolved text
- [ ] **PASS / FAIL**

### A4. Assign Ingredients to Step

- [ ] Click "Zutaten" / Ingredients panel on step
- [ ] "Hinzufügen" (Add) button present
- [ ] Click to open ingredient selector modal
- [ ] Can select ingredients from recipe
- [ ] Ingredient appears in step's ingredient list
- [ ] Can adjust quantity modifier (0.5, 1.0, 2.0)
- [ ] Can add preparation notes: "finely diced"
- [ ] Can remove ingredient from step
- [ ] **PASS / FAIL**

### A5. Delete Steps

- [ ] Click delete/trash button on step
- [ ] Confirmation dialog appears
- [ ] Confirm deletion
- [ ] Step removed from list
- [ ] Remaining steps renumbered correctly
- [ ] **PASS / FAIL**

---

## Section B: AI Features (KI Buttons)

### B1. KI-Generierung (Generate Steps from Ingredients)

**Prerequisites:** Recipe has 5+ ingredients added

- [ ] Click purple "KI Generierung" button in toolbar
- [ ] Loading spinner appears
- [ ] Wait up to 10 seconds
- [ ] Modal shows generated steps (should be 4-8 steps)
- [ ] Each step has coherent instruction text
- [ ] Steps are in logical cooking order
- [ ] Click "Übernehmen" to accept
- [ ] Steps are added to editor
- [ ] Previous manual steps are replaced (or merged?)
- [ ] **PASS / FAIL**

**Error Handling:**
- [ ] If API fails: Show error toast "Fehler bei KI-Generierung"
- [ ] User can retry without data loss
- [ ] **PASS / FAIL**

### B2. KI-Umschreiben (Rewrite with Tone)

**Prerequisites:** Step has instruction text

- [ ] Click magic wand (Wand2) icon on step
- [ ] ToneSelector modal appears
- [ ] Shows 6 tone options:
  - [ ] Präzise (concise)
  - [ ] Ausführlich (detailed)
  - [ ] Kurz (very short)
  - [ ] Lustig (humorous)
  - [ ] Wissenschaftlich (scientific)
  - [ ] Anfänger (beginner-friendly)
- [ ] Each tone has description text
- [ ] Original instruction shown in gray box
- [ ] Select "Präzise" tone
- [ ] Loading spinner appears
- [ ] Improved instruction appears below
- [ ] Instruction is rewritten in selected tone
- [ ] Click checkmark to apply
- [ ] Step instruction updated
- [ ] Click X to cancel without changes
- [ ] **PASS / FAIL**

**Test Different Tones:**
- [ ] Präzise: "2 Minuten kräftig rühren"
- [ ] Ausführlich: "Rühren Sie die Mischung 2 Minuten lang kontinuierlich und kräftig, um eine homogene Konsistenz zu erreichen"
- [ ] Kurz: "2 min rühren"
- [ ] **PASS / FAIL**

### B3. KI-Automatisch (Suggest Ingredients)

**Prerequisites:** Step has instruction, recipe has ingredients

- [ ] Step instruction: "Mix flour with water"
- [ ] Click purple "Vorschlagen" button in ingredient panel
- [ ] Loading spinner appears
- [ ] Modal shows "Flour", "Water" as suggestions
- [ ] Each suggestion shows confidence %
- [ ] Suggestions are checkboxes (pre-selected by default)
- [ ] Click "Hinzufügen (2)" button
- [ ] Ingredients added to step
- [ ] Modal closes
- [ ] Step ingredients list updated
- [ ] **PASS / FAIL**

**Edge Cases:**
- [ ] Empty instruction: Button disabled or error message
- [ ] No ingredients in recipe: "Keine Zutaten verfügbar"
- [ ] All ingredients already added: Shows partial list
- [ ] **PASS / FAIL**

---

## Section C: Drag-and-Drop Reordering

### C1. Reorder Steps via Mouse Drag

- [ ] Recipe has 5 steps
- [ ] Hover over step drag handle (6-dot icon)
- [ ] Cursor changes to grab cursor
- [ ] Click and hold drag handle
- [ ] Step becomes semi-transparent
- [ ] Drag step to new position (e.g., position 3 to position 1)
- [ ] Drop zone highlighted
- [ ] Release mouse
- [ ] Step moves to new position
- [ ] Step numbers update correctly
- [ ] All other steps shift accordingly
- [ ] **PASS / FAIL**

### C2. Reorder Steps via Keyboard

- [ ] Navigate to step drag handle
- [ ] Press Space to activate grab mode
- [ ] Press arrow up/down to move step
- [ ] Step moves one position
- [ ] Release (space) to drop
- [ ] Step stays in new position
- [ ] **PASS / FAIL**

### C3. Drag-and-Drop Persistence

- [ ] Reorder steps
- [ ] Click "Speichern" (Save) button
- [ ] API call made (watch network tab)
- [ ] Loading indicator appears briefly
- [ ] Success toast: "Rezept aktualisiert"
- [ ] Refresh page (F5)
- [ ] Steps are still in new order
- [ ] **PASS / FAIL**

### C4. Mobile Drag-and-Drop

**Device:** iPhone 14 / Android device

- [ ] Navigate to recipe on mobile
- [ ] StepEditor visible
- [ ] Touch and hold drag handle
- [ ] Step becomes draggable
- [ ] Drag step to new position
- [ ] Drop and reorder works
- [ ] Works with thumbs (not just fingers)
- [ ] **PASS / FAIL**

---

## Section D: Placeholder Resolution

### D1. Simple Placeholder Resolution

- [ ] Step instruction: "Mix {1} with {2}"
- [ ] Step ingredients: [Flour (ID 1), Water (ID 2)]
- [ ] LivePreview shows: "Mix Flour with Water"
- [ ] Placeholders resolved correctly
- [ ] **PASS / FAIL**

### D2. Named Placeholders

- [ ] Step instruction: "Add {ingredient_name} to bowl"
- [ ] Step has first ingredient: Salt
- [ ] LivePreview shows: "Add Salt to bowl"
- [ ] **PASS / FAIL**

### D3. Missing Placeholders

- [ ] Step instruction: "{1} and {2} mixed well"
- [ ] Only 1 ingredient assigned (Flour)
- [ ] LivePreview shows: "Flour and {2} mixed well"
- [ ] Missing placeholder stays as-is (doesn't crash)
- [ ] **PASS / FAIL**

### D4. Special Characters in Ingredient Names

- [ ] Ingredient: "Crème Fraîche (30%)"
- [ ] Instruction: "{1} hinzufügen"
- [ ] LivePreview shows: "Crème Fraîche (30%) hinzufügen"
- [ ] Special chars preserved
- [ ] **PASS / FAIL**

---

## Section E: Save & Persistence

### E1. Save Steps

- [ ] Add 3 steps with ingredients
- [ ] Click "Speichern" button
- [ ] Loading indicator
- [ ] Success toast appears
- [ ] Button returns to normal state
- [ ] **PASS / FAIL**

### E2. Undo Changes

- [ ] Add step "Step A"
- [ ] Add step "Step B"
- [ ] Click "Undo" button
- [ ] "Step B" removed (reverts to previous state)
- [ ] Click "Undo" again
- [ ] "Step A" removed
- [ ] "Undo" button disabled (no more history)
- [ ] **PASS / FAIL**

### E3. Redo Changes

- [ ] Undo twice
- [ ] Click "Redo" button
- [ ] "Step A" re-added
- [ ] Click "Redo" again
- [ ] "Step B" re-added
- [ ] "Redo" button disabled (no more redo)
- [ ] **PASS / FAIL**

### E4. Changes Detection

- [ ] Add step
- [ ] "Speichern" button is enabled (bold/highlighted)
- [ ] Don't make changes
- [ ] "Speichern" button is disabled (grayed out)
- [ ] "Undo" button is disabled
- [ ] **PASS / FAIL**

---

## Section F: Integration with Other Modes

### F1. Recipe Detail Page

- [ ] Navigate to recipe with structured steps
- [ ] StepEditor visible in detail page
- [ ] Can edit steps inline
- [ ] "steps_count" field shows correct number
- [ ] Ingredients section still shows all recipe ingredients
- [ ] Other recipe fields (title, description) unchanged
- [ ] **PASS / FAIL**

### F2. Recipe Cooking Mode

- [ ] Click "Kochmodus" (Cooking Mode)
- [ ] Current step highlighted
- [ ] Shows step number and instruction
- [ ] Shows step-specific ingredients (not all ingredients)
- [ ] Can scroll through steps
- [ ] Navigation (previous/next) works
- [ ] Timers for each step work
- [ ] **PASS / FAIL**

### F3. Recipe Print Page

- [ ] Click Print (or Cmd+P)
- [ ] Print dialog opens
- [ ] Print preview shows structured steps in two-column layout
- [ ] Each step has:
  - [ ] Step number
  - [ ] Instruction text
  - [ ] Duration badge (if set)
  - [ ] Section label (if set)
  - [ ] Step-specific ingredients
- [ ] Print output is readable and properly formatted
- [ ] Can print to PDF without errors
- [ ] **PASS / FAIL**

### F4. Recipe List Page

- [ ] Browse recipe list
- [ ] Recipes with structured steps show "steps_count" indicator
- [ ] Can see both old (markdown) and new (structured) recipes
- [ ] Mixed display doesn't break layout
- [ ] **PASS / FAIL**

---

## Section G: Backward Compatibility

### G1. Markdown Recipes Still Work

- [ ] View old recipe with markdown description
- [ ] "Legacy Mode" or "Markdown" badge shows
- [ ] Can edit markdown description
- [ ] Structured steps not shown (or offer migration)
- [ ] Cooking mode shows markdown as fallback
- [ ] **PASS / FAIL**

### G2. Convert Markdown to Structured (Manual)

- [ ] Old recipe with markdown description
- [ ] Click "Convert to Structured Steps" option
- [ ] Confirmation dialog appears
- [ ] Click "Generate Steps with AI"
- [ ] Loading spinner
- [ ] Steps generated from markdown
- [ ] User can review before applying
- [ ] Click "Save"
- [ ] Recipe now has structured steps
- [ ] Markdown description still preserved as backup
- [ ] **PASS / FAIL**

### G3. Fallback to Markdown

- [ ] Create recipe with structured steps
- [ ] Disable feature flag: `FEATURE_STRUCTURED_STEPS=false`
- [ ] Refresh page
- [ ] Recipe still displays (uses markdown fallback)
- [ ] No 404 errors
- [ ] Can still view and edit
- [ ] **PASS / FAIL**

---

## Section H: Error Handling

### H1. Network Error During Save

- [ ] Add steps
- [ ] Simulate network failure (DevTools → offline)
- [ ] Click "Speichern"
- [ ] Error toast appears: "Netzwerkfehler"
- [ ] User can retry after network restored
- [ ] Data is not lost
- [ ] **PASS / FAIL**

### H2. API Error (400 Validation)

- [ ] Create invalid step (empty instruction)
- [ ] Try to save
- [ ] API returns 400 error
- [ ] Error toast shows: "Ungültige Daten: Anleitung erforderlich"
- [ ] Can fix and retry
- [ ] **PASS / FAIL**

### H3. Permission Denied (403)

- [ ] User without edit permission views recipe
- [ ] Try to modify step
- [ ] API returns 403
- [ ] Error toast: "Berechtigung erforderlich"
- [ ] "Speichern" button disabled
- [ ] **PASS / FAIL**

### H4. KI Service Unavailable

- [ ] Simulate KI service down (mock API 503)
- [ ] Click "KI Generierung"
- [ ] Error toast: "KI-Service nicht verfügbar"
- [ ] Can retry without losing data
- [ ] **PASS / FAIL**

---

## Section I: Performance & Load Testing

### I1. Large Recipe (50 Steps)

- [ ] Load recipe with 50 structured steps
- [ ] Page loads within 2 seconds
- [ ] All steps display correctly
- [ ] Drag-and-drop is smooth (60 FPS)
- [ ] No freezing when scrolling
- [ ] Save completes within 3 seconds
- [ ] **PASS / FAIL**

### I2. Mobile Performance

- [ ] Load recipe on iPhone 14
- [ ] Page loads within 3 seconds
- [ ] Scrolling is smooth (60 FPS)
- [ ] Drag-and-drop responsive
- [ ] No layout shift or jank
- [ ] **PASS / FAIL**

### I3. Slow Network (Simulated 3G)

- [ ] Enable DevTools → slow 3G
- [ ] Load recipe
- [ ] Page renders progressively
- [ ] Placeholder shows while loading
- [ ] API calls show spinner feedback
- [ ] Can interact before fully loaded
- [ ] **PASS / FAIL**

---

## Section J: Accessibility & Usability

### J1. Keyboard Navigation

- [ ] Tab to all interactive elements
- [ ] Can add step with keyboard (Tab + Enter)
- [ ] Can delete step with keyboard (Tab + Delete)
- [ ] Drag-and-drop with keyboard (Space + arrows)
- [ ] Focus visible on all buttons
- [ ] **PASS / FAIL**

### J2. Screen Reader Compatibility

- [ ] VoiceOver (Mac): Navigate and edit steps
- [ ] NVDA (Windows): Read step instructions
- [ ] Buttons have aria-labels
- [ ] Form fields have labels
- [ ] Error messages announced
- [ ] **PASS / FAIL**

### J3. Color Contrast

- [ ] Purple KI buttons (text) meet WCAG AA
- [ ] Section badges readable
- [ ] Duration badges readable
- [ ] **PASS / FAIL**

### J4. Mobile Usability

- [ ] Small screens (< 375px): Layout responsive
- [ ] Touch targets at least 44x44px
- [ ] No horizontal scroll
- [ ] Can interact with thumbs
- [ ] **PASS / FAIL**

---

## Section K: Cross-Browser Testing

### K1. Chrome / Chromium (Latest)

- [ ] Rendering correct
- [ ] DnD smooth
- [ ] API calls work
- [ ] **PASS / FAIL**

### K2. Firefox (Latest)

- [ ] Rendering correct
- [ ] DnD smooth
- [ ] All animations smooth
- [ ] **PASS / FAIL**

### K3. Safari (Latest)

- [ ] Rendering correct
- [ ] Touch-based DnD works
- [ ] No layout issues
- [ ] **PASS / FAIL**

### K4. Edge (Latest)

- [ ] Rendering correct
- [ ] API calls work
- [ ] **PASS / FAIL**

---

## Final Checklist

### Before Deployment

- [ ] All test sections marked PASS
- [ ] No critical issues remaining
- [ ] Backend tests passing (50+ tests)
- [ ] Frontend tests passing (190+ tests)
- [ ] E2E workflow tested manually
- [ ] Database migrations verified
- [ ] Performance acceptable (< 3s load)
- [ ] Error handling verified
- [ ] Accessibility tested
- [ ] Cross-browser tested

### Sign-Off

**QA Tester:** _________________ **Date:** __________  
**QA Lead:** _________________ **Date:** __________  
**Product Manager:** _________________ **Date:** __________

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-10  
**Next Review:** After Phase 1 deployment
