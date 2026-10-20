"""Specs `own-brand-order-planning`: net demand, grid, rounding, 60k tranche, scope, derivation."""

from __future__ import annotations

from datetime import date, timedelta

import pytest
from ruebert.domain.allocation import AllocationItem, allocate, nearest_tranche, neighbouring_tranches
from ruebert.domain.ordering import (
    OrderSettings,
    is_allowed_quantity,
    plan_article,
    round_on_started_step,
    target_week_of,
)
from ruebert.domain.planner import PlanInput, build_order_plan
from ruebert.domain.traffic_light import ForecastWeek

REF = date(2026, 5, 18)
TARGET = target_week_of(2027, 39)


def flat(per_week: float, weeks: int = 156) -> list[ForecastWeek]:
    return [ForecastWeek(REF + timedelta(weeks=i), per_week) for i in range(weeks)]


class TestRounding:
    @pytest.mark.parametrize(
        ("net", "expected"),
        [(18_000, 15_000), (20_207, 20_000), (24_100, 25_000), (0, 0), (-5, 0), (100, 5_000), (5_000, 5_000)],
    )
    def test_rounding_on_the_started_step(self, net: float, expected: int) -> None:
        assert round_on_started_step(net) == expected

    def test_threshold_is_configurable(self) -> None:
        assert round_on_started_step(22_600, OrderSettings(rounding_threshold=0.5)) == 25_000
        assert round_on_started_step(22_600, OrderSettings(rounding_threshold=0.8)) == 20_000

    def test_18000_is_never_proposed_as_is(self) -> None:
        assert round_on_started_step(18_000) not in (6_000, 18_000)

    def test_allowed_quantities(self) -> None:
        assert all(is_allowed_quantity(q) for q in (0, 5_000, 10_000, 125_000))
        assert not any(is_allowed_quantity(q) for q in (1, 4_999, 6_000, 18_000))


class TestNetDemand:
    def test_demand_plus_minimum_stock_minus_stock(self) -> None:
        # 5 weeks up to and including the target week
        forecast = [ForecastWeek(REF + timedelta(weeks=i), 1_000) for i in range(5)]
        plan = plan_article("A", 500, forecast, REF, REF + timedelta(weeks=4))
        assert plan.net_demand == 5_000 + 30 - 500
        assert [s.key for s in plan.derivation.steps][:4] == ["demand", "min_stock", "stock", "net"]
        assert plan.derivation.steps[3].value == plan.net_demand

    def test_stock_covers_demand(self) -> None:
        plan = plan_article("A", 1_000_000, flat(100), REF, TARGET)
        assert plan.net_demand == 0
        assert plan.rounded_quantity == 0

    def test_forecast_after_the_target_week_is_ignored(self) -> None:
        assert plan_article("A", 0, flat(100), REF, REF).net_demand == 100 + 30

    def test_set_demand_is_not_added_a_second_time(self) -> None:
        components = plan_article("COMP", 0, flat(100), REF, REF + timedelta(weeks=9))
        assert components.net_demand == 1_000 + 30  # forecast already contains the set share

    def test_warning_when_stock_does_not_last_the_lead_time(self) -> None:
        plan = plan_article("A", 500, flat(100), REF, TARGET)
        assert any("BEM-06" in w for w in plan.warnings)

    def test_overstock_warning(self) -> None:
        plan = plan_article("A", 0, flat(1), REF, TARGET)  # 130 weeks = 130 units; one order step is 5,000
        assert any("BEM-10" in w for w in plan.warnings)


def item(sku: str, rounded: int, net: float, lead: float = 0, weekly: float = 10) -> AllocationItem:
    return AllocationItem(sku, net, rounded, lead, weekly)


