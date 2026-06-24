"""Profiles models package — re-exports all models for backward compatibility."""

from .groups import GroupCorporateIdentity, GroupJoinRequest, GroupMembership, UserGroup
from .profile import UserPreference, UserProfile

__all__ = [
    "GroupCorporateIdentity",
    "GroupJoinRequest",
    "GroupMembership",
    "UserGroup",
    "UserPreference",
    "UserProfile",
]
