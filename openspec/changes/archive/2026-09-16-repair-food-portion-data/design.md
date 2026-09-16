## Context

The database contains legacy and imported portions whose names imply pieces while their units or weights imply grams. Some are referenced by many RecipeItems, so changing a shared Portion in place would silently alter multiple recipes. The repair must be AI-assisted, high-confidence automatic by default, idempotent and auditable.

## Goals / Non-Goals

**Goals:**

- Scan and classify suspicious portions and recipe item references.
- Ask Gemini for structured repair proposals with confidence and rationale.
- Apply high-confidence repairs automatically within safe transactions.
- Create replacement portions for referenced definitions and move only affected RecipeItems.
- Record a durable audit trail and expose uncertain cases to staff.
- Recalculate/invalidate downstream caches.

**Non-Goals:**

- Do not delete ingredients or recipes automatically.
- Do not globally overwrite a referenced portion's weight.
- Do not use the repair job as a replacement for new import-time confirmation flows.

## Decisions

### Candidate scanner before AI

A deterministic scanner selects candidates using piece-like names, unit mismatch, `weight_g` values such as `1 g`, missing weights, rank-1 plausibility and recipe usage. This bounds AI cost and makes the repair explainable.

### Structured repair model

Add `PortionRepairFinding`/audit records with old portion data, AI proposal, confidence, status, applied portion ID, moved RecipeItem count and timestamps. The service supports dry-run and apply modes.

### Confidence threshold

Use a configurable high-confidence threshold, default `0.90`. Findings below the threshold remain pending review. The threshold and prompt version are stored with each finding.

### Safe replacement algorithm

For an unreferenced portion, a high-confidence repair may update or replace the portion according to normal integrity rules. For a referenced portion, create a new uniquely named portion and move only RecipeItems whose current data matches the finding's intended correction. All item moves and audit writes occur in one transaction.

### Management and admin API

- `manage.py repair_portion_data --dry-run` scans and creates proposals without writes to portions/items.
- `manage.py repair_portion_data --apply --min-confidence=0.90` applies eligible proposals.
- Staff API lists findings, supports explicit apply/reject and exposes audit details for the Food data-quality page.

## Risks / Trade-offs

- [AI can misinterpret a product portion] -> High threshold, deterministic candidate constraints, dry-run and audit records.
- [A recipe may intentionally use an unusual weight] -> Preserve old data and only auto-move when the finding includes a matching source signature.
- [Large repair runs can lock tables] -> Batch by ingredient/portion, short transactions and resumable statuses.
- [Cache recalculation is expensive] -> Collect affected recipes and recalculate once per recipe after successful batches.

## Migration Plan

1. Add audit/finding model migration only.
2. Run dry-run scanner in production-like data and review candidate statistics.
3. Enable high-confidence apply in batches with backups and audit verification.
4. Recalculate affected recipe and planner caches.
5. Keep rejected/pending findings for later review; rollback by restoring old item references from audit records if needed.
