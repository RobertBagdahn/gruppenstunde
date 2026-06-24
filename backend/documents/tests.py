"""Tests for the registration PDF generator."""

from __future__ import annotations

import datetime
import sys
from pathlib import Path

# Add documents directory to path
DOCS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(DOCS_DIR))

from page_optimizer import optimize_layout
from pdf_builder import LayoutParams, build_all_flowables, trial_build_pages
from schema import (
    EventConfig,
    RegistrationConfig,
    load_defaults,
    resolve_form_fields,
    resolve_packlist,
)
from text_resolver import (
    format_date_range,
    format_deadline,
    format_fee,
    format_meeting_point,
    german_weekday,
    resolve_text,
)


def test_yaml_validation_minimal() -> None:
    """Test that minimal valid YAML passes validation."""
    config = RegistrationConfig(
        event=EventConfig(
            name="Test",
            start_date=datetime.date(2026, 5, 29),
            end_date=datetime.date(2026, 5, 31),
            meeting_point="Bahnhof XY",
            fee=25.0,
            registration_deadline=datetime.date(2026, 5, 22),
        ),
    )
    assert config.event.name == "Test"
    assert config.participants.type == "Pfadfinder"
    assert config.layout.pages == 1


def test_yaml_validation_full() -> None:
    """Test full config with all fields."""
    config = RegistrationConfig(
        event=EventConfig(
            name="Sippentippel",
            type="sippentippel",
            location="Königswinter",
            area="das schöne Siebengebirge",
            theme="Römer",
            start_date=datetime.date(2026, 5, 29),
            start_time="16:30",
            end_date=datetime.date(2026, 5, 31),
            end_time="15:00",
            meeting_point="Bahnhof Korschenbroich",
            fee=25.0,
            fee_note="passend in bar",
            registration_deadline=datetime.date(2026, 5, 22),
        ),
        participants={"type": "Sipplinge"},
        layout={"pages": 2},
    )
    assert config.event.theme == "Römer"
    assert config.layout.pages == 2
    assert config.event.return_point == "Bahnhof Korschenbroich"


def test_yaml_validation_missing_field() -> None:
    """Test that missing required field raises error."""
    try:
        EventConfig(
            name="Test",
            # start_date missing
            end_date=datetime.date(2026, 5, 31),
            meeting_point="Bahnhof",
            fee=25.0,
            registration_deadline=datetime.date(2026, 5, 22),
        )
        assert False, "Should have raised"
    except Exception as e:
        assert "start_date" in str(e)


def test_return_point_default() -> None:
    """Test return_point defaults to meeting_point."""
    config = EventConfig(
        name="Test",
        start_date=datetime.date(2026, 5, 29),
        end_date=datetime.date(2026, 5, 31),
        meeting_point="Bahnhof Korschenbroich",
        fee=25.0,
        registration_deadline=datetime.date(2026, 5, 22),
    )
    assert config.return_point == "Bahnhof Korschenbroich"


def test_packlist_preset() -> None:
    """Test packlist preset resolution."""
    defaults = load_defaults(DOCS_DIR)
    result = resolve_packlist("wanderung", [], defaults)
    assert "festes Schuhwerk" in result
    assert "Regenjacke" in result


def test_packlist_with_extras() -> None:
    """Test packlist with extra items."""
    defaults = load_defaults(DOCS_DIR)
    result = resolve_packlist("wanderung", ["Taschenmesser"], defaults)
    assert "Taschenmesser" in result
    assert "festes Schuhwerk" in result


def test_packlist_inline() -> None:
    """Test inline packlist."""
    defaults = load_defaults(DOCS_DIR)
    result = resolve_packlist(["Item A", "Item B"], [], defaults)
    assert result == ["Item A", "Item B"]


def test_packlist_unknown_key() -> None:
    """Test unknown packlist preset key."""
    defaults = load_defaults(DOCS_DIR)
    try:
        resolve_packlist("nonexistent", [], defaults)
        assert False, "Should have raised"
    except ValueError as e:
        assert "nonexistent" in str(e)
        assert "wanderung" in str(e)


def test_form_fields_preset() -> None:
    """Test form fields preset resolution."""
    defaults = load_defaults(DOCS_DIR)
    result = resolve_form_fields("standard", defaults)
    assert len(result) > 0
    assert result[0].type == "text_line"
    assert result[0].label == "Name"


def test_form_fields_unknown_key() -> None:
    """Test unknown form fields preset key."""
    defaults = load_defaults(DOCS_DIR)
    try:
        resolve_form_fields("nonexistent", defaults)
        assert False, "Should have raised"
    except ValueError as e:
        assert "nonexistent" in str(e)


def test_german_weekday() -> None:
    """Test German weekday names."""
    assert german_weekday(datetime.date(2026, 5, 29)) == "Freitag"
    assert german_weekday(datetime.date(2026, 5, 31)) == "Sonntag"
    assert german_weekday(datetime.date(2026, 5, 25)) == "Montag"


def test_format_date_range() -> None:
    """Test date range formatting."""
    event = EventConfig(
        name="Test",
        start_date=datetime.date(2026, 5, 29),
        end_date=datetime.date(2026, 5, 31),
        meeting_point="Bahnhof",
        fee=25.0,
        registration_deadline=datetime.date(2026, 5, 22),
    )
    result = format_date_range(event)
    assert result == "Freitag, 29.05.2026 bis Sonntag, 31.05.2026"


def test_format_meeting_point() -> None:
    """Test meeting point string generation."""
    event = EventConfig(
        name="Test",
        start_date=datetime.date(2026, 5, 29),
        start_time="16:30",
        end_date=datetime.date(2026, 5, 31),
        meeting_point="Bahnhof Korschenbroich",
        fee=25.0,
        registration_deadline=datetime.date(2026, 5, 22),
    )
    result = format_meeting_point(event)
    assert result == "Freitag um 16:30 Uhr am Bahnhof Korschenbroich"


