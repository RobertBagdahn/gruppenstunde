"""
Tag-specific schemas (re-exported from base for convenience).

The primary Tag/ScoutLevel schemas are in base.py.
This module provides additional tag-specific schemas if needed.
"""

from .base import (
    ScoutLevelOut,
    TagOut,
    TagSuggestIn,
    TagTreeOut,
)

__all__ = [
    "TagOut",
    "TagTreeOut",
    "TagSuggestIn",
    "ScoutLevelOut",
]
