"""List format `{items, total, page, page_size, total_pages}` via a helper endpoint and as functions."""

from __future__ import annotations

from typing import Annotated

import pytest
from fastapi import APIRouter, Depends
from fastapi.testclient import TestClient
from ruebert.api.pagination import (
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    Page,
    PageParams,
    page_of,
    page_params,
    paginate,
    total_pages,
)
from ruebert.settings import Settings

from .conftest import make_client

SKUS = [f"DGW{number:03d}" for number in range(1, 46)]  # 45 articles

helper = APIRouter(prefix="/test")


@helper.get("/skus", response_model=Page[str])
def list_skus(params: Annotated[PageParams, Depends(page_params)]) -> Page[str]:
    return paginate(SKUS, params)


@pytest.fixture
def client(settings: Settings) -> TestClient:
    return make_client(settings, helper)


class TestEndpoint:
    def test_first_page_with_defaults(self, client: TestClient) -> None:
        body = client.get("/api/test/skus").json()
        assert body["items"] == SKUS[:DEFAULT_PAGE_SIZE]
        assert body["total"] == 45
        assert body["page"] == 1
        assert body["page_size"] == DEFAULT_PAGE_SIZE
        assert body["total_pages"] == 3

    def test_last_page_is_partial(self, client: TestClient) -> None:
        body = client.get("/api/test/skus", params={"page": 3}).json()
        assert body["items"] == SKUS[40:]

    def test_custom_page_size(self, client: TestClient) -> None:
        body = client.get("/api/test/skus", params={"page": 2, "page_size": 10}).json()
        assert body["items"] == SKUS[10:20]
        assert body["total_pages"] == 5

    def test_page_beyond_the_end_is_empty_not_an_error(self, client: TestClient) -> None:
        response = client.get("/api/test/skus", params={"page": 9})
        assert response.status_code == 200
        assert response.json()["items"] == []

    @pytest.mark.parametrize(
        ("params", "field", "message"),
        [
            ({"page": 0}, "page", "Muss mindestens 1 sein."),
            ({"page_size": 0}, "page_size", "Muss mindestens 1 sein."),
            ({"page_size": MAX_PAGE_SIZE + 1}, "page_size", f"Darf höchstens {MAX_PAGE_SIZE} sein."),
        ],
    )
    def test_invalid_parameters_are_422(
        self, client: TestClient, params: dict[str, int], field: str, message: str
    ) -> None:
        response = client.get("/api/test/skus", params=params)
        assert response.status_code == 422
        assert response.json()["errors"] == [{"field": field, "message": message}]

    def test_openapi_documents_the_list_format(self, client: TestClient) -> None:
        schemas = client.get("/api/openapi.json").json()["components"]["schemas"]
        page_schema = next(schema for name, schema in schemas.items() if name.startswith("Page"))
        assert set(page_schema["required"]) == {"items", "total", "page", "page_size", "total_pages"}


class TestFunctions:
    @pytest.mark.parametrize(
        ("total", "size", "pages"), [(0, 20, 0), (1, 20, 1), (20, 20, 1), (21, 20, 2), (45, 10, 5)]
    )
    def test_total_pages(self, total: int, size: int, pages: int) -> None:
        assert total_pages(total, size) == pages

    def test_empty_list(self) -> None:
        page = paginate([], PageParams())
        assert page.model_dump() == {"items": [], "total": 0, "page": 1, "page_size": 20, "total_pages": 0}

    def test_page_of_keeps_sql_slice_and_total(self) -> None:
        page = page_of(["DGW021", "DGW022"], total=45, params=PageParams(page=11, page_size=2))
        assert page.items == ["DGW021", "DGW022"]
        assert page.total == 45
        assert page.total_pages == 23

    def test_offset(self) -> None:
        assert PageParams(page=3, page_size=25).offset == 50
