# Legacy Portion Data

Migration `0012_backfill_portion_weight_status` deliberately leaves ambiguous
piece-like portions unresolved. Examples include legacy rows named `Stück`,
`Scheibe`, `Zehe`, or size-specific piece names whose stored weight cannot be
proven to be confirmed. Existing recipe references are not changed.

These rows are intentionally excluded from gram-based calculations until a
user confirms the weight or the separate `repair-food-portion-data` change
provides a reviewed repair proposal. Definitionally derived metric portions
and unambiguous kitchen-unit weights are marked trusted by the migration.
