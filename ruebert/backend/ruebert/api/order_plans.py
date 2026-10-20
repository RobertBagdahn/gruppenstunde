"""Own-brand order planner: compute with parameters, change quantities, approve into the journal."""

from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ruebert.api.deps import EntriesDep, ParametersDep, SettingsDep, StoreDep
from ruebert.api.errors import FieldValidationError
from ruebert.api.schemas import DerivationOut, derivation_out
from ruebert.data.planning import World, load_world
from ruebert.domain import parameters
from ruebert.domain.derivation import DerivationStep, format_int
from ruebert.domain.ordering import is_allowed_quantity
from ruebert.journal import current_entries, read_entries, write_entry

router = APIRouter(prefix="/order-plans", tags=["order-plans"])


class PlanRowOut(BaseModel):
    sku: str
    title: str
    stock: float
    net_demand: float
    suggested_quantity: int
    quantity: int
    deviation: int  # quantity − suggestion (manual change)
    tranche_adjustment: int
    adjustment_reason: str | None
    warnings: list[str]
    derivation: DerivationOut
    changed_by: str | None


class SpecialOut(BaseModel):
    sku: str
    title: str
    stock: float


class ApprovalOut(BaseModel):
    approved_at: str
    author: str
    tranche: int
    total: int


class PlanOut(BaseModel):
    target_year: int
    target_week: int
    tranche: int
    tranche_options: list[int]
    total: int
    suggested_total: int
    unresolved: int
    rows: list[PlanRowOut]
    special: list[SpecialOut]
    approval: ApprovalOut | None


class QuantityIn(BaseModel):
    quantity: int


class ApproveIn(BaseModel):
    target_year: int | None = None
    target_week: int | None = None
    tranche: int | None = None


TargetYear = Annotated[int | None, Query(ge=2026, le=2035, description="Jahr der Zielwoche")]
TargetWeek = Annotated[int | None, Query(ge=1, le=53, description="ISO-Kalenderwoche der Zielwoche")]
TrancheQ = Annotated[int | None, Query(ge=60_000, description="Gewählte Stufe (Vielfaches von 60.000)")]


def _target(values: dict[str, parameters.Value], year: int | None, week: int | None) -> date:
    merged = dict(values)
    if year is not None:
        merged["target_year"] = year
    if week is not None:
        merged["target_week"] = week
    return parameters.target_week(merged)


def _check_tranche(tranche: int | None, values: dict[str, parameters.Value]) -> None:
    size = int(values["tranche_size"])
    if tranche is not None and tranche % size != 0:
        raise FieldValidationError("tranche", f"Die Stufe muss ein Vielfaches von {format_int(size)} sein.")


def _approval_subject(target: date) -> str:
    year, week, _ = target.isocalendar()
    return f"plan:{year}-W{week:02d}"


def build_plan_out(world: World, entries: EntriesDep, target: date) -> PlanOut:
    plan = world.plan
    rows: list[PlanRowOut] = []
    for row in plan.rows:
        article = world.articles[row.sku]
        override = world.quantity_overrides.get(row.sku)
        quantity = world.final_quantity(row.sku) or 0
        derivation = row.derivation
        if override is not None:
            derivation = derivation.extended(
                DerivationStep(
                    "manual",
                    "Manuelle Änderung",
                    quantity - row.quantity,
                    float(quantity),
                    f"von {override.author}",
                )
            )
        adjustment = next((a for a in [row.adjustment] if a), 0)
        rows.append(
            PlanRowOut(
                sku=row.sku,
                title=article.title,
                stock=article.stock,
                net_demand=next((s.value for s in row.derivation.steps if s.key == "net"), 0.0),
                suggested_quantity=row.quantity,
                quantity=quantity,
                deviation=quantity - row.quantity,
                tranche_adjustment=adjustment,
                adjustment_reason=(row.derivation.steps[-1].note if adjustment else None),
                warnings=list(row.warnings),
                derivation=derivation_out(derivation),
                changed_by=override.author if override else None,
            )
        )
    approval_entry = current_entries([e for e in entries if e.type == "order"]).get(_approval_subject(target))
    year, week, _ = target.isocalendar()
    return PlanOut(
        target_year=year,
        target_week=week,
        tranche=plan.tranche,
        tranche_options=list(plan.tranche_options),
        total=sum(r.quantity for r in rows),
        suggested_total=sum(r.suggested_quantity for r in rows),
        unresolved=plan.unresolved,
        rows=rows,
        special=[SpecialOut(sku=s.sku, title=world.articles[s.sku].title, stock=s.stock) for s in plan.special],
        approval=ApprovalOut(
            approved_at=approval_entry.created_at.isoformat(),
            author=approval_entry.author,
            tranche=int((approval_entry.details or {}).get("tranche", 0)),
            total=int(approval_entry.value) if isinstance(approval_entry.value, int | float) else 0,
        )
        if approval_entry and approval_entry.choice == "freigeben"
        else None,
    )


