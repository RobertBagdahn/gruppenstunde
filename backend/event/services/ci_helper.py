"""CI helper — resolve corporate identity for an event context."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from event.models import Event


@dataclass(frozen=True)
class CIData:
    """Resolved corporate identity data for rendering."""

    group_name: str
    primary_color: str
    secondary_color: str
    logo_url: str
    slogan: str
    greeting_text: str
    footer_text: str
    payment_info: str
    signature_text: str


DEFAULT_CI = CIData(
    group_name="gruppenstunde.de",
    primary_color="#4a3a6b",
    secondary_color="#e8e4f0",
    logo_url="",
    slogan="",
    greeting_text="",
    footer_text="",
    payment_info="",
    signature_text="",
)


def get_event_ci(event: Event) -> CIData:
    """Resolve the corporate identity for an event.

    Returns the CI of the first invited group (alphabetically by name)
    that has a CI configured. Falls back to default Inspi styling.
    """
    from profiles.models import GroupCorporateIdentity

    groups_with_ci = (
        event.invited_groups.filter(
            corporate_identity__isnull=False,
            is_deleted=False,
        )
        .select_related("corporate_identity")
        .order_by("name")
    )

    for group in groups_with_ci:
        ci = group.corporate_identity
        return CIData(
            group_name=group.name,
            primary_color=ci.primary_color,
            secondary_color=ci.secondary_color,
            logo_url=ci.logo_url,
            slogan=ci.slogan,
            greeting_text=ci.greeting_text,
            footer_text=ci.footer_text,
            payment_info=ci.payment_info,
            signature_text=ci.signature_text,
        )

    # No group with CI found — check if there's any invited group at all
    first_group = event.invited_groups.filter(is_deleted=False).order_by("name").first()
    if first_group:
        return CIData(
            group_name=first_group.name,
            primary_color=DEFAULT_CI.primary_color,
            secondary_color=DEFAULT_CI.secondary_color,
            logo_url="",
            slogan="",
            greeting_text="",
            footer_text="",
            payment_info="",
            signature_text="",
        )

    return DEFAULT_CI
