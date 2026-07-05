"""Typed exceptions for the recipe URL import pipeline.

These are plain exceptions (not HttpError) so the service layer stays
free of HTTP concerns. The API layer (`recipe/api/recipes.py`) maps them
to the appropriate `error_code`/HTTP-status combination.
"""


class SourceUnreachableError(Exception):
    """The source page could not be fetched (connection error, timeout, HTTP error)."""


class NoRecipeFoundError(Exception):
    """The source page loaded, but no usable recipe data could be extracted."""
