"""Tests for cache-based rate limiter in event/api/helpers.py."""

import pytest
from django.core.cache import cache
from ninja.errors import HttpError

from event.api.helpers import check_rate_limit


@pytest.mark.django_db(reset_sequences=True)
class TestCheckRateLimit:
    def test_first_request_allowed(self, rf):
        cache.clear()
        request = rf.get("/test/")
        request.META["REMOTE_ADDR"] = "192.168.1.1"
        check_rate_limit(request, max_requests=5, window_seconds=60)

    def test_rate_limit_exceeded(self, rf):
        cache.clear()
        request = rf.get("/test/")
        request.META["REMOTE_ADDR"] = "192.168.1.2"

        for _ in range(10):
            check_rate_limit(request, max_requests=10, window_seconds=60)

        with pytest.raises(HttpError) as exc:
            check_rate_limit(request, max_requests=10, window_seconds=60)
        assert exc.value.status_code == 429
        assert "Zu viele Anfragen" in str(exc.value)

    def test_different_ips_independent(self, rf):
        cache.clear()

        request_a = rf.get("/test/")
        request_a.META["REMOTE_ADDR"] = "10.0.0.1"

        request_b = rf.get("/test/")
        request_b.META["REMOTE_ADDR"] = "10.0.0.2"

        for _ in range(3):
            check_rate_limit(request_a, max_requests=3, window_seconds=60)

        check_rate_limit(request_b, max_requests=3, window_seconds=60)

    def test_x_forwarded_for_takes_priority(self, rf):
        cache.clear()
        request = rf.get("/test/")
        request.META["HTTP_X_FORWARDED_FOR"] = "10.0.0.99, 172.16.0.1"
        request.META["REMOTE_ADDR"] = "10.0.0.1"

        check_rate_limit(request, max_requests=1, window_seconds=60)
        with pytest.raises(HttpError):
            check_rate_limit(request, max_requests=1, window_seconds=60)

    def test_cache_fallback_works(self, rf):
        cache.clear()
        request = rf.get("/test/")
        request.META["REMOTE_ADDR"] = "192.168.1.3"

        check_rate_limit(request, max_requests=5, window_seconds=60)

        request2 = rf.get("/test/")
        request2.META["REMOTE_ADDR"] = "192.168.1.4"
        check_rate_limit(request2, max_requests=1, window_seconds=60)
        with pytest.raises(HttpError):
            check_rate_limit(request2, max_requests=1, window_seconds=60)
