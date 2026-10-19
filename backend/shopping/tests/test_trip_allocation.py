"""Pure allocation scenarios (openspec `shopping-trip-planning`); no database needed."""

import datetime as dt
from zoneinfo import ZoneInfo

import pytest

from shopping.services.trips.allocation import (
    HINT_AFTER_MEAL,
    HINT_NO_TIME,
    HINT_RULE_EXCEEDS_DEMAND,
    UNCOVERED_BEFORE_FIRST_TRIP,
    UNCOVERED_NO_TIME,
    UNCOVERED_NO_TRIPS,
    PinnedShare,
    RuleInfo,
    TripInfo,
    allocate,
)
from shopping.services.trips.demand import DemandUnit

BERLIN = ZoneInfo("Europe/Berlin")
POTATO, MINCE, MILK, PLATES = 1, 2, 3, 4


def at(day: int, hour: int, minute: int = 0, month: int = 10) -> dt.datetime:
    return dt.datetime(2026, month, day, hour, minute, tzinfo=BERLIN).astimezone(dt.UTC)


_meal_counter = iter(range(1, 10_000))


def unit(need_at, quantity=1000.0, subject=POTATO, kind="ingredient", meal_id=None, label="Mahlzeit"):
    return DemandUnit(
        plan_id=1,
        meal_id=meal_id if meal_id is not None else next(_meal_counter),
        meal_label=label,
        need_at=need_at,
        kind=kind,
        subject_id=subject,
        name=f"subject-{subject}",
        quantity=quantity,
    )


def trip(trip_id, when, created=False):
    return TripInfo(id=trip_id, scheduled_at=when, is_created=created)


def rule(rule_id, target, subject=POTATO, meal=None, quantity=None, kind="ingredient"):
    return RuleInfo(
        id=rule_id,
        target_id=target,
        kind=kind,
        subject_id=subject,
        meal_id=meal,
        quantity=quantity,
        created_at=dt.datetime(2026, 10, 1, tzinfo=dt.UTC) + dt.timedelta(minutes=rule_id),
    )


def total(allocation, trip_id):
    return sum(p.quantity for p in allocation.by_trip[trip_id])


class TestDefaultAssignment:
    def test_breakfast_on_shopping_day_belongs_to_previous_trip(self):
        trips = [trip(1, at(17, 9)), trip(2, at(18, 10))]
        result = allocate(trips, [], [unit(at(18, 8))])
        assert total(result, 1) == 1000 and total(result, 2) == 0

    def test_lunch_after_trip_belongs_to_that_trip(self):
        trips = [trip(1, at(17, 9)), trip(2, at(18, 10))]
        result = allocate(trips, [], [unit(at(18, 12, 30))])
        assert total(result, 2) == 1000

    def test_equal_time_belongs_to_that_trip(self):
        trips = [trip(1, at(17, 9)), trip(2, at(18, 12))]
        result = allocate(trips, [], [unit(at(18, 12))])
        assert total(result, 2) == 1000

    def test_trips_at_same_time_go_to_smallest_id(self):
        trips = [trip(7, at(17, 9)), trip(3, at(17, 9))]
        result = allocate(trips, [], [unit(at(17, 12))])
        assert total(result, 3) == 1000 and total(result, 7) == 0

    def test_demand_before_first_trip_is_uncovered(self):
        result = allocate([trip(1, at(18, 10))], [], [unit(at(17, 19))])
        assert [u.reason for u in result.uncovered] == [UNCOVERED_BEFORE_FIRST_TRIP]
        assert result.uncovered[0].part.quantity == 1000

    def test_event_without_trips_is_entirely_uncovered(self):
        result = allocate([], [], [unit(at(17, 19)), unit(at(18, 19))])
        assert [u.reason for u in result.uncovered] == [UNCOVERED_NO_TRIPS] * 2

    def test_meal_without_time_is_uncovered_with_hint(self):
        result = allocate([trip(1, at(17, 9))], [], [unit(None, label="Samstag Mittag")])
        assert [u.reason for u in result.uncovered] == [UNCOVERED_NO_TIME]
        (hint,) = result.hints
        assert hint.kind == HINT_NO_TIME
        assert hint.message == "Samstag Mittag: Mahlzeit ohne Uhrzeit – keinem Einkauf zugeordnet"
        assert total(result, 1) == 0

    def test_trip_without_time_is_never_default_target(self):
        result = allocate([trip(1, None, created=True)], [], [unit(at(18, 12))])
        assert result.uncovered[0].reason == UNCOVERED_NO_TRIPS

    def test_daylight_saving_switch_on_25_october(self):
        # Berlin leaves summer time on 2026-10-25 03:00; 08:00 local is 07:00 UTC afterwards, 06:00 UTC before.
        trips = [trip(1, at(24, 8)), trip(2, at(25, 8))]
        result = allocate(trips, [], [unit(at(25, 7, 59)), unit(at(25, 8)), unit(at(24, 8))])
        assert [len(result.by_trip[1]), len(result.by_trip[2])] == [2, 1]
        assert at(25, 8) - at(24, 8) == dt.timedelta(hours=25)


