"""Verify the backend/Food structured contract before a shared release."""

from pathlib import Path


def main() -> None:
    operation_values = {"replace", "create", "package", "unchanged"}
    backend_path = Path(__file__).parents[1] / "supply/schemas/portion_magic_wand.py"
    backend_text = backend_path.read_text()
    if "operation: str" not in backend_text:
        raise SystemExit("Backend PortionMagic operation field is missing")
    schema_path = Path(__file__).parents[2] / "frontend-food/src/schemas/supply.ts"
    schema_text = schema_path.read_text()
    for value in sorted(operation_values):
        if f"'{value}'" not in schema_text:
            raise SystemExit(f"Food Zod schema is missing operation '{value}'")
    print("Backend/Food structured contract is synchronized")


if __name__ == "__main__":
    main()
