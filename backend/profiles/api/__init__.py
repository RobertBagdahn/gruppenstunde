"""Profiles API package — re-exports all routers for backward compatibility."""

from .groups import group_router
from .profile import profile_router

__all__ = [
    "group_router",
    "profile_router",
]
