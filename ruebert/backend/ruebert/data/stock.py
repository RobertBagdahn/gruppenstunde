"""Stock as of the reference date with the v1 logic: "Bestand danach" of the last booking (Q-101 open)."""

from __future__ import annotations

from datetime import date

import duckdb


def compute_stock(con: duckdb.DuckDBPyConnection, reference_date: date) -> None:
    """One row per known article with bookings before the reference date.

    v1 took `DISTINCT ON (sku) ... ORDER BY booked_at DESC`, which picks an arbitrary row on equal
    timestamps; the booking id breaks such ties here so the rebuild stays deterministic.
    """
    con.execute(
        """
        INSERT INTO stock
        WITH ranked AS (
            SELECT m.sku, m.id, m.booked_at, m.stock_after, m.movement_type,
                   row_number() OVER (PARTITION BY m.sku ORDER BY m.booked_at DESC, m.id DESC) AS rank,
                   count(*) OVER (PARTITION BY m.sku, m.booked_at) AS same_time
            FROM v1.inventory_movements m
            JOIN articles a USING (sku)
            WHERE m.booked_at < CAST(? AS TIMESTAMP)
        )
        SELECT sku, greatest(stock_after, 0), stock_after, id, booked_at, movement_type, same_time
        FROM ranked
        WHERE rank = 1
        """,
        [reference_date],
    )
