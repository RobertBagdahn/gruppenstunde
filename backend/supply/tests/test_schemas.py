import pytest

from supply.schemas.ingredients import PortionOut


class TestPortionOutIsDefault:
    def test_rank_1_is_default(self):
        class PortionMock:
            rank = 1

        assert PortionOut.resolve_is_default(PortionMock()) is True

    def test_rank_2_is_not_default(self):
        class PortionMock:
            rank = 2

        assert PortionOut.resolve_is_default(PortionMock()) is False

    def test_rank_0_is_not_default(self):
        class PortionMock:
            rank = 0

        assert PortionOut.resolve_is_default(PortionMock()) is False

    def test_dict_rank_1_is_default(self):
        assert PortionOut.resolve_is_default({"rank": 1}) is True

    def test_dict_rank_2_is_not_default(self):
        assert PortionOut.resolve_is_default({"rank": 2}) is False

    def test_dict_with_explicit_is_default(self):
        assert PortionOut.resolve_is_default({"rank": 2, "is_default": True}) is True

    def test_empty_dict_is_not_default(self):
        assert PortionOut.resolve_is_default({}) is False
