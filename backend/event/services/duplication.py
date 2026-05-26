"""Event duplication service — deep copy events with date shifting."""

import logging
from datetime import timedelta

from django.utils.text import slugify

from event.models import BookingOption, Event

logger = logging.getLogger(__name__)


class DuplicationService:
    """Deep-copies events with optional date shifting."""

    @classmethod
    def duplicate_event(cls, source: Event, user, date_shift_weeks: int | None = None) -> Event:
        """Create a deep copy of an event.

        Args:
            source: The event to copy.
            user: The user creating the copy.
            date_shift_weeks: Optional number of weeks to shift dates forward.

        Returns:
            The newly created event.
        """
        # Generate unique slug
        base_slug = slugify(f"{source.name}-kopie")
        slug = base_slug
        counter = 2
        while Event.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1

        # Copy base fields
        new_event = Event(
            name=f"{source.name} (Kopie)",
            slug=slug,
            description=source.description,
            color=source.color,
            icon=source.icon,
            is_template=False,
            location=source.location,
            event_location=source.event_location,
            meeting_point=source.meeting_point,
            pickup_point=source.pickup_point,
            invitation_text=source.invitation_text,
            is_public=False,  # Always start as draft/private
            guest_registration_enabled=source.guest_registration_enabled,
            participant_visibility=source.participant_visibility,
            packing_list=source.packing_list,
            created_by=user,
        )

        # Date shifting
        shift = timedelta(weeks=date_shift_weeks) if date_shift_weeks else None
        if source.start_date:
            new_event.start_date = source.start_date + shift if shift else source.start_date
        if source.end_date:
            new_event.end_date = source.end_date + shift if shift else source.end_date
        if source.registration_deadline:
            new_event.registration_deadline = (
                source.registration_deadline + shift if shift else source.registration_deadline
            )
        if source.registration_start:
            new_event.registration_start = source.registration_start + shift if shift else source.registration_start

        new_event.save()
        new_event.responsible_persons.add(user)

        # Copy booking options
        for option in source.booking_options.filter(is_system=False):
            BookingOption.objects.create(
                event=new_event,
                name=option.name,
                description=option.description,
                price=option.price,
                max_participants=option.max_participants,
                bookable_from=option.bookable_from + shift if option.bookable_from and shift else option.bookable_from,
                bookable_till=option.bookable_till + shift if option.bookable_till and shift else option.bookable_till,
            )

        # Copy custom fields
        for field in source.custom_fields.all():
            field.pk = None
            field.event = new_event
            field.save()

        # Copy day slots
        for slot in source.day_slots.all():
            slot.pk = None
            slot.event = new_event
            if slot.date and shift:
                slot.date = slot.date + shift
            slot.save()

        logger.info("Duplicated event %s → %s (by user %s)", source.slug, new_event.slug, user.id)
        return new_event
