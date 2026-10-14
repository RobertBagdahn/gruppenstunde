"""The Food-Frontend mirrors the backend input bounds; both files must carry the same numbers."""

import re
from pathlib import Path

from planner.services import input_bounds

FRONTEND_BOUNDS = Path(__file__).resolve().parents[3] / "frontend-food" / "src" / "lib" / "mealPlanBounds.ts"


def _frontend_constants() -> dict[str, float]:
    constants: dict[str, float] = {}
    for name, value in re.findall(r"export const ([A-Z_]+) = ([0-9_.]+);", FRONTEND_BOUNDS.read_text()):
        constants[name] = float(value.replace("_", ""))
    return constants


def test_frontend_constants_equal_backend_constants():
    frontend = _frontend_constants()
    backend = {
        name: float(value)
        for name, value in vars(input_bounds).items()
        if name.isupper() and isinstance(value, int | float)
    }
    assert backend, "no backend constants found"
    missing = sorted(set(backend) - set(frontend))
    assert not missing, f"missing in mealPlanBounds.ts: {missing}"
    different = {name: (backend[name], frontend[name]) for name in backend if frontend[name] != backend[name]}
    assert not different, f"differing values (backend, frontend): {different}"