class TestRules:
    def test_ingredient_rule_moves_all_meals(self):
        trips = [trip(1, at(17, 9)), trip(2, at(18, 9))]
        demand = [unit(at(18, 12), subject=MINCE), unit(at(19, 12), subject=MINCE), unit(at(18, 12))]
        result = allocate(trips, [rule(1, 1, subject=MINCE)], demand)
        assert total(result, 1) == 2000
        assert total(result, 2) == 1000
        assert {p.unit.subject_id for p in result.by_trip[1]} == {MINCE}

    def test_meal_rule_wins_over_ingredient_rule(self):
        trips = [trip(1, at(17, 9)), trip(2, at(17, 10)), trip(3, at(17, 11))]
        lunch = unit(at(18, 12), meal_id=500)
        dinner = unit(at(18, 18), meal_id=501)
        rules = [rule(1, 2), rule(2, 3, meal=500)]  # the ingredient rule was created first
        result = allocate(trips, rules, [lunch, dinner])
        assert [p.unit.meal_id for p in result.by_trip[3]] == [500]
        assert [p.unit.meal_id for p in result.by_trip[2]] == [501]

    def test_partial_rule_takes_earliest_meals_first_and_keeps_sum(self):
        trips = [trip(1, at(17, 9)), trip(2, at(17, 10))]
        demand = [unit(at(20, 12), 2000.0), unit(at(18, 12), 2000.0), unit(at(19, 12), 1000.0)]
        result = allocate(trips, [rule(1, 1, quantity=3000.0)], demand)
        assert total(result, 1) == pytest.approx(3000.0)
        assert total(result, 2) == pytest.approx(2000.0)
        taken = [(p.unit.need_at, p.quantity) for p in result.by_trip[1]]
        assert taken == [(at(18, 12), 2000.0), (at(19, 12), 1000.0)]

    def test_three_kilo_of_five_kilo_potatoes(self):
        trips = [trip(1, at(17, 9)), trip(2, at(19, 9))]
        result = allocate(trips, [rule(1, 1, quantity=3000.0)], [unit(at(20, 12), 5000.0)])
        assert total(result, 1) == 3000 and total(result, 2) == 2000

    def test_fractional_split_rounds_to_whole_grams_and_keeps_sum(self):
        trips = [trip(1, at(17, 9)), trip(2, at(17, 10))]
        demand = [unit(at(18, 12), 1000.0)]
        result = allocate(trips, [rule(1, 1, quantity=333.3)], demand)
        assert total(result, 1) == 333
        assert total(result, 1) + total(result, 2) == pytest.approx(1000.0)

    def test_rule_applies_to_new_meals_with_same_ingredient(self):
        trips = [trip(1, at(17, 9)), trip(2, at(18, 9))]
        rules = [rule(1, 1)]
        before = allocate(trips, rules, [unit(at(18, 12))])
        after = allocate(trips, rules, [unit(at(18, 12)), unit(at(19, 12))])
        assert total(before, 1) == 1000
        assert total(after, 1) == 2000

    def test_target_after_meal_still_applies_with_hint(self):
        trips = [trip(1, at(17, 9)), trip(2, at(18, 10))]
        result = allocate(trips, [rule(1, 2, subject=MILK)], [unit(at(18, 8), subject=MILK, meal_id=9)])
        assert total(result, 2) == 1000
        (hint,) = result.hints
        assert (hint.kind, hint.message, hint.meal_id) == (HINT_AFTER_MEAL, "Einkauf liegt nach der Mahlzeit", 9)

    def test_rule_larger_than_demand_is_capped_with_hint(self):
        trips = [trip(1, at(17, 9)), trip(2, at(18, 9))]
        result = allocate(trips, [rule(1, 2, quantity=3000.0)], [unit(at(19, 12), 2000.0)])
        assert total(result, 2) == 2000
        assert [h.kind for h in result.hints] == [HINT_RULE_EXCEEDS_DEMAND]
        assert result.hints[0].message == "Regel größer als Bedarf"

    def test_rule_without_demand_gives_no_hint_when_it_has_no_quantity(self):
        result = allocate([trip(1, at(17, 9))], [rule(1, 1, subject=PLATES, kind="material")], [])
        assert result.hints == []

    def test_deleting_rule_restores_default_assignment(self):
        trips = [trip(1, at(17, 9)), trip(2, at(18, 9))]
        demand = [unit(at(19, 12))]
        assert total(allocate(trips, [rule(1, 1)], demand), 1) == 1000
        assert total(allocate(trips, [], demand), 2) == 1000

    def test_material_rule_matches_material_only(self):
        trips = [trip(1, at(17, 9)), trip(2, at(18, 9))]
        demand = [unit(at(19, 12), 40.0, subject=PLATES, kind="material"), unit(at(19, 12), subject=PLATES)]
        result = allocate(trips, [rule(1, 1, subject=PLATES, kind="material")], demand)
        assert [p.unit.kind for p in result.by_trip[1]] == ["material"]
        assert [p.unit.kind for p in result.by_trip[2]] == ["ingredient"]

    def test_rule_with_unknown_target_is_ignored(self):
        result = allocate([trip(1, at(17, 9))], [rule(1, 99)], [unit(at(18, 12))])
        assert total(result, 1) == 1000

    def test_rule_can_cover_meal_without_time(self):
        result = allocate([trip(1, at(17, 9))], [rule(1, 1)], [unit(None)])
        assert total(result, 1) == 1000
        assert result.uncovered == []