def test_format_fee() -> None:
    """Test fee string generation."""
    event = EventConfig(
        name="Test",
        start_date=datetime.date(2026, 5, 29),
        end_date=datetime.date(2026, 5, 31),
        meeting_point="Bahnhof",
        fee=25.0,
        fee_note="passend in bar mitbringen",
        registration_deadline=datetime.date(2026, 5, 22),
    )
    result = format_fee(event)
    assert result == "25,00 € (passend in bar mitbringen)"


def test_format_deadline() -> None:
    """Test deadline formatting."""
    event = EventConfig(
        name="Test",
        start_date=datetime.date(2026, 5, 29),
        end_date=datetime.date(2026, 5, 31),
        meeting_point="Bahnhof",
        fee=25.0,
        registration_deadline=datetime.date(2026, 5, 22),
    )
    result = format_deadline(event)
    assert result == "Bitte bis zum 22. Mai 2026 abgeben!"


def test_text_resolver_preset() -> None:
    """Test text resolution with preset key."""
    defaults = load_defaults(DOCS_DIR)
    config = RegistrationConfig(
        event=EventConfig(
            name="Sippentippel",
            type="sippentippel",
            location="Königswinter",
            area="das schöne Siebengebirge",
            start_date=datetime.date(2026, 5, 29),
            end_date=datetime.date(2026, 5, 31),
            meeting_point="Bahnhof Korschenbroich",
            fee=25.0,
            registration_deadline=datetime.date(2026, 5, 22),
        ),
        participants={"type": "Sipplinge"},
    )
    result = resolve_text("greeting", "default", config, defaults)
    assert "Sipplinge" in result
    assert "Sippentippel" in result
    assert "Königswinter" in result


def test_text_resolver_explicit_override() -> None:
    """Test text resolution with explicit string."""
    defaults = load_defaults(DOCS_DIR)
    config = RegistrationConfig(
        event=EventConfig(
            name="Test",
            start_date=datetime.date(2026, 5, 29),
            end_date=datetime.date(2026, 5, 31),
            meeting_point="Bahnhof",
            fee=25.0,
            registration_deadline=datetime.date(2026, 5, 22),
        ),
    )
    result = resolve_text("greeting", "Mein eigener Text", config, defaults)
    assert result == "Mein eigener Text"


def test_text_resolver_named_preset() -> None:
    """Test text resolution with named preset key."""
    defaults = load_defaults(DOCS_DIR)
    config = RegistrationConfig(
        event=EventConfig(
            name="Test",
            start_date=datetime.date(2026, 5, 29),
            end_date=datetime.date(2026, 5, 31),
            meeting_point="Bahnhof",
            fee=25.0,
            registration_deadline=datetime.date(2026, 5, 22),
        ),
    )
    result = resolve_text("additional_info", "zelt_wanderung", config, defaults)
    assert "Zelt" in result


def test_page_optimizer_fits_default() -> None:
    """Test optimizer when content fits with defaults."""
    defaults = load_defaults(DOCS_DIR)
    config = RegistrationConfig(
        event=EventConfig(
            name="Kurz",
            start_date=datetime.date(2026, 5, 29),
            end_date=datetime.date(2026, 5, 31),
            meeting_point="Bahnhof",
            fee=10.0,
            registration_deadline=datetime.date(2026, 5, 22),
        ),
    )
    form_fields = resolve_form_fields("standard", defaults)

    def build_fn(params: LayoutParams) -> list:
        return build_all_flowables(
            config=config,
            resolved_texts={
                "subtitle": "",
                "greeting": "Hallo",
                "additional_info": "Info",
                "consent": "Consent",
                "signup_note": "",
                "packlist_note": "",
            },
            details=[("Wann", "Datum")],
            packlist=["Item"],
            form_fields=form_fields,
            logo_path=DOCS_DIR / "assets" / "logos" / "stamm_logo.png",
            params=params,
            target_pages=1,
        )

    params, flowables, log = optimize_layout(build_fn, target_pages=1)
    pages = trial_build_pages(flowables, params)
    assert pages == 1


def test_cli_missing_file() -> None:
    """Test CLI with missing YAML file."""
    import subprocess

    result = subprocess.run(
        ["uv", "run", "python", "documents/generate.py", "nonexistent.yaml"],
        capture_output=True,
        text=True,
        cwd=str(DOCS_DIR.parent),
    )
    assert result.returncode == 1
    assert "nicht gefunden" in result.stderr


def test_cli_basic_invocation() -> None:
    """Test CLI basic invocation."""
    import subprocess

    output_path = DOCS_DIR / "output" / "test_output.pdf"
    if output_path.exists():
        output_path.unlink()

    result = subprocess.run(
        [
            "uv",
            "run",
            "python",
            "documents/generate.py",
            "documents/templates/sippentippel_2026.yaml",
            "--output",
            str(output_path),
        ],
        capture_output=True,
        text=True,
        cwd=str(DOCS_DIR.parent),
    )
    assert result.returncode == 0
    assert output_path.exists()
    assert "PDF generiert" in result.stdout

    # Cleanup
    if output_path.exists():
        output_path.unlink()


if __name__ == "__main__":
    tests = [v for k, v in globals().items() if k.startswith("test_") and callable(v)]
    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            print(f"  PASS: {test.__name__}")
            passed += 1
        except Exception as e:
            print(f"  FAIL: {test.__name__}: {e}")
            failed += 1
    print(f"\n{passed} passed, {failed} failed, {passed + failed} total")
    sys.exit(1 if failed else 0)
