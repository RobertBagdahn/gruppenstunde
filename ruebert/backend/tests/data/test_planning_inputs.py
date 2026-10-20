"""Planning inputs from the derived store; derivation end value equals the planner quantity for every article."""

from __future__ import annotations

from datetime import date

from ruebert.data.build import rebuild
from ruebert.data.planning_inputs import load_plan_inputs
from ruebert.domain.ordering import target_week_of
from ruebert.domain.planner import build_order_plan
from ruebert.settings import Settings

from ..v1_fixture import V1Builder
from .test_rebuild import small_source


def test_every_article_of_the_snapshot_ends_at_the_planner_quantity(settings: Settings, v1: V1Builder) -> None:
    small_source(v1)
    rebuild(settings)
    inputs = load_plan_inputs(settings.derived_db_path)
    assert [i.sku for i in inputs] == ["DGW001", "DGW002"]
    assert inputs[0].stock == 250
    plan = build_order_plan(inputs, settings.reference_date, target_week_of(2026, 30))
    assert {r.sku for r in plan.rows} == {"DGW001", "DGW002"}
    assert all(r.derivation.result == r.quantity for r in plan.rows)
    assert plan.total % 60_000 == 0
    assert plan.target_week == date(2026, 7, 20)
