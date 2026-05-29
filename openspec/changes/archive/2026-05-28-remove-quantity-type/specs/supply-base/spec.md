## REMOVED Requirements

### Requirement: MaterialQuantityType choices
**Reason**: The `MaterialQuantityType` enum (`once`/`per_person`) is no longer needed since all recipe item quantities are implicitly per-person.
**Migration**: Remove the choices class. No other models reference it.
