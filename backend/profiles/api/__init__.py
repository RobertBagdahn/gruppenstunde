"""Profiles API package — re-exports all routers for backward compatibility."""

from .profile import profile_router  # noqa: F401
from .groups import group_router  # noqa: F401

__all__ = [
    "group_router",
    "profile_router",
]
