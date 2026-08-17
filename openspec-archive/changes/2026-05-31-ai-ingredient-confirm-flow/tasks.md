# Tasks

- [x] Refactor `handleAiSuggest` to store suggestions in state instead of auto-applying: Add `aiSuggestions` state, show dialog when suggestions arrive
- [x] Add AI suggestions confirmation dialog (modal with checkboxes, ingredient name + portion + quantity, select all, "Übernehmen"/"Verwerfen" buttons)
- [x] Add `handleApplyAiSuggestions` that calls `ai-apply-ingredients` with selected items, invalidates query, shows toast
