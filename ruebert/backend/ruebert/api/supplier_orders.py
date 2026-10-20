"""Third-party brand (Fremdmarke) on sample data: suppliers, drill-down, top-up, postpone (supplier-order-preview)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ruebert.api.deps import EntriesDep, SettingsDep, StoreDep
from ruebert.journal import current_entries, write_entry

router = APIRouter(prefix="/supplier-orders", tags=["supplier-orders"])

MIN_ORDER_EUR = Decimal("100.00")
HORIZON_WEEKS = 4
SAMPLE_BANNER = "Beispieldaten: Lieferanten, Artikel, Einkaufspreise und Mengen sind frei erfunden."


class SupplierRow(BaseModel):
    supplier_id: str
    name: str
    article_count: int
    value_eur: float
    minimum_eur: float
    status: Literal["bereit", "wartet – bündeln"]
    is_sample: bool = True


class SupplierArticle(BaseModel):
    sku: str
    title: str
    stock: int
    forecast_4_weeks: float
    packaging_unit: int
    proposed_units: int
    purchase_price_eur: float
    value_eur: float


class TopUp(BaseModel):
    sku: str
    title: str
    extra_units: int
    adds_eur: float


class SupplierDetail(SupplierRow):
    banner: str
    articles: list[SupplierArticle]
    gap_eur: float
    top_up: list[TopUp]
    decision: str | None


class DecisionIn(BaseModel):
    choice: Literal["freigeben", "zurückstellen"]
    reason: str | None = Field(default=None, max_length=500)


def _proposal(store: StoreDep, supplier_id: str, reference: date) -> list[SupplierArticle]:
    rows = store.execute(
        """
        SELECT a.sku, a.title, a.stock, a.packaging_unit, a.purchase_price_eur,
               COALESCE((SELECT sum(f.forecast_qty) FROM sample_supplier_forecasts f
                         WHERE f.sku = a.sku AND f.week_start >= ?
                           AND f.week_start < ? + INTERVAL 28 DAY), 0) AS forecast
        FROM sample_supplier_articles a WHERE a.supplier_id = ? ORDER BY a.sku
        """,
        [reference, reference, supplier_id],
    ).fetchall()
    articles: list[SupplierArticle] = []
    for sku, title, stock, unit, price, forecast in rows:
        need = max(float(forecast) - int(stock), 0.0)
        units = -(-int(need) // int(unit)) if need > 0 else 0  # packaging units, rounded up
        value = Decimal(price) * units * int(unit)
        articles.append(
            SupplierArticle(
                sku=sku,
                title=title,
                stock=int(stock),
                forecast_4_weeks=round(float(forecast), 1),
                packaging_unit=int(unit),
                proposed_units=units,
                purchase_price_eur=float(price),
                value_eur=float(value),
            )
        )
    return articles


def _value(articles: list[SupplierArticle]) -> Decimal:
    return sum((Decimal(str(a.value_eur)) for a in articles), Decimal("0"))


def _top_up(store: StoreDep, articles: list[SupplierArticle], gap: Decimal) -> list[TopUp]:
    """Articles whose extra packaging units close the gap to the minimum order value."""
    options: list[TopUp] = []
    for a in articles:
        if a.proposed_units == 0 and a.purchase_price_eur <= 0:
            continue
        step = Decimal(str(a.purchase_price_eur)) * a.packaging_unit
        if step > 0:
            options.append(TopUp(sku=a.sku, title=a.title, extra_units=1, adds_eur=float(step)))
    options.sort(key=lambda t: (t.adds_eur, t.sku))
    chosen: list[TopUp] = []
    remaining = gap
    for option in options:
        if remaining <= 0:
            break
        chosen.append(option)
        remaining -= Decimal(str(option.adds_eur))
    return chosen


def _supplier_rows(store: StoreDep, reference: date) -> list[tuple[str, str, list[SupplierArticle]]]:
    suppliers = store.execute("SELECT supplier_id, name FROM sample_suppliers ORDER BY supplier_id").fetchall()
    return [(sid, name, _proposal(store, sid, reference)) for sid, name in suppliers]


def _decision(entries: EntriesDep, supplier_id: str) -> str | None:
    entry = current_entries([e for e in entries if e.type == "order"]).get(f"supplier:{supplier_id}")
    return entry.choice if entry else None


@router.get("", summary="Fremdmarke: Lieferanten mit Vorschlag (Beispieldaten)")
def list_suppliers(store: StoreDep, settings: SettingsDep) -> list[SupplierRow]:
    out: list[SupplierRow] = []
    for sid, name, articles in _supplier_rows(store, settings.reference_date):
        value = _value(articles)
        out.append(
            SupplierRow(
                supplier_id=sid,
                name=name,
                article_count=len([a for a in articles if a.proposed_units > 0]),
                value_eur=float(value),
                minimum_eur=float(MIN_ORDER_EUR),
                status="bereit" if value >= MIN_ORDER_EUR else "wartet – bündeln",
            )
        )
    return out


@router.get("/{supplier_id}", summary="Lieferant mit Artikeln und Aufstockungs-Vorschlag")
def get_supplier(supplier_id: str, store: StoreDep, entries: EntriesDep, settings: SettingsDep) -> SupplierDetail:
    match = next((r for r in _supplier_rows(store, settings.reference_date) if r[0] == supplier_id), None)
    if match is None:
        raise HTTPException(404, f"Lieferant {supplier_id} gibt es nicht.")
    sid, name, articles = match
    value = _value(articles)
    gap = max(MIN_ORDER_EUR - value, Decimal("0"))
    return SupplierDetail(
        supplier_id=sid,
        name=name,
        article_count=len([a for a in articles if a.proposed_units > 0]),
        value_eur=float(value),
        minimum_eur=float(MIN_ORDER_EUR),
        status="bereit" if value >= MIN_ORDER_EUR else "wartet – bündeln",
        banner=SAMPLE_BANNER,
        articles=[a for a in articles if a.proposed_units > 0],
        gap_eur=float(gap),
        top_up=_top_up(store, articles, gap) if gap > 0 else [],
        decision=_decision(entries, sid),
    )


@router.post(
    "/{supplier_id}/decision", summary="Lieferantenvorschlag freigeben oder zurückstellen (Journal, Beispieldaten)"
)
def decide_supplier(
    supplier_id: str, body: DecisionIn, store: StoreDep, entries: EntriesDep, settings: SettingsDep
) -> SupplierDetail:
    if store.execute("SELECT 1 FROM sample_suppliers WHERE supplier_id = ?", [supplier_id]).fetchone() is None:
        raise HTTPException(404, f"Lieferant {supplier_id} gibt es nicht.")
    previous = current_entries([e for e in entries if e.type == "order"]).get(f"supplier:{supplier_id}")
    write_entry(
        settings.journal_dir,
        type="order",
        subject=f"supplier:{supplier_id}",
        choice=body.choice,
        reason=body.reason,
        author=settings.journal_author,
        supersedes=previous.id if previous else None,
        is_sample=True,
    )
    from ruebert.journal import read_entries

    return get_supplier(supplier_id, store, read_entries(settings.journal_dir), settings)
