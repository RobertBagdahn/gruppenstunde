"""Command line: `python -m ruebert.data rebuild|nuke` (used by `make rebuild` and `make nuke`)."""

from __future__ import annotations

import argparse
import logging
import sys

from ruebert.data.build import SourceChangedError, nuke, rebuild
from ruebert.settings import ConfigurationError, get_settings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m ruebert.data", description=__doc__)
    parser.add_argument("command", choices=("rebuild", "nuke"))
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    settings = get_settings()

    if args.command == "nuke":
        removed = nuke(settings)
        sys.stdout.write("".join(f"gelöscht: {path}\n" for path in removed) or "nichts zu löschen\n")
        return 0

    try:
        result = rebuild(settings)
    except (ConfigurationError, SourceChangedError) as error:
        sys.stderr.write(f"Fehler: {error}\n")
        return 1

    report = result.report
    sys.stdout.write(
        f"Stand {settings.reference_date.isoformat()} aufgebaut in {result.duration_seconds} s\n"
        f"  Prüfsumme:    {result.checksum}\n"
        f"  Artikel:      {result.row_counts['articles']}, Wochen-Absätze: {result.row_counts['weekly_sales']}\n"
        f"  Fälle:        {result.row_counts['cases']}, Ausverkaufsphasen: {result.row_counts['stockout_phases']}\n"
        f"  Bestand weicht von v1 ab bei {len(report.stock_differences)} von {report.articles_compared} Artikeln\n"
        f"  v1-Ampel:     {report.v1_colour_counts}\n"
        f"  Ampel neu:    {report.colour_counts}\n"
        f"  Bericht:      {result.report_path}\n"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
