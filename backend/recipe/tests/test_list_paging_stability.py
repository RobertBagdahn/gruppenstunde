"""Recipe list: every order is total, so paging shows each recipe exactly once."""

import pytest
from django.test import Client

from recipe.tests import make_recipe


def _all_ids(client: Client, query: str, page_size: int = 4) -> tuple[list[int], dict]:
    first = client.get(f"/api/recipes/?{query}&page=1&page_size={page_size}").json()
    ids = [item["id"] for item in first["items"]]
    for page in range(2, first["total_pages"] + 1):
        ids += [i["id"] for i in client.get(f"/api/recipes/?{query}&page={page}&page_size={page_size}").json()["items"]]
    return ids, first


@pytest.fixture
def tied_recipes(db):
    # Identical like/view/usage values: only the tie-breaker separates them.
    return [make_recipe(title=f"Rezept {n}", owner=None) for n in range(11)]


@pytest.mark.django_db
class TestRecipePagingStability:
    @pytest.mark.parametrize("sort", ["use_count", "newest", "oldest", "most_liked", "popular"])
    def test_each_recipe_appears_once(self, client: Client, tied_recipes, sort):
        ids, first = _all_ids(client, f"sort={sort}")

        assert first["total"] == len(tied_recipes)
        assert sorted(ids) == sorted(recipe.id for recipe in tied_recipes)

    def test_random_with_seed_is_stable_across_pages_and_requests(self, client: Client, tied_recipes):
        ids_first, first = _all_ids(client, "sort=random&seed=42")
        ids_second, _ = _all_ids(client, "sort=random&seed=42")

        assert sorted(ids_first) == sorted(recipe.id for recipe in tied_recipes)
        assert ids_first == ids_second
        assert first["seed"] == 42

    def test_random_without_seed_returns_a_seed_that_reproduces_the_order(self, client: Client, tied_recipes):
        first_page = client.get("/api/recipes/?sort=random&page=1&page_size=4").json()
        seed = first_page["seed"]
        assert isinstance(seed, int)

        ids, _ = _all_ids(client, f"sort=random&seed={seed}")

        assert ids[:4] == [item["id"] for item in first_page["items"]]

    def test_different_seeds_give_different_orders(self, client: Client, tied_recipes):
        ids_a, _ = _all_ids(client, "sort=random&seed=1")
        ids_b, _ = _all_ids(client, "sort=random&seed=2")

        assert ids_a != ids_b

    def test_non_random_sort_has_no_seed(self, client: Client, tied_recipes):
        assert client.get("/api/recipes/?sort=newest").json()["seed"] is None
