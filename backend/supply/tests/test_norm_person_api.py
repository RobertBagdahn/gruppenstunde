"""Tests for Norm Person API endpoints."""

import pytest
from django.test import Client


# ---------------------------------------------------------------------------
# GET /api/norm-person/calculate
# ---------------------------------------------------------------------------


class TestNormPersonCalculate:
    """Tests for the /api/norm-person/calculate endpoint."""

    def test_calculate_male_teenager(self, api_client: Client):
        resp = api_client.get(
            "/api/norm-person/calculate",
            {"age": 15, "gender": "male", "pal": 1.5},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["age"] == 15
        assert data["gender"] == "male"
        assert data["pal"] == 1.5
        assert data["bmr"] > 0
        assert data["tdee"] > 0
        assert data["weight_kg"] > 0
        assert data["height_cm"] > 0

    def test_calculate_female_child(self, api_client: Client):
        resp = api_client.get(
            "/api/norm-person/calculate",
            {"age": 8, "gender": "female", "pal": 1.5},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["gender"] == "female"
        assert data["age"] == 8
        assert data["norm_factor"] < 1.0

    def test_calculate_reference_person_returns_norm_factor_1(self, api_client: Client):
        resp = api_client.get(
            "/api/norm-person/calculate",
            {"age": 15, "gender": "male", "pal": 1.5},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["norm_factor"] == pytest.approx(1.0, abs=0.01)

    def test_calculate_with_custom_pal(self, api_client: Client):
        resp = api_client.get(
            "/api/norm-person/calculate",
            {"age": 25, "gender": "male", "pal": 2.0},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["pal"] == 2.0
        assert data["norm_factor"] > 1.0

    def test_calculate_default_pal(self, api_client: Client):
        resp = api_client.get(
            "/api/norm-person/calculate",
            {"age": 15, "gender": "male"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["pal"] == 1.5

    def test_calculate_invalid_age_negative(self, api_client: Client):
        resp = api_client.get(
            "/api/norm-person/calculate",
            {"age": -1, "gender": "male", "pal": 1.5},
        )
        assert resp.status_code == 422

    def test_calculate_invalid_age_too_high(self, api_client: Client):
        resp = api_client.get(
            "/api/norm-person/calculate",
            {"age": 100, "gender": "male", "pal": 1.5},
        )
        assert resp.status_code == 422

    def test_calculate_invalid_gender(self, api_client: Client):
        resp = api_client.get(
            "/api/norm-person/calculate",
            {"age": 15, "gender": "other", "pal": 1.5},
        )
        assert resp.status_code == 422

    def test_calculate_missing_age(self, api_client: Client):
        resp = api_client.get(
            "/api/norm-person/calculate",
            {"gender": "male", "pal": 1.5},
        )
        assert resp.status_code == 422

    def test_calculate_missing_gender(self, api_client: Client):
        resp = api_client.get(
            "/api/norm-person/calculate",
            {"age": 15, "pal": 1.5},
        )
        assert resp.status_code == 422

    def test_calculate_no_auth_required(self, api_client: Client):
        resp = api_client.get(
            "/api/norm-person/calculate",
            {"age": 15, "gender": "male", "pal": 1.5},
        )
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# GET /api/norm-person/curves
# ---------------------------------------------------------------------------


class TestNormPersonCurves:
    """Tests for the /api/norm-person/curves endpoint."""

    def test_curves_returns_100_data_points(self, api_client: Client):
        resp = api_client.get("/api/norm-person/curves")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data_points"]) == 100

    def test_curves_data_point_structure(self, api_client: Client):
        resp = api_client.get("/api/norm-person/curves")
        assert resp.status_code == 200
        data = resp.json()
        point = data["data_points"][0]
        assert "age" in point
        assert "male_tdee" in point
        assert "female_tdee" in point
        assert "male_norm_factor" in point
        assert "female_norm_factor" in point

    def test_curves_ages_0_to_99(self, api_client: Client):
        resp = api_client.get("/api/norm-person/curves")
        assert resp.status_code == 200
        data = resp.json()
        ages = [p["age"] for p in data["data_points"]]
        assert ages == list(range(100))

    def test_curves_default_pal(self, api_client: Client):
        resp = api_client.get("/api/norm-person/curves")
        assert resp.status_code == 200
        data = resp.json()
        assert data["pal"] == 1.5

    def test_curves_custom_pal(self, api_client: Client):
        resp = api_client.get("/api/norm-person/curves", {"pal": 1.75})
        assert resp.status_code == 200
        data = resp.json()
        assert data["pal"] == 1.75

    def test_curves_reference_object(self, api_client: Client):
        resp = api_client.get("/api/norm-person/curves")
        assert resp.status_code == 200
        ref = resp.json()["reference"]
        assert ref["age"] == 15
        assert ref["gender"] == "male"
        assert ref["pal"] == 1.5
        assert ref["norm_factor"] == pytest.approx(1.0, abs=0.01)

    def test_curves_no_auth_required(self, api_client: Client):
        resp = api_client.get("/api/norm-person/curves")
        assert resp.status_code == 200

    def test_curves_higher_pal_increases_tdee(self, api_client: Client):
        resp_low = api_client.get("/api/norm-person/curves", {"pal": 1.2})
        resp_high = api_client.get("/api/norm-person/curves", {"pal": 2.0})
        assert resp_low.status_code == 200
        assert resp_high.status_code == 200
        low_tdee = resp_low.json()["data_points"][20]["male_tdee"]
        high_tdee = resp_high.json()["data_points"][20]["male_tdee"]
        assert high_tdee > low_tdee
