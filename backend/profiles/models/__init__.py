"""Profiles models package — re-exports all models for backward compatibility."""

from .profile import UserPreference, UserProfile
from .groups import GroupCorporateIdentity, GroupJoinRequest, GroupMembership, UserGroup

__all__ = [
    "GroupCorporateIdentity",
    "GroupJoinRequest",
    "GroupMembership",
    "UserGroup",
    "UserPreference",
    "UserProfile",
]
