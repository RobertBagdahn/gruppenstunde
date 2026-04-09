"""Profiles models package — re-exports all models for backward compatibility."""

from .profile import UserPreference, UserProfile
from .groups import GroupJoinRequest, GroupMembership, UserGroup

__all__ = [
    "GroupJoinRequest",
    "GroupMembership",
    "UserGroup",
    "UserPreference",
    "UserProfile",
]
