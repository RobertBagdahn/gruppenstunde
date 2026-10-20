"""Spec `decision-journal`: append-only YAML entries, newest wins, survives rebuilds, orphans are listed."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path

import duckdb
import pytest
import yaml
from ruebert.data.build import nuke, rebuild
from ruebert.settings import Settings

from ruebert.journal import (
    Entry,
    JournalError,
    JournalWriteError,
    case_decisions,
    current_entries,
    find_orphans,
    history,
    read_entries,
    setting_values,
    write_entry,
)

from ..data.test_rebuild import small_source
from ..v1_fixture import V1Builder

T0 = datetime(2026, 5, 18, 9, 0, 0, tzinfo=UTC)


class TestWriteAndRead:
    def test_entry_is_a_readable_yaml_file(self, tmp_path: Path) -> None:
        entry = write_entry(
            tmp_path, type="case", subject="case:anomaly:DGW001:2025-03-03", choice="ausschließen",
            author="Robert", reason="Aktion", now=T0,
        )  # fmt: skip
        files = list((tmp_path / "case").glob("*.yaml"))
        assert [f.stem for f in files] == [entry.id]
        text = files[0].read_text(encoding="utf-8")
        assert "choice: ausschließen" in text
        assert "author: Robert" in text
        assert yaml.safe_load(text)["subject"] == "case:anomaly:DGW001:2025-03-03"

    def test_read_returns_what_was_written(self, tmp_path: Path) -> None:
        written = write_entry(
            tmp_path, type="setting", subject="setting:coverage", choice="ändern", author="R", value=0.8, now=T0
        )
        assert read_entries(tmp_path) == [written]

    def test_no_temporary_files_remain(self, tmp_path: Path) -> None:
        write_entry(tmp_path, type="case", subject="case:a", choice="verwenden", author="R", now=T0)
        assert [p.name for p in tmp_path.rglob("*") if p.is_file() and p.name.startswith(".")] == []

    def test_write_failure_raises_german_error_and_leaves_nothing(self, tmp_path: Path) -> None:
        blocked = tmp_path / "journal"
        blocked.write_text("keine Ordner")  # a file where the directory should be
        with pytest.raises(JournalWriteError, match="konnte nicht gespeichert werden"):
            write_entry(blocked, type="case", subject="case:a", choice="verwenden", author="R", now=T0)
        assert blocked.read_text() == "keine Ordner"

    def test_unreadable_file_is_reported_by_name(self, tmp_path: Path) -> None:
        (tmp_path / "case").mkdir()
        (tmp_path / "case" / "kaputt.yaml").write_text("- nur eine Liste", encoding="utf-8")
        with pytest.raises(JournalError, match=r"case/kaputt\.yaml"):
            read_entries(tmp_path)

    def test_unknown_folders_are_ignored(self, tmp_path: Path) -> None:
        (tmp_path / "notizen").mkdir()
        (tmp_path / "notizen" / "x.yaml").write_text("egal: 1", encoding="utf-8")
        assert read_entries(tmp_path) == []


class TestSupersedes:
    def test_newest_entry_per_subject_wins_and_history_is_kept(self, tmp_path: Path) -> None:
        first = write_entry(
            tmp_path, type="quantity", subject="quantity:DGW001", choice="ändern", author="R", value=20000, now=T0
        )
        second = write_entry(
            tmp_path, type="quantity", subject="quantity:DGW001", choice="ändern", author="R", value=25000,
            supersedes=first.id, now=T0 + timedelta(minutes=5),
        )  # fmt: skip
        entries = read_entries(tmp_path)
        assert current_entries(entries)["quantity:DGW001"] == second
        assert [e.value for e in history(entries, "quantity:DGW001")] == [25000, 20000]

    def test_superseding_entry_wins_even_within_the_same_second(self, tmp_path: Path) -> None:
        for _ in range(20):  # random ids must not decide
            folder = tmp_path / str(len(list(tmp_path.iterdir())))
            first = write_entry(
                folder, type="quantity", subject="quantity:A", choice="ändern", author="R", value=1, now=T0
            )
            second = write_entry(
                folder,
                type="quantity",
                subject="quantity:A",
                choice="ändern",
                author="R",
                value=2,
                supersedes=first.id,
                now=T0,
            )
            entries = read_entries(folder)
            assert current_entries(entries)["quantity:A"] == second
            assert history(entries, "quantity:A")[0] == second

    def test_files_are_never_modified_by_a_new_entry(self, tmp_path: Path) -> None:
        first = write_entry(tmp_path, type="case", subject="case:a", choice="verwenden", author="R", now=T0)
        path = tmp_path / "case" / f"{first.id}.yaml"
        before = (path.read_bytes(), path.stat().st_mtime_ns)
        write_entry(
            tmp_path,
            type="case",
            subject="case:a",
            choice="ausschließen",
            author="R",
            supersedes=first.id,
            now=T0 + timedelta(hours=1),
        )
        assert (path.read_bytes(), path.stat().st_mtime_ns) == before


class TestEffectOnViews:
    def test_case_decisions_by_case_id(self, tmp_path: Path) -> None:
        write_entry(
            tmp_path, type="case", subject="case:negative_stock:DGW001", choice="bestätigen", author="R", now=T0
        )
        write_entry(
            tmp_path, type="setting", subject="setting:coverage", choice="ändern", author="R", value=0.8, now=T0
        )
        decisions = case_decisions(read_entries(tmp_path))
        assert set(decisions) == {"negative_stock:DGW001"}
        assert decisions["negative_stock:DGW001"].choice == "bestätigen"

    def test_setting_reset_falls_back_to_default(self, tmp_path: Path) -> None:
        first = write_entry(
            tmp_path, type="setting", subject="setting:coverage", choice="ändern", author="R", value=0.7, now=T0
        )
        assert setting_values(read_entries(tmp_path)) == {"coverage": 0.7}
        write_entry(
            tmp_path,
            type="setting",
            subject="setting:coverage",
            choice="zurücksetzen",
            author="R",
            supersedes=first.id,
            now=T0 + timedelta(minutes=1),
        )
        assert setting_values(read_entries(tmp_path)) == {}

    def test_orphaned_entries_are_listed_and_kept(self, tmp_path: Path) -> None:
        write_entry(tmp_path, type="case", subject="case:gone", choice="verwenden", author="R", now=T0)
        write_entry(tmp_path, type="case", subject="case:here", choice="verwenden", author="R", now=T0)
        write_entry(
            tmp_path, type="quantity", subject="quantity:DGW999", choice="ändern", author="R", value=5000, now=T0
        )
        write_entry(
            tmp_path, type="setting", subject="setting:coverage", choice="ändern", author="R", value=0.8, now=T0
        )
        orphans = find_orphans(read_entries(tmp_path), case_ids={"here"}, skus={"DGW001"})
        assert sorted(o.entry.subject for o in orphans) == ["case:gone", "quantity:DGW999"]
        assert len(read_entries(tmp_path)) == 4


class TestSurvivesRebuild:
    def test_decision_survives_nuke_and_rebuild(self, settings: Settings, v1: V1Builder) -> None:
        v1.booking("DGW001", datetime(2026, 5, 14, 9), -150, 500)  # bulk shipping without counter-booking -> case
        small_source(v1)
        rebuild(settings)
        with duckdb.connect(str(settings.derived_db_path), read_only=True) as con:
            case_id = con.execute("SELECT case_id FROM cases ORDER BY case_id LIMIT 1").fetchone()
        assert case_id is not None
        written = write_entry(
            settings.journal_dir, type="case", subject=f"case:{case_id[0]}", choice="bestätigen", author="R", now=T0
        )
        files_before = sorted(p.read_bytes() for p in settings.journal_dir.rglob("*.yaml"))

        nuke(settings)
        assert not settings.derived_db_path.exists()
        rebuild(settings)

        assert sorted(p.read_bytes() for p in settings.journal_dir.rglob("*.yaml")) == files_before
        with duckdb.connect(str(settings.derived_db_path), read_only=True) as con:
            case_ids = {r[0] for r in con.execute("SELECT case_id FROM cases").fetchall()}
            skus = {r[0] for r in con.execute("SELECT sku FROM articles").fetchall()}
        entries = read_entries(settings.journal_dir)
        assert case_decisions(entries)[case_id[0]] == written
        assert find_orphans(entries, case_ids=case_ids, skus=skus) == []

    def test_rebuild_succeeds_with_orphaned_entry(self, settings: Settings, v1: V1Builder) -> None:
        small_source(v1)
        write_entry(
            settings.journal_dir, type="case", subject="case:existiert_nicht", choice="verwenden", author="R", now=T0
        )
        rebuild(settings)
        with duckdb.connect(str(settings.derived_db_path), read_only=True) as con:
            case_ids = {r[0] for r in con.execute("SELECT case_id FROM cases").fetchall()}
            skus = {r[0] for r in con.execute("SELECT sku FROM articles").fetchall()}
        orphans = find_orphans(read_entries(settings.journal_dir), case_ids=case_ids, skus=skus)
        assert [o.entry.subject for o in orphans] == ["case:existiert_nicht"]


class TestReadmeExample:
    def test_example_in_readme_matches_the_schema(self) -> None:
        readme = (Path(__file__).resolve().parents[3] / "journal" / "README.md").read_text(encoding="utf-8")
        block = readme.split("```yaml\n", 1)[1].split("```", 1)[0]
        document = yaml.safe_load(block)
        entry = Entry(id="beispiel", **document)
        assert entry.type == "case"
        assert entry.created_at.tzinfo is not None
