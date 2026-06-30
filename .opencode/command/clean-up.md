---
description: Audit the repo for schema mismatches, bugs, dead code, TODOs, missing impl/tests, spec drift, wrong logic, risks, bad practices and layout inconsistencies
---

Run a repo-wide quality audit of the Inspi monorepo.

Load and follow the **clean-up** skill (`.opencode/skills/clean-up/SKILL.md`) end to end.

**Input**: The argument after `/clean-up` sets the scope:
- empty → whole repo
- a path (e.g. `backend/recipe`, `frontend-food/src/pages/planning`) → only that subtree
- a keyword (`schema`, `dead`, `todo`, `specs`, `layout`, `tests`, `logic`, `bugs`, `risk`, `errors`) → only that dimension

Argument: $ARGUMENTS

Produce the prioritized Markdown report (with the OpenSpec last-10 summary table) and then ask before applying any of the safe auto-fixes. Never auto-fix bugs, schema mismatches, wrong logic, or anything that changes behavior/contracts.
