"""Enrich-only transfer of the food data offensive into another database (e.g. prod via Cloud SQL Proxy).

Pure SQL (psycopg), independent of the Django models, so it runs against any
schema version of the target without migrations. Guarantees:

- Only ``UPDATE`` of system ingredients (``owner_id IS NULL``, not deleted) and
  ``INSERT`` of missing retail sections. No ``DELETE``, no merges, no renames,
  no status/visibility changes, no recipe changes.
- A value is only written when the target still holds the old baseline value,
  is empty (NULL / 0 / description < 40 chars) — values curated in the target
  after the baseline are never overwritten.
- Rows only match when slug *and* name (case-insensitive) equal the baseline.
- Dry-run by default; ``--apply`` commits in one transaction after writing a
  CSV backup of ``supply_ingredient`` and ``supply_retailsection``.

Usage:
    # 1) Build the package from the curated DB and the untouched baseline DB
    uv run python bin/enrich_food_data.py export \\
        --curated "dbname=inspi_data_offensive ..." --baseline "dbname=inspi_baseline ..." --out enrich.json

    # 2) Dry-run with a report for one user's recipes, then apply
    PGPASSWORD=... uv run python bin/enrich_food_data.py apply --dsn "host=localhost port=5433 dbname=inspi user=inspi" \\
        --package enrich.json --report-user peter
    PGPASSWORD=... uv run python bin/enrich_food_data.py apply ... --apply --backup-dir ./backup
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from decimal import Decimal
from pathlib import Path
from typing import Any

import psycopg
from psycopg.rows import dict_row

NUMERIC_FIELDS = (
    "energy_kcal",
    "protein_g",
    "fat_g",
    "fat_sat_g",
    "carbohydrate_g",
    "sugar_g",
    "fibre_g",
    "salt_g",
    "sodium_mg",
    "price_per_kg",
)
TEXT_FIELDS = ("description", "physical_viscosity")
DERIVED_FIELDS = ("nutri_score", "nutri_class", "quality_score")
MIN_DESCRIPTION_LENGTH = 40


def _plain(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    return value


def _ingredient_rows(conn: psycopg.Connection, *, include_deleted: bool) -> dict[int, dict[str, Any]]:
    fields = ", ".join(
        (
            "i.id",
            "i.slug",
            "i.name",
            "i.owner_id",
            "i.deleted_at",
            *[f"i.{f}" for f in (*NUMERIC_FIELDS, *TEXT_FIELDS, *DERIVED_FIELDS)],
        )
    )
    where = "" if include_deleted else "WHERE i.deleted_at IS NULL"
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            f"SELECT {fields}, rs.name AS retail_section FROM supply_ingredient i "
            f"LEFT JOIN supply_retailsection rs ON rs.id = i.retail_section_id {where}"
        )
        return {row["id"]: {k: _plain(v) for k, v in row.items()} for row in cur.fetchall()}


def export_package(curated_dsn: str, baseline_dsn: str, out: Path) -> None:
    with psycopg.connect(curated_dsn) as curated, psycopg.connect(baseline_dsn) as baseline:
        after_rows = _ingredient_rows(curated, include_deleted=True)
        before_rows = {row["slug"]: row for row in _ingredient_rows(baseline, include_deleted=False).values()}
        with curated.cursor() as cur:
            cur.execute(
                "SELECT l.source_object_id, l.target_object_id FROM content_contentlink l "
                "JOIN django_content_type ct ON ct.id = l.source_content_type_id "
                "WHERE ct.app_label = 'supply' AND ct.model = 'ingredient' AND l.link_type = 'duplicate_merged'"
            )
            merged_into = dict(cur.fetchall())
            cur.execute("SELECT name, rank, description FROM supply_retailsection ORDER BY rank")
            sections = [{"name": n, "rank": r, "description": d} for n, r, d in cur.fetchall()]

    def resolve(ingredient_id: int) -> dict[str, Any] | None:
        seen = set()
        while ingredient_id in merged_into and ingredient_id not in seen:
            seen.add(ingredient_id)
            ingredient_id = merged_into[ingredient_id]
        row = after_rows.get(ingredient_id)
        return row if row and row["deleted_at"] is None else None

    entries = []
    for row in after_rows.values():
        before = before_rows.get(row["slug"])
        if before is None:
            continue
        # Merged or deleted rows take the values of the ingredient they were merged into.
        after = row if row["deleted_at"] is None else resolve(row["id"])
        if after is None:
            continue
        fields = (*NUMERIC_FIELDS, *TEXT_FIELDS, *DERIVED_FIELDS, "retail_section")
        changed = {f: after[f] for f in fields if after[f] is not None and after[f] != before[f]}
        if changed:
            entries.append(
                {
                    "slug": row["slug"],
                    "name": before["name"],
                    "before": {f: before[f] for f in changed},
                    "after": changed,
                }
            )
    package = {
        "version": 1,
        "generated_at": dt.datetime.now(dt.UTC).isoformat(),
        "retail_sections": sections,
        "ingredients": entries,
    }
    out.write_text(json.dumps(package, ensure_ascii=False), encoding="utf-8")
    print(f"{out}: {len(entries)} Zutaten mit Änderungen, {len(sections)} Warengruppen")


def _is_empty(field: str, value: Any) -> bool:
    if value is None:
        return True
    if field in NUMERIC_FIELDS:
        return float(value) == 0.0
    if field == "description":
        return len(str(value).strip()) < MIN_DESCRIPTION_LENGTH
    return str(value).strip() == ""


def _same(a: Any, b: Any) -> bool:
    if a is None or b is None:
        return a is b
    if isinstance(a, int | float | Decimal) or isinstance(b, int | float | Decimal):
        return abs(float(a) - float(b)) < 1e-6
    return str(a) == str(b)


def _backup(conn: psycopg.Connection, backup_dir: Path) -> None:
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    for table in ("supply_ingredient", "supply_retailsection"):
        path = backup_dir / f"{table}-{stamp}.csv"
        with conn.cursor().copy(f"COPY {table} TO STDOUT WITH CSV HEADER") as copy, path.open("wb") as fh:
            for data in copy:
                fh.write(data)
        print(f"Backup: {path}")


def _user_report(conn: psycopg.Connection, needle: str, planned: dict[int, dict[str, tuple[Any, Any]]]) -> None:
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            "SELECT id, username, email, first_name, last_name FROM auth_user "
            "WHERE first_name ILIKE %(n)s OR last_name ILIKE %(n)s OR username ILIKE %(n)s OR email ILIKE %(n)s",
            {"n": f"%{needle}%"},
        )
        users = cur.fetchall()
        print(f"\n=== Prüfung für Nutzer „{needle}“: {len(users)} Treffer")
        for user in users:
            cur.execute(
                "SELECT r.id, r.title, r.status FROM recipe_recipe r "
                "WHERE r.created_by_id = %(u)s OR r.owner_id = %(u)s ORDER BY r.title",
                {"u": user["id"]},
            )
            recipes = cur.fetchall()
            print(f"- Nutzer #{user['id']} {user['first_name']} {user['last_name']}: {len(recipes)} Rezepte")
            cur.execute("SELECT count(*) AS n FROM supply_ingredient WHERE owner_id = %(u)s", {"u": user["id"]})
            print(f"  eigene Zutaten: {cur.fetchone()['n']} (werden NICHT verändert)")
            for recipe in recipes:
                cur.execute(
                    "SELECT DISTINCT i.id, i.name, i.owner_id FROM recipe_recipeitem ri "
                    "JOIN supply_portion p ON p.id = ri.portion_id JOIN supply_ingredient i ON i.id = p.ingredient_id "
                    "WHERE ri.recipe_id = %(r)s",
                    {"r": recipe["id"]},
                )
                items = cur.fetchall()
                touched = [item for item in items if item["id"] in planned]
                print(
                    f"  · {recipe['title']} [{recipe['status']}]: {len(items)} Zutaten, {len(touched)} werden angereichert"
                )
                for item in touched:
                    diff = ", ".join(
                        f"{f}: {_plain(old)} → {_plain(new)}"
                        for f, (old, new) in planned[item["id"]].items()
                        if f in ("energy_kcal", "fat_g", "carbohydrate_g", "protein_g", "retail_section")
                    )
                    print(f"      {item['name']}: {diff or 'nur Beschreibung/Preis/Scores'}")
        print("  Rezepte, Rezeptpositionen, Portionen und Namen bleiben unverändert.\n")


def apply_package(dsn: str, package_path: Path, *, apply: bool, backup_dir: Path, report_user: str | None) -> None:
    package = json.loads(package_path.read_text(encoding="utf-8"))
    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'supply_ingredient'")
            columns = {name for (name,) in cur.fetchall()}
            cur.execute("SELECT name, id FROM supply_retailsection")
            section_ids = dict(cur.fetchall())

        current = {row["slug"]: row for row in _ingredient_rows(conn, include_deleted=False).values()}
        missing_sections = [s for s in package["retail_sections"] if s["name"] not in section_ids]

        planned: dict[int, dict[str, tuple[Any, Any]]] = {}
        stats = {"matched": 0, "not_found": 0, "name_differs": 0, "user_owned": 0, "kept_curated": 0}
        for entry in package["ingredients"]:
            row = current.get(entry["slug"])
            if row is None:
                stats["not_found"] += 1
                continue
            if row["owner_id"] is not None:
                stats["user_owned"] += 1
                continue
            if row["name"].strip().lower() != entry["name"].strip().lower():
                stats["name_differs"] += 1
                continue
            stats["matched"] += 1
            changes: dict[str, tuple[Any, Any]] = {}
            for field, new in entry["after"].items():
                if field != "retail_section" and field not in columns:
                    continue
                old = row.get(field)
                if _same(old, new):
                    continue
                if _is_empty(field, old) or _same(old, entry["before"].get(field)):
                    changes[field] = (old, new)
                else:
                    stats["kept_curated"] += 1
            if changes:
                planned[row["id"]] = changes

        field_counts: dict[str, int] = {}
        for changes in planned.values():
            for field in changes:
                field_counts[field] = field_counts.get(field, 0) + 1

        print("=== Anreicherung", "(ANWENDEN)" if apply else "(DRY-RUN)")
        print(f"Neue Warengruppen: {len(missing_sections)} · Zutaten mit Änderungen: {len(planned)}")
        print(
            f"Abgeglichen: {stats['matched']} · nicht gefunden: {stats['not_found']} · Name abweichend: "
            f"{stats['name_differs']} · Nutzer-Zutaten übersprungen: {stats['user_owned']} · "
            f"auf Ziel gepflegte Werte behalten: {stats['kept_curated']}"
        )
        for field, count in sorted(field_counts.items(), key=lambda kv: -kv[1]):
            print(f"  {count:5}  {field}")

        if report_user:
            _user_report(conn, report_user, planned)

        if not apply:
            print("Dry-Run: nichts geschrieben.")
            return

        _backup(conn, backup_dir)
        with conn.transaction(), conn.cursor() as cur:
            for section in missing_sections:
                cur.execute(
                    "INSERT INTO supply_retailsection (name, rank, description) VALUES (%s, %s, %s) RETURNING id",
                    (section["name"], section["rank"], section["description"] or ""),
                )
                section_ids[section["name"]] = cur.fetchone()[0]
            for ingredient_id, changes in planned.items():
                assignments = []
                values: list[Any] = []
                for field, (_old, new) in changes.items():
                    if field == "retail_section":
                        assignments.append("retail_section_id = %s")
                        values.append(section_ids[new])
                    else:
                        assignments.append(f"{field} = %s")
                        values.append(new)
                if "updated_at" in columns:
                    assignments.append("updated_at = now()")
                cur.execute(
                    f"UPDATE supply_ingredient SET {', '.join(assignments)} "
                    "WHERE id = %s AND owner_id IS NULL AND deleted_at IS NULL",
                    (*values, ingredient_id),
                )
        print(f"Geschrieben: {len(planned)} Zutaten, {len(missing_sections)} Warengruppen.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    export = sub.add_parser("export")
    export.add_argument("--curated", required=True)
    export.add_argument("--baseline", required=True)
    export.add_argument("--out", type=Path, required=True)
    run = sub.add_parser("apply")
    run.add_argument("--dsn", required=True, help="libpq DSN ohne Passwort; Passwort über PGPASSWORD")
    run.add_argument("--package", type=Path, required=True)
    run.add_argument("--apply", action="store_true")
    run.add_argument("--backup-dir", type=Path, default=Path("backup"))
    run.add_argument("--report-user", default=None)
    args = parser.parse_args()
    if args.command == "export":
        export_package(args.curated, args.baseline, args.out)
    else:
        apply_package(
            args.dsn, args.package, apply=args.apply, backup_dir=args.backup_dir, report_user=args.report_user
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
