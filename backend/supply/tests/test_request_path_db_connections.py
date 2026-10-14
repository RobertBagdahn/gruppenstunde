"""Request handlers must not fan out to worker threads, each of which would hold its own DB connection.

`core.services.database_capacity` counts one session per request; the data-offensive endpoints
therefore run inline (openspec `food-release-hardening`, task 1.3). The endpoint itself is covered in
`test_data_offensive_api.py` (embeddings run on the request thread).
"""

from unittest.mock import patch

import pytest

from supply.services import ingredient_embeddings


@pytest.mark.django_db
def test_inline_embedding_backfill_opens_no_thread_pool():
    with (
        patch.object(ingredient_embeddings, "_embed_one", return_value=True) as embed_one,
        patch.object(ingredient_embeddings, "ThreadPoolExecutor") as pool,
    ):
        result = ingredient_embeddings.backfill_embeddings(ids=[1, 2, 3], workers=1)

    pool.assert_not_called()
    assert embed_one.call_count == 3
    assert (result.processed, result.updated, result.failed) == (3, 3, 0)