@router.get("", summary="Bestellplan berechnen")
def get_plan(
    store: StoreDep,
    entries: EntriesDep,
    values: ParametersDep,
    settings: SettingsDep,
    target_year: TargetYear = None,
    target_week: TargetWeek = None,
    tranche: TrancheQ = None,
) -> PlanOut:
    _check_tranche(tranche, values)
    target = _target(values, target_year, target_week)
    if (target - settings.reference_date).days < 7:
        raise FieldValidationError("target_week", "Die Zielwoche muss nach dem Stichtag liegen.")
    world = load_world(store, entries, values, settings.reference_date, tranche, target)
    return build_plan_out(world, entries, target)


@router.put("/quantities/{sku}", summary="Menge ändern (schreibt ins Journal)")
def set_quantity(
    sku: str, body: QuantityIn, store: StoreDep, entries: EntriesDep, values: ParametersDep, settings: SettingsDep
) -> PlanRowOut:
    world = load_world(store, entries, values, settings.reference_date)
    row = next((r for r in world.plan.rows if r.sku == sku), None)
    if row is None:
        raise HTTPException(
            404, f"Artikel {sku} wird nicht im Bestellplan geplant (Set, Sonderartikel oder ohne Prognose)."
        )
    if not _allowed(body.quantity, values):
        step = int(values["order_step"])
        raise FieldValidationError(
            "quantity", f"Erlaubt sind 0 oder Vielfache von {format_int(step)} ab {format_int(step)}."
        )
    previous = current_entries([e for e in entries if e.type == "quantity"]).get(f"quantity:{sku}")
    write_entry(
        settings.journal_dir,
        type="quantity",
        subject=f"quantity:{sku}",
        choice="ändern",
        value=body.quantity,
        reason=f"Vorschlag war {format_int(row.quantity)}",
        author=settings.journal_author,
        supersedes=previous.id if previous else None,
    )
    fresh = read_entries(settings.journal_dir)
    target = parameters.target_week(values)
    plan = build_plan_out(load_world(store, fresh, values, settings.reference_date), fresh, target)
    return next(r for r in plan.rows if r.sku == sku)


def _allowed(quantity: int, values: dict[str, parameters.Value]) -> bool:
    return is_allowed_quantity(quantity, parameters.order_settings(values))


@router.post("/approve", summary="Plan freigeben (schreibt ins Journal)")
def approve(
    body: ApproveIn, store: StoreDep, entries: EntriesDep, values: ParametersDep, settings: SettingsDep
) -> PlanOut:
    _check_tranche(body.tranche, values)
    target = _target(values, body.target_year, body.target_week)
    world = load_world(store, entries, values, settings.reference_date, body.tranche, target)
    plan = build_plan_out(world, entries, target)
    subject = _approval_subject(target)
    previous = current_entries([e for e in entries if e.type == "order"]).get(subject)
    write_entry(
        settings.journal_dir,
        type="order",
        subject=subject,
        choice="freigeben",
        value=plan.total,
        author=settings.journal_author,
        supersedes=previous.id if previous else None,
        details={
            "target_week": f"{plan.target_year}-W{plan.target_week:02d}",
            "tranche": plan.tranche,
            "quantities": {r.sku: r.quantity for r in plan.rows if r.quantity},
            "deviations": {r.sku: r.deviation for r in plan.rows if r.deviation},
        },
    )
    fresh = read_entries(settings.journal_dir)
    return build_plan_out(
        load_world(store, fresh, values, settings.reference_date, body.tranche, target), fresh, target
    )
