"""Writes the OpenAPI contract of the running app to a file: `make generate-schemas` reads it (ADR-05)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from ruebert.main import app


def export(target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(app.openapi(), ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    export(Path(sys.argv[1]))