class TestPinning:
    def test_created_trip_keeps_its_demand_when_new_trip_appears(self):
        metro = trip(1, at(17, 9), created=True)
        new_trip = trip(2, at(17, 18))
        demand = [unit(at(18, 12), 800.0, meal_id=10), unit(at(18, 19), 500.0, meal_id=11)]
        pinned = [PinnedShare(1, 10, "ingredient", POTATO, 800.0), PinnedShare(1, 11, "ingredient", POTATO, 500.0)]
        result = allocate([metro, new_trip], [], demand, pinned)
        assert total(result, 1) == 1300
        assert total(result, 2) == 0
        assert all(p.pinned for p in result.by_trip[1])

    def test_new_demand_after_creation_follows_the_date(self):
        metro = trip(1, at(17, 9), created=True)
        later = trip(2, at(18, 9))
        demand = [unit(at(18, 12), 800.0, meal_id=10), unit(at(19, 12), 500.0, meal_id=12)]
        pinned = [PinnedShare(1, 10, "ingredient", POTATO, 800.0)]
        result = allocate([metro, later], [], demand, pinned)
        assert total(result, 1) == 800 and total(result, 2) == 500

    def test_pinned_trip_absorbs_growth(self):
        metro = trip(1, at(17, 9), created=True)
        demand = [unit(at(18, 12), 1200.0, meal_id=10)]
        result = allocate([metro], [], demand, [PinnedShare(1, 10, "ingredient", POTATO, 1000.0)])
        assert total(result, 1) == 1200

    def test_pin_wins_over_rule(self):
        metro = trip(1, at(17, 9), created=True)
        other = trip(2, at(17, 10))
        demand = [unit(at(18, 12), 1000.0, meal_id=10)]
        result = allocate([metro, other], [rule(1, 2)], demand, [PinnedShare(1, 10, "ingredient", POTATO, 1000.0)])
        assert total(result, 1) == 1000 and total(result, 2) == 0

    def test_split_pin_between_two_created_trips(self):
        a, b = trip(1, at(17, 9), created=True), trip(2, at(17, 10), created=True)
        demand = [unit(at(18, 12), 1500.0, meal_id=10)]
        pins = [PinnedShare(1, 10, "ingredient", POTATO, 1000.0), PinnedShare(2, 10, "ingredient", POTATO, 400.0)]
        result = allocate([a, b], [], demand, pins)
        assert total(result, 1) == 1000 and total(result, 2) == 500
