"""Stock-out phases from bookings: days whose last "Bestand danach" is 0 (hypothesis, Q-101)."""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import date
from itertools import groupby

import duckdb

from ruebert.data.sql import insert_rows


@dataclass(frozen=True)
class Phase:
    sku: str
    start_date: date
    end_date: date | None  # None: still sold out at the reference date
    duration_days: int


def find_phases(sku: str, end_of_day_stock: Sequence[tuple[date, int]], reference_date: date) -> list[Phase]:
    """Group days into stock-out phases.

    `end_of_day_stock` holds, per booking day in ascending order, the "Bestand danach" of the day's last
    booking. Days without bookings keep the previous state. A phase starts on a day ending at exactly 0
    and ends on the first later day ending above 0. Negative stock does not count as sold out and ends a
    phase (assumption of Q-104: late goods receipt, the goods were there).
    """
    phases: list[Phase] = []
    start: date | None = None
    for day, stock in end_of_day_stock:
        if day >= reference_date:
            break
        if stock == 0 and start is None:
            start = day
        elif stock != 0 and start is not None:
            phases.append(Phase(sku, start, day, (day - start).days))
            start = None
    if start is not None:
        phases.append(Phase(sku, start, None, (reference_date - start).days))
    return phases


def detect_stockouts(con: duckdb.DuckDBPyConnection, reference_date: date) -> list[Phase]:
    rows: Iterable[tuple[str, date, int]] = con.execute(
        """
        SELECT sku, day, stock_after FROM (
            SELECT m.sku, CAST(m.booked_at AS DATE) AS day, m.stock_after,
                   row_number() OVER (
                       PARTITION BY m.sku, CAST(m.booked_at AS DATE) ORDER BY m.booked_at DESC, m.id DESC
                   ) AS rank
            FROM v1.inventory_movements m JOIN articles a USING (sku)
            WHERE m.booked_at < CAST(? AS TIMESTAMP)
        )
        WHERE rank = 1
        ORDER BY sku, day
        """,
        [reference_date],
    ).fetchall()

    phases: list[Phase] = []
    for sku, days in groupby(rows, key=lambda row: row[0]):
        phases.extend(find_phases(sku, [(day, stock) for _, day, stock in days], reference_date))

    insert_rows(
        con,
        "INSERT INTO stockout_phases VALUES (?, ?, ?, ?, ?, 0)",
        [[f"{p.sku}:{p.start_date.isoformat()}", p.sku, p.start_date, p.end_date, p.duration_days] for p in phases],
    )
    # Units shipped while the phase lasted show how far "Bestand danach" is from a running balance.
    con.execute(
        """
        UPDATE stockout_phases AS p SET shipped_during = s.shipped
        FROM (
            SELECT p.phase_id, coalesce(sum(-m.quantity), 0) AS shipped
            FROM stockout_phases p
            JOIN v1.inventory_movements m
              ON m.sku = p.sku
             AND m.movement_type = 'Versandprozess WMS'
             AND CAST(m.booked_at AS DATE) > p.start_date
             AND CAST(m.booked_at AS DATE) < coalesce(p.end_date, CAST(? AS DATE))
            GROUP BY p.phase_id
        ) AS s
        WHERE p.phase_id = s.phase_id
        """,
        [reference_date],
    )
    return phases
