"""Request-scoped context for AI budget accounting (anonymous visitor key)."""

from __future__ import annotations

from collections.abc import Callable
from contextvars import ContextVar

from django.http import HttpRequest, HttpResponse

from .services.ai_budget import compute_anon_key

# Set per request so gemini_call can attribute anonymous calls without a request argument.
current_anon_key: ContextVar[str | None] = ContextVar("current_anon_key", default=None)


class AiRequestContextMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        token = current_anon_key.set(compute_anon_key(request))
        try:
            return self.get_response(request)
        finally:
            current_anon_key.reset(token)
