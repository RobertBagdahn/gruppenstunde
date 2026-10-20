"""Cases for the case inbox: sales anomalies and data findings. Detected, never decided here (DAT-07, DAT-15)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Final

import duckdb

from ruebert.data.format import format_date, format_int, week_label
from ruebert.data.sql import insert_rows
from ruebert.domain.anomalies import detect as seasonal_detect
from ruebert.domain.anomalies import weekly_series

# v1 IQR method (legacy/src/analytics/anomalies.py: detect_weekly_anomalies), ported to SQL.
# Which detection feeds the inbox (Q-106). "seasonal": option B, chosen by Robert, pending review.
# "iqr": the v1 method, kept as the reference that finds nothing on the real data.
ANOMALY_METHOD: Final = "seasonal"
ANOMALY_FROM = date(2023, 1, 1)
ANOMALY_MIN_VALUES = 3
ANOMALY_IQR_FACTOR = 3.0
ANOMALY_MIN_DELTA = 50

# Q-024, rule R-020: shipping bookings from 100 units with a counter-booking within 24 h are technical.
BULK_MIN_UNITS = 100
BULK_COUNTER_WINDOW_HOURS = 24


@dataclass(frozen=True)
class Case:
    case_id: str
    kind: str
    sku: str
    week_start: date | None
    first_date: date | None
    last_date: date | None
    title: str
    summary: str
    question_id: str | None
    actual_qty: float | None
    expected_qty: float | None
    booking_count: int | None
    options: tuple[str, ...]


def detect_cases(con: duckdb.DuckDBPyConnection, reference_date: date) -> list[Case]:
    cases = [
        *_anomalies(con),
        *_bulk_shipping(con, reference_date),
        *_fba_bookings(con, reference_date),
        *_negative_stock(con, reference_date),
        *_missing_forecast(con),
    ]
    insert_rows(
        con,
        "INSERT INTO cases VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
            [
                c.case_id,
                c.kind,
                c.sku,
                c.week_start,
                c.first_date,
                c.last_date,
                c.title,
                c.summary,
                c.question_id,
                c.actual_qty,
                c.expected_qty,
                c.booking_count,
                list(c.options),
            ]
            for c in cases
        ],
    )
    return cases


def _anomalies(con: duckdb.DuckDBPyConnection) -> list[Case]:
    if ANOMALY_METHOD == "seasonal":
        return _anomalies_seasonal(con)
    return _anomalies_iqr(con)


def _anomalies_seasonal(con: duckdb.DuckDBPyConnection) -> list[Case]:
    series: dict[str, list[tuple[date, float]]] = {}
    for sku, week_start, qty in con.execute("SELECT sku, week_start, quantity_total FROM weekly_sales").fetchall():
        series.setdefault(sku, []).append((week_start, float(qty)))
    cases: list[Case] = []
    for sku in sorted(series):
        rows = sorted(series[sku])
        weeks = weekly_series(rows, rows[0][0], rows[-1][0])
        for found in seasonal_detect(weeks, ANOMALY_FROM):
            label = week_label(found.week_start)
            direction = "über" if found.direction == "high" else "unter"
            cases.append(
                Case(
                    case_id=f"anomaly:{sku}:{found.week_start.isoformat()}",
                    kind="anomaly",
                    sku=sku,
                    week_start=found.week_start,
                    first_date=found.week_start,
                    last_date=found.week_start,
                    title=f"Ausreißer {label}: {format_int(found.actual)} statt üblich {format_int(found.expected)}",
                    summary=(
                        f"Der Absatz in {label} liegt deutlich {direction} dem üblichen Wert derselben "
                        "Kalenderwoche in den Vorjahren und über seinen Nachbarwochen (Q-106, Verfahren B). "
                        "Für die Prognose verwenden oder ausschließen?"
                    ),
                    question_id="Q-106",
                    actual_qty=found.actual,
                    expected_qty=found.expected,
                    booking_count=None,
                    options=("verwenden", "ausschließen"),
                )
            )
    return cases


def _anomalies_iqr(con: duckdb.DuckDBPyConnection) -> list[Case]:
    rows = con.execute(
        """
        WITH base AS (
            SELECT sku, week_start, quantity_total AS qty, week(week_start) AS cal_week
            FROM weekly_sales
            WHERE week_start >= ?
        ),
        stats AS (
            SELECT sku, cal_week,
                   quantile_cont(qty, 0.25) AS q1,
                   quantile_cont(qty, 0.75) AS q3,
                   quantile_cont(qty, 0.5) AS med
            FROM base
            GROUP BY sku, cal_week
            HAVING count(*) >= ?
        )
        SELECT b.sku, b.week_start, b.qty, s.med
        FROM base b JOIN stats s USING (sku, cal_week)
        WHERE (b.qty < s.q1 - ? * (s.q3 - s.q1) OR b.qty > s.q3 + ? * (s.q3 - s.q1))
          AND abs(b.qty - s.med) >= ?
        ORDER BY b.sku, b.week_start
        """,
        [ANOMALY_FROM, ANOMALY_MIN_VALUES, ANOMALY_IQR_FACTOR, ANOMALY_IQR_FACTOR, ANOMALY_MIN_DELTA],
    ).fetchall()
    cases: list[Case] = []
    for sku, week_start, qty, median in rows:
        label = week_label(week_start)
        direction = "über" if qty > median else "unter"
        cases.append(
            Case(
                case_id=f"anomaly:{sku}:{week_start.isoformat()}",
                kind="anomaly",
                sku=sku,
                week_start=week_start,
                first_date=week_start,
                last_date=week_start,
                title=f"Ausreißer {label}: {format_int(qty)} statt üblich {format_int(median)}",
                summary=(
                    f"Der Absatz in {label} liegt deutlich {direction} dem üblichen Bereich derselben "
                    "Kalenderwoche in den Vorjahren (IQR-Methode aus v1). Für die Prognose verwenden oder "
                    "ausschließen?"
                ),
                question_id=None,
                actual_qty=float(qty),
                expected_qty=float(median),
                booking_count=None,
                options=("verwenden", "ausschließen"),
            )
        )
    return cases


def _bulk_shipping(con: duckdb.DuckDBPyConnection, reference_date: date) -> list[Case]:
    rows = con.execute(
        f"""
        WITH big AS (
            SELECT m.id, m.sku, m.quantity, m.booked_at
            FROM v1.inventory_movements m JOIN articles a USING (sku)
            WHERE m.movement_type = 'Versandprozess WMS'
              AND -m.quantity >= ?
              AND m.booked_at < CAST(? AS TIMESTAMP)
        ),
        unmatched AS (
            SELECT * FROM big b
            WHERE NOT EXISTS (
                SELECT 1 FROM v1.inventory_movements c
                WHERE c.sku = b.sku AND c.quantity = -b.quantity
                  AND c.booked_at BETWEEN b.booked_at - INTERVAL {BULK_COUNTER_WINDOW_HOURS} HOUR
                                      AND b.booked_at + INTERVAL {BULK_COUNTER_WINDOW_HOURS} HOUR
            )
        )
        SELECT sku, CAST(date_trunc('week', booked_at) AS DATE) AS week_start,
               count(*), sum(-quantity), max(-quantity),
               CAST(min(booked_at) AS DATE), CAST(max(booked_at) AS DATE)
        FROM unmatched
        GROUP BY ALL
        ORDER BY sku, week_start
        """,
        [BULK_MIN_UNITS, reference_date],
    ).fetchall()
    cases: list[Case] = []
    for sku, week_start, count, total, largest, first, last in rows:
        label = week_label(week_start)
        bookings = "Versandbuchung" if count == 1 else "Versandbuchungen"
        cases.append(
            Case(
                case_id=f"bulk_shipping:{sku}:{week_start.isoformat()}",
                kind="bulk_shipping",
                sku=sku,
                week_start=week_start,
                first_date=first,
                last_date=last,
                title=f"Sammelbuchung ohne Gegenbuchung {label}: {format_int(total)} Tüten",
                summary=(
                    f"{format_int(count)} {bookings} ab {format_int(BULK_MIN_UNITS)} Tüten "
                    f"(größte {format_int(largest)}) ohne Gegenbuchung innerhalb von 24 Stunden. "
                    "Endkunden-Nachfrage oder technische Buchung? (Regel R-020)"
                ),
                question_id="Q-024",
                actual_qty=float(total),
                expected_qty=None,
                booking_count=int(count),
                options=("Nachfrage", "keine Nachfrage"),
            )
        )
    return cases


def _fba_bookings(con: duckdb.DuckDBPyConnection, reference_date: date) -> list[Case]:
    rows = con.execute(
        """
        SELECT m.sku, count(*),
               sum(m.quantity) FILTER (WHERE m.quantity > 0),
               -sum(m.quantity) FILTER (WHERE m.quantity < 0),
               CAST(min(m.booked_at) AS DATE), CAST(max(m.booked_at) AS DATE)
        FROM v1.inventory_movements m JOIN articles a USING (sku)
        WHERE m.movement_type = 'FBA Bestandsänderung' AND m.booked_at < CAST(? AS TIMESTAMP)
        GROUP BY m.sku
        ORDER BY m.sku
        """,
        [reference_date],
    ).fetchall()
    cases: list[Case] = []
    for sku, count, added, removed, first, last in rows:
        years = f"{first.year}" if first.year == last.year else f"{first.year}–{last.year}"
        cases.append(
            Case(
                case_id=f"fba_bookings:{sku}:all",
                kind="fba_bookings",
                sku=sku,
                week_start=None,
                first_date=first,
                last_date=last,
                title=f"FBA-Buchungen {years}: {format_int(count)} Buchungen",
                summary=(
                    f"Bewegungsart „FBA Bestandsänderung“ vom {format_date(first)} bis {format_date(last)}: "
                    f"{format_int(added or 0)} Tüten zu, {format_int(removed or 0)} ab. Fehlen in diesem Zeitraum "
                    "Amazon-FBA-Verkäufe in den eigenen Daten?"
                ),
                question_id="Q-026",
                actual_qty=None,
                expected_qty=None,
                booking_count=int(count),
                options=("Verkäufe fehlen", "keine Verkäufe"),
            )
        )
    return cases


def _negative_stock(con: duckdb.DuckDBPyConnection, reference_date: date) -> list[Case]:
    rows = con.execute(
        """
        SELECT m.sku, year(m.booked_at) AS year, count(*), min(m.stock_after),
               CAST(min(m.booked_at) AS DATE), CAST(max(m.booked_at) AS DATE)
        FROM v1.inventory_movements m JOIN articles a USING (sku)
        WHERE m.stock_after < 0 AND m.booked_at < CAST(? AS TIMESTAMP)
        GROUP BY ALL
        ORDER BY m.sku, year
        """,
        [reference_date],
    ).fetchall()
    cases: list[Case] = []
    for sku, year, count, lowest, first, last in rows:
        bookings = "Buchung" if count == 1 else "Buchungen"
        cases.append(
            Case(
                case_id=f"negative_stock:{sku}:{year}",
                kind="negative_stock",
                sku=sku,
                week_start=None,
                first_date=first,
                last_date=last,
                title=f"Negativer Bestand {year}: bis {format_int(lowest)} Tüten",
                summary=(
                    f"{format_int(count)} {bookings} mit „Bestand danach“ unter 0 zwischen {format_date(first)} "
                    f"und {format_date(last)}. Annahme bis zur Antwort: verspätet gebuchter Wareneingang, "
                    "kein Ausverkauf."
                ),
                question_id="Q-104",
                actual_qty=float(lowest),
                expected_qty=None,
                booking_count=int(count),
                options=("kein Ausverkauf", "Ausverkauf"),
            )
        )
    return cases


def _missing_forecast(con: duckdb.DuckDBPyConnection) -> list[Case]:
    rows = con.execute(
        """
        SELECT a.sku FROM articles a
        WHERE NOT a.is_set AND NOT a.ignored AND NOT a.is_special
          AND a.sku NOT IN (SELECT sku FROM forecasts WHERE is_best)
        ORDER BY a.sku
        """
    ).fetchall()
    return [
        Case(
            case_id=f"missing_forecast:{sku}:run25",
            kind="missing_forecast",
            sku=sku,
            week_start=None,
            first_date=None,
            last_date=None,
            title="Keine Prognose in Lauf 25",
            summary=(
                "v1 hat für diesen aktiven Artikel keine Prognose gewählt. Ohne Prognose gibt es keine Ampel "
                "und keinen Bestellvorschlag."
            ),
            question_id=None,
            actual_qty=None,
            expected_qty=None,
            booking_count=None,
            options=("selbst planen", "nicht mehr führen"),
        )
        for (sku,) in rows
    ]
