"""Spec `order-traffic-light`: stock-out week, colour by order window, recommendation, special articles."""

from __future__ import annotations

from datetime import date, timedelta

from ruebert.domain.traffic_light import ForecastWeek, LightSettings, classify, is_special, stockout_week

REF = date(2026, 5, 18)  # KW 21/2026


def flat(per_week: float, weeks: int = 156, start: date = REF) -> list[ForecastWeek]:
    return [ForecastWeek(start + timedelta(weeks=i), per_week) for i in range(weeks)]


def runs_out_in(week_offset: int, per_week: float = 100) -> tuple[float, list[ForecastWeek]]:
    """Stock such that the cumulative forecast first exceeds stock − 30 in week `week_offset` (0-based)."""
    return per_week * week_offset + 30 + per_week / 2, flat(per_week)


class TestStockoutWeek:
    def test_stock_lasts_beyond_the_horizon(self) -> None:
        assert stockout_week(1_000_000, flat(100), 30) is None
        light = classify("DGW001", 1_000_000, flat(100, weeks=40), REF, LightSettings())
        assert light.stockout_week is None
        assert light.stockout_label == "reicht über den Horizont"

    def test_first_week_where_cumulative_forecast_exceeds_stock_minus_minimum(self) -> None:
        # stock 330 − 30 = 300 available; forecast 100/week → exceeded in the 4th week (cumulative 400)
        assert stockout_week(330, flat(100), 30) == REF + timedelta(weeks=3)
        assert stockout_week(330, flat(100), 30) != REF + timedelta(weeks=2)  # 300 is not > 300


class TestColour:
    def test_order_cannot_arrive_in_time_is_red(self) -> None:
        stock, forecast = runs_out_in(9)  # KW 30/2026 = 9 weeks after KW 21
        light = classify("DGW001", stock, forecast, REF, LightSettings(lead_time_weeks=12))
        assert light.stockout_week == date(2026, 7, 20)
        assert light.colour == "red"

    def test_yellow_inside_the_planning_window(self) -> None:
        stock, forecast = runs_out_in(15)  # after 12 weeks lead, before 12 + 8
        assert classify("A", stock, forecast, REF, LightSettings()).colour == "yellow"

    def test_green_when_outside_window(self) -> None:
        stock, forecast = runs_out_in(30)
        assert classify("A", stock, forecast, REF, LightSettings()).colour == "green"

    def test_boundaries_belong_to_the_later_colour(self) -> None:
        settings = LightSettings(lead_time_weeks=12, planning_window_weeks=8)
        assert classify("A", *runs_out_in(11), REF, settings).colour == "red"
        assert classify("A", *runs_out_in(12), REF, settings).colour == "yellow"
        assert classify("A", *runs_out_in(19), REF, settings).colour == "yellow"
        assert classify("A", *runs_out_in(20), REF, settings).colour == "green"

    def test_overstock_is_blue(self) -> None:
        forecast = flat(100, weeks=156)  # 130 weeks = 13,000
        assert classify("A", 13_001, forecast, REF, LightSettings()).colour == "blue"
        assert classify("A", 12_999, forecast, REF, LightSettings()).colour != "blue"

    def test_threshold_change_changes_colour(self) -> None:
        stock, forecast = runs_out_in(15)
        assert classify("A", stock, forecast, REF, LightSettings(planning_window_weeks=8)).colour == "yellow"
        assert classify("A", stock, forecast, REF, LightSettings(planning_window_weeks=2)).colour == "green"


class TestRecommendation:
    def test_order_by_week_is_stockout_minus_lead_time(self) -> None:
        stock, forecast = runs_out_in(15)
        light = classify("A", stock, forecast, REF, LightSettings(), suggested_quantity=20_000)
        assert light.recommendation is not None
        assert light.recommendation.order_by_week == REF + timedelta(weeks=3)
        assert light.recommendation.text == "Bis KW 24/2026 bestellen · ca. 20.000 Tüten"

    def test_green_and_blue_have_no_recommendation(self) -> None:
        stock, forecast = runs_out_in(30)
        assert classify("A", stock, forecast, REF, LightSettings()).recommendation is None


class TestExplanationAndSpecials:
    def test_thresholds_are_marked_as_open_question_q080(self) -> None:
        stock, forecast = runs_out_in(15)
        steps = classify("A", stock, forecast, REF, LightSettings()).derivation.steps
        flagged = {s.key for s in steps if s.question_id == "Q-080"}
        assert flagged == {"lead_time", "planning_window", "overstock"}

    def test_special_articles_are_flagged(self) -> None:
        assert all(is_special(s) for s in ("DGW158", "DGWADV", "DGWADV2"))
        assert not is_special("DGW001")
        assert classify("DGW158", 10, flat(100), REF, LightSettings()).is_special


class TestPastForecastWeeks:
    def test_forecast_weeks_before_the_reference_date_are_ignored(self) -> None:
        past = [ForecastWeek(REF - timedelta(weeks=2), 100_000)]
        light = classify("A", 1_000_000, past + flat(100, weeks=40), REF, LightSettings())
        assert light.stockout_week is None
