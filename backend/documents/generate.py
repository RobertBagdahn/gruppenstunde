#!/usr/bin/env python3
"""CLI entry point: generate registration PDFs from YAML config."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Ensure the documents directory is on the path
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from page_optimizer import optimize_layout
from pdf_builder import (
    LayoutParams,
    build_all_flowables,
    generate_pdf,
)
from schema import (
    load_config,
    load_defaults,
    resolve_form_fields,
    resolve_packlist,
)
from text_resolver import (
    format_date_range,
    generate_details,
    resolve_text,
)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generiert Anmelde-PDFs für Pfadfinder-Veranstaltungen aus YAML-Konfiguration.",
    )
    parser.add_argument(
        "yaml_path",
        type=Path,
        help="Pfad zur YAML-Konfigurationsdatei",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=None,
        help="Ausgabepfad für das PDF (Standard: output/<yaml_name>.pdf)",
    )
    args = parser.parse_args()

    base_dir = SCRIPT_DIR
    yaml_path = args.yaml_path
    if not yaml_path.is_absolute():
        yaml_path = Path.cwd() / yaml_path

    # Check file exists
    if not yaml_path.exists():
        print(f"Datei nicht gefunden: {yaml_path}", file=sys.stderr)
        sys.exit(1)

    # Load and validate config
    try:
        config = load_config(yaml_path, base_dir)
    except (FileNotFoundError, ValueError) as e:
        print(f"Fehler: {e}", file=sys.stderr)
        sys.exit(1)

    # Load defaults
    defaults = load_defaults(base_dir)

    # Resolve presets
    try:
        packlist = resolve_packlist(config.packlist, config.packlist_extra, defaults)
        form_fields = resolve_form_fields(config.form_fields, defaults)
    except ValueError as e:
        print(f"Fehler: {e}", file=sys.stderr)
        sys.exit(1)

    # Resolve texts
    try:
        resolved_texts = {
            "subtitle": format_date_range(config.event),
            "greeting": resolve_text("greeting", config.texts.greeting, config, defaults),
            "additional_info": resolve_text("additional_info", config.texts.additional_info, config, defaults),
            "consent": resolve_text("consent", config.consent, config, defaults),
            "signup_note": config.signup_note,
            "packlist_note": "Alles zusammen in einem Rucksack.",
        }
    except RuntimeError as e:
        print(f"Fehler: {e}", file=sys.stderr)
        sys.exit(1)

    details = generate_details(config.event)
    logo_path = base_dir / config.group.logo
    target_pages = config.layout.pages

    # Build flowables with optimizer
    def build_fn(params: LayoutParams) -> list:
        return build_all_flowables(
            config=config,
            resolved_texts=resolved_texts,
            details=details,
            packlist=packlist,
            form_fields=form_fields,
            logo_path=logo_path,
            params=params,
            target_pages=target_pages,
        )

    try:
        params, flowables, opt_log = optimize_layout(
            build_flowables_fn=build_fn,
            target_pages=target_pages,
        )
    except RuntimeError as e:
        print(f"✗ {e}", file=sys.stderr)
        sys.exit(1)

    # Determine output path
    output_path = args.output
    if output_path is None:
        output_dir = base_dir / "output"
        output_dir.mkdir(exist_ok=True)
        output_path = output_dir / f"{yaml_path.stem}.pdf"

    # Generate PDF
    num_pages = generate_pdf(flowables, output_path, params)

    # Output result
    page_label = "Seite" if num_pages == 1 else "Seiten"
    print(f"✓ PDF generiert: {output_path} ({num_pages} {page_label})")
    if opt_log:
        print(f"  Optimiert: {', '.join(opt_log)}")


if __name__ == "__main__":
    main()
