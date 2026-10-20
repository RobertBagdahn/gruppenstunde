"""Tables of the derived store. Everything here is rebuilt from the source; nothing is edited in place."""

from __future__ import annotations

# Content tables in a fixed order; the checksum covers exactly these.
CONTENT_TABLES: tuple[str, ...] = (
    "articles",
    "weekly_sales",
    "set_components",
    "forecast_runs",
    "forecasts",
    "forecast_metrics",
    "backtest_forecasts",
    "stock",
    "cases",
    "stockout_phases",
    "sample_suppliers",
    "sample_supplier_articles",
    "sample_supplier_forecasts",
    "sample_channel_shares",
    "sample_events",
)

DDL = """
CREATE TABLE articles (
    sku VARCHAR PRIMARY KEY,
    title VARCHAR NOT NULL,
    category VARCHAR,
    subcategory VARCHAR,
    brand VARCHAR,
    is_set BOOLEAN NOT NULL,
    ignored BOOLEAN NOT NULL,
    is_special BOOLEAN NOT NULL,      -- runs outside the regular bulk order (Daniel: DGW158, DGWADV, DGWADV2)
    price DECIMAL(10, 2),
    created_at DATE,
    turnover_class INTEGER            -- Drehklasse = v1 sales decile 1–10, 0 = no sales
);

CREATE TABLE weekly_sales (
    sku VARCHAR NOT NULL,
    week_start DATE NOT NULL,         -- ISO Monday of the booking week (v1 labels of 2026 corrected, see master.py)
    v1_week_start DATE NOT NULL,      -- label as stored in v1, kept for lineage (DAT-19)
    quantity_direct DOUBLE NOT NULL,
    quantity_from_sets DOUBLE NOT NULL,
    quantity_total DOUBLE NOT NULL,
    PRIMARY KEY (sku, week_start)
);

CREATE TABLE set_components (
    set_sku VARCHAR NOT NULL,
    component_sku VARCHAR NOT NULL,
    quantity INTEGER NOT NULL,
    PRIMARY KEY (set_sku, component_sku)
);

CREATE TABLE forecast_runs (
    run_id INTEGER PRIMARY KEY,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    status VARCHAR,
    sku_count INTEGER,
    model_counts VARCHAR
);

CREATE TABLE forecasts (
    run_id INTEGER NOT NULL,
    sku VARCHAR NOT NULL,
    week_start DATE NOT NULL,         -- corrected like weekly_sales.week_start
    v1_week_start DATE NOT NULL,
    model VARCHAR NOT NULL,
    forecast_qty DOUBLE NOT NULL,
    lower_80 DOUBLE,
    upper_80 DOUBLE,
    is_best BOOLEAN NOT NULL,
    capped BOOLEAN NOT NULL,
    PRIMARY KEY (sku, week_start, model)
);

CREATE TABLE forecast_metrics (
    run_id INTEGER NOT NULL,
    sku VARCHAR NOT NULL,
    model VARCHAR NOT NULL,
    mae DOUBLE,
    mape DOUBLE,
    rmse DOUBLE,
    wape DOUBLE,
    bias DOUBLE,
    coverage DOUBLE,
    cv_samples INTEGER,
    is_fallback BOOLEAN,
    PRIMARY KEY (sku, model)
);

CREATE TABLE backtest_forecasts (
    sku VARCHAR NOT NULL,
    year INTEGER NOT NULL,
    week INTEGER NOT NULL,
    model VARCHAR NOT NULL,
    forecast_qty DOUBLE NOT NULL,
    PRIMARY KEY (sku, year, week, model)
);

CREATE TABLE stock (
    sku VARCHAR PRIMARY KEY,
    stock INTEGER NOT NULL,           -- v1 logic: "Bestand danach" of the last booking, negative clipped to 0
    stock_raw INTEGER NOT NULL,       -- unclipped value of that booking
    last_booking_id BIGINT NOT NULL,
    last_booked_at TIMESTAMP NOT NULL,
    last_movement_type VARCHAR,
    tied_bookings INTEGER NOT NULL    -- bookings sharing the last timestamp (v1 picked one at random)
);

CREATE TABLE cases (
    case_id VARCHAR PRIMARY KEY,      -- deterministic: <kind>:<sku>:<key>
    kind VARCHAR NOT NULL,            -- anomaly | bulk_shipping | fba_bookings | negative_stock | missing_forecast
    sku VARCHAR NOT NULL,
    week_start DATE,
    first_date DATE,
    last_date DATE,
    title VARCHAR NOT NULL,
    summary VARCHAR NOT NULL,
    question_id VARCHAR,
    actual_qty DOUBLE,
    expected_qty DOUBLE,
    booking_count INTEGER,
    options VARCHAR[] NOT NULL
);

CREATE TABLE stockout_phases (
    phase_id VARCHAR PRIMARY KEY,     -- <sku>:<start_date>
    sku VARCHAR NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,                    -- NULL: still sold out at the reference date
    duration_days INTEGER NOT NULL,
    shipped_during INTEGER NOT NULL   -- units shipped while "Bestand danach" was 0 (hint for Q-101)
);

CREATE TABLE sample_suppliers (
    supplier_id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    lead_time_weeks INTEGER NOT NULL,
    min_order_value_eur DECIMAL(10, 2) NOT NULL,
    is_sample BOOLEAN NOT NULL
);

CREATE TABLE sample_supplier_articles (
    sku VARCHAR PRIMARY KEY,
    supplier_id VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    category VARCHAR NOT NULL,
    purchase_price_eur DECIMAL(10, 2) NOT NULL,
    packaging_unit INTEGER NOT NULL,
    stock INTEGER NOT NULL,
    is_sample BOOLEAN NOT NULL
);

CREATE TABLE sample_supplier_forecasts (
    sku VARCHAR NOT NULL,
    week_start DATE NOT NULL,
    forecast_qty DOUBLE NOT NULL,
    is_sample BOOLEAN NOT NULL,
    PRIMARY KEY (sku, week_start)
);

CREATE TABLE sample_channel_shares (
    sku VARCHAR NOT NULL,
    channel VARCHAR NOT NULL,
    share DOUBLE NOT NULL,            -- 0..1, sums to 1 per article
    is_sample BOOLEAN NOT NULL,
    PRIMARY KEY (sku, channel)
);

CREATE TABLE sample_events (
    event_id VARCHAR PRIMARY KEY,
    event_date DATE NOT NULL,
    kind VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    sku VARCHAR,
    is_sample BOOLEAN NOT NULL
);

CREATE TABLE build_info (
    key VARCHAR PRIMARY KEY,
    value VARCHAR NOT NULL
);
"""