class TestTranche:
    def test_nearest_tranche_and_neighbours(self) -> None:
        assert nearest_tranche(113_000) == 120_000
        assert nearest_tranche(100_000) == 120_000  # 100,000 is 40,000 from 60,000, 20,000 from 120,000
        assert nearest_tranche(1_000) == 60_000
        assert neighbouring_tranches(120_000) == [60_000, 120_000, 180_000]
        assert neighbouring_tranches(60_000) == [60_000, 120_000]

    def test_adds_steps_to_highest_marginal_benefit(self) -> None:
        items = [item("A", 55_000, 70_000), item("B", 58_000 - 3_000, 56_000), item("C", 3_000 * 0 + 0, 4_000)]
        result = allocate(items, 120_000)
        assert result.total == 120_000
        assert result.unresolved == 0
        assert result.quantities["A"] >= 55_000 and result.quantities["A"] - 55_000 <= 15_000  # A has most open demand
        assert all(q % 5_000 == 0 for q in result.quantities.values())

    def test_total_113000_to_120000(self) -> None:
        items = [item("A", 60_000, 65_000), item("B", 53_000 + 2_000, 61_000)]
        assert sum(i.rounded_quantity for i in items) == 115_000
        result = allocate(items, 120_000)
        assert result.total == 120_000
        assert {a.sku for a in result.adjustments} <= {"A", "B"}

    def test_every_adjustment_is_explained(self) -> None:
        result = allocate([item("A", 55_000, 70_000), item("B", 60_000, 60_000)], 120_000)
        assert [a.reason for a in result.adjustments] == ["+5.000 durch Tranche (höchster Grenznutzen)"]
        assert result.adjustments[0].sku == "A"

    def test_cutting_takes_the_smallest_loss_first(self) -> None:
        # B is over-ordered relative to its net demand, so cutting B loses nothing
        result = allocate([item("A", 60_000, 60_000), item("B", 65_000, 60_000)], 120_000)
        assert result.quantities == {"A": 60_000, "B": 60_000}
        assert result.adjustments[0].reason.startswith("−5.000")

    def test_never_cuts_below_demand_until_goods_arrive(self) -> None:
        items = [item("A", 60_000, 60_000, lead=60_000), item("B", 65_000, 65_000, lead=5_000)]
        result = allocate(items, 60_000)
        assert result.quantities["A"] == 60_000
        assert result.quantities["B"] == 5_000 or result.unresolved != 0

    def test_never_below_minimum_once_ordered(self) -> None:
        result = allocate([item("A", 5_000, 5_000, lead=5_000), item("B", 60_000, 60_000, lead=60_000)], 60_000)
        assert result.quantities == {"A": 5_000, "B": 60_000}  # both protected by lead-time demand
        assert result.unresolved == -5_000  # 5,000 too many, reported instead of cut

    def test_deterministic_with_ties(self) -> None:
        items = [item("B", 0, 0), item("A", 0, 0), item("C", 0, 0)]
        first = allocate(items, 60_000)
        second = allocate(list(reversed(items)), 60_000)
        assert first.quantities == second.quantities
        assert first.total % 60_000 == 0

    def test_sum_is_a_multiple_of_60000(self) -> None:
        items = [item(f"S{i:02d}", 5_000 * (i % 4), 6_000.0 * (i % 5)) for i in range(25)]
        for tranche in (60_000, 120_000, 180_000):
            result = allocate(items, tranche)
            assert result.total % 60_000 == 0
            assert result.total == tranche


class TestPlannerScopeAndDerivation:
    def inputs(self) -> list[PlanInput]:
        return [
            PlanInput("DGW001", 300, flat(120)),
            PlanInput("DGW002", 100, flat(60)),
            PlanInput("DGW003", 5_000, flat(30)),
            PlanInput("DGW004", 0, flat(5)),
            PlanInput("SET001", 0, flat(10), is_set=True),
            PlanInput("DGW158", 0, flat(40)),
            PlanInput("DGWADV", 0, flat(40)),
        ]

    def test_sets_and_special_articles_are_excluded_from_the_tranche(self) -> None:
        plan = build_order_plan(self.inputs(), REF, TARGET)
        assert {r.sku for r in plan.rows} == {"DGW001", "DGW002", "DGW003", "DGW004"}
        assert {s.sku for s in plan.special} == {"DGW158", "DGWADV"}
        assert plan.total == plan.tranche and plan.total % 60_000 == 0

    def test_derivation_end_value_equals_planner_quantity_for_every_article(self) -> None:
        for tranche in (None, 60_000, 120_000, 240_000):
            plan = build_order_plan(self.inputs(), REF, TARGET, tranche)
            for row in plan.rows:
                assert row.derivation.result == row.quantity, row.sku

    def test_adjustment_is_visible_in_the_derivation(self) -> None:
        plan = build_order_plan(self.inputs(), REF, TARGET, 240_000)
        changed = [r for r in plan.rows if r.adjustment]
        assert changed
        assert all(r.derivation.steps[-1].key == "tranche" for r in changed)
        assert all("durch Tranche" in r.derivation.steps[-1].note for r in changed)

    def test_tranche_options_are_the_neighbours(self) -> None:
        plan = build_order_plan(self.inputs(), REF, TARGET, 120_000)
        assert plan.tranche_options == (60_000, 120_000, 180_000)
