## REMOVED Requirements

### Requirement: HealthRule data model
**Reason**: Replaced by unified `Rule` model in `meal-plan-suggestions` capability.
**Migration**: All HealthRule data migrated to Rule model via data migration. Fields mapped: threshold_green → max_green, threshold_yellow → max_yellow (for max rules) or min_green/min_yellow (for min rules). rule_type set to "nutrition".

### Requirement: Health rules API
**Reason**: Replaced by `/api/rules/` endpoint in `meal-plan-suggestions` capability.
**Migration**: Frontend consumers switch from `/api/health-rules/` to `/api/rules/`.

### Requirement: MealEvent cockpit API
**Reason**: Replaced by `/api/meal-plans/{id}/suggestions/` endpoint in `meal-plan-suggestions` capability.
**Migration**: Frontend switches from cockpit hooks to suggestions hooks.

### Requirement: Traffic light indicators in UI
**Reason**: Ampel indicators are preserved but moved into the Vorschläge tab. Standalone cockpit tab removed.
**Migration**: TrafficLightIndicator component reused in SuggestionDashboard.

### Requirement: Health tips display
**Reason**: Tips are now part of suggestion cards in the Vorschläge tab.
**Migration**: tip_text field preserved on Rule model, shown in suggestion cards.

### Requirement: Cockpit summary card
**Reason**: Replaced by suggestion summary in the Vorschläge tab badge and header.
**Migration**: Summary status logic preserved in suggestion service.

### Requirement: Cockpit evaluates vitamin and mineral health rules
**Reason**: Vitamin/mineral evaluation preserved in the unified Rule system.
**Migration**: All vitamin/mineral HealthRules migrated to Rules with scope and parameters intact.

### Requirement: HealthRule admin interface
**Reason**: Replaced by unified "Regeln" admin tab in `meal-plan-suggestions` capability.
**Migration**: Django admin registration updated for Rule model.
