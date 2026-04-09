from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from ..choices import GenderChoices, ParticipantVisibilityChoices


# ---------------------------------------------------------------------------
# Event Location
# ---------------------------------------------------------------------------


class EventLocation(models.Model):
    """A reusable location for events."""

    name = models.CharField(max_length=200, verbose_name=_("Name"))
    street = models.CharField(max_length=200, blank=True, default="", verbose_name=_("Straße"))
    zip_code = models.CharField(max_length=10, blank=True, default="", verbose_name=_("PLZ"))
    city = models.CharField(max_length=100, blank=True, default="", verbose_name=_("Stadt"))
    state = models.CharField(max_length=100, blank=True, default="", verbose_name=_("Bundesland"))
    country = models.CharField(max_length=100, blank=True, default="Deutschland", verbose_name=_("Land"))
    description = models.TextField(blank=True, default="", verbose_name=_("Beschreibung"))
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_locations",
        verbose_name=_("Erstellt von"),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Veranstaltungsort")
        verbose_name_plural = _("Veranstaltungsorte")
        ordering = ["name"]

    def __str__(self):
        parts = [self.name]
        if self.city:
            parts.append(self.city)
        return ", ".join(parts)

    @property
    def full_address(self) -> str:
        parts = []
        if self.street:
            parts.append(self.street)
        if self.zip_code and self.city:
            parts.append(f"{self.zip_code} {self.city}")
        elif self.city:
            parts.append(self.city)
        return ", ".join(parts)


# ---------------------------------------------------------------------------
# Event
# ---------------------------------------------------------------------------


class Event(models.Model):
    """A bookable event managed by responsible persons."""

    name = models.CharField(max_length=100, verbose_name=_("Name"))
    slug = models.SlugField(max_length=120, unique=True, blank=True, verbose_name=_("Slug"))
    description = models.TextField(blank=True, default="", verbose_name=_("Beschreibung"))
    location = models.CharField(max_length=200, blank=True, default="", verbose_name=_("Ort"))
    event_location = models.ForeignKey(
        EventLocation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events",
        verbose_name=_("Veranstaltungsort"),
    )
    invitation_text = models.TextField(blank=True, default="", verbose_name=_("Einladungstext"))
    start_date = models.DateTimeField(null=True, blank=True, verbose_name=_("Startdatum"))
    end_date = models.DateTimeField(null=True, blank=True, verbose_name=_("Enddatum"))
    registration_deadline = models.DateTimeField(null=True, blank=True, verbose_name=_("Anmeldeschluss"))
    registration_start = models.DateTimeField(null=True, blank=True, verbose_name=_("Anmeldestart"))
    is_public = models.BooleanField(default=False, verbose_name=_("Öffentlich"))
    participant_visibility = models.CharField(
        max_length=20,
        choices=ParticipantVisibilityChoices.choices,
        default=ParticipantVisibilityChoices.NONE,
        verbose_name=_("Teilnehmer-Sichtbarkeit"),
        help_text=_("Was eingeladene Teilnehmende über Anmeldezahlen sehen dürfen"),
    )
    responsible_persons = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="managed_events",
        verbose_name=_("Verantwortliche"),
    )
    invited_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="invited_events",
        verbose_name=_("Eingeladene Benutzer"),
    )
    invited_groups = models.ManyToManyField(
        "profiles.UserGroup",
        blank=True,
        related_name="invited_events",
        verbose_name=_("Eingeladene Gruppen"),
    )
    packing_list = models.ForeignKey(
        "packinglist.PackingList",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events",
        verbose_name=_("Packliste"),
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_events",
        verbose_name=_("Erstellt von"),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Veranstaltung")
        verbose_name_plural = _("Veranstaltungen")
        ordering = ["-start_date"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name, allow_unicode=False)
            if not base_slug:
                base_slug = "event"
            slug = base_slug
            counter = 1
            while Event.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def user_can_manage(self, user) -> bool:
        """Check if a user is a responsible person or staff."""
        if user.is_staff:
            return True
        return self.responsible_persons.filter(pk=user.pk).exists()

    def user_is_invited(self, user) -> bool:
        """Check if user can see and register for this event."""
        if self.is_public:
            return True
        if user.is_staff:
            return True
        if self.responsible_persons.filter(pk=user.pk).exists():
            return True
        if self.invited_users.filter(pk=user.pk).exists():
            return True
        # Check group invitations
        from profiles.models import GroupMembership

        user_group_ids = GroupMembership.objects.filter(user=user, is_active=True).values_list("group_id", flat=True)
        if self.invited_groups.filter(pk__in=user_group_ids).exists():
            return True
        return False

    def compute_phase(self) -> str:
        """Compute the current event phase based on date fields.

        Returns one of: draft, pre_registration, registration,
        pre_event, running, completed.
        """
        now = timezone.now()

        if self.end_date and now > self.end_date:
            return "completed"

        if self.start_date and now >= self.start_date:
            return "running"

        if self.registration_deadline and now > self.registration_deadline:
            return "pre_event"

        if self.registration_start and now >= self.registration_start:
            return "registration"

        if self.registration_start and now < self.registration_start:
            return "pre_registration"

        return "draft"


# ---------------------------------------------------------------------------
# Booking Option
# ---------------------------------------------------------------------------


class BookingOption(models.Model):
    """A bookable option within an event (e.g. full weekend, day pass)."""

    name = models.CharField(max_length=100, verbose_name=_("Name"))
    description = models.TextField(blank=True, default="", verbose_name=_("Beschreibung"))
    price = models.DecimalField(max_digits=7, decimal_places=2, default=0, verbose_name=_("Preis"))
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="booking_options", verbose_name=_("Event"))
    max_participants = models.IntegerField(
        default=0,
        verbose_name=_("Max. Teilnehmer"),
        help_text=_("0 = unbegrenzt"),
    )
    is_system = models.BooleanField(
        default=False,
        verbose_name=_("System-Option"),
        help_text=_("Automatisch erstellte Option, nicht editierbar"),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Buchungsoption")
        verbose_name_plural = _("Buchungsoptionen")
        ordering = ["price"]
        constraints = [
            models.UniqueConstraint(
                fields=["event"],
                condition=models.Q(is_system=True),
                name="unique_system_booking_option_per_event",
            ),
        ]

    def __str__(self):
        return f"{self.event.name}: {self.name} ({self.price}€)"

    @property
    def current_participant_count(self) -> int:
        return Participant.objects.filter(booking_option=self).count()

    @property
    def is_full(self) -> bool:
        if self.max_participants == 0:
            return False
        return self.current_participant_count >= self.max_participants


# ---------------------------------------------------------------------------
# Person (managed by user, template for participants)
# ---------------------------------------------------------------------------


class Person(models.Model):
    """A person record managed by a user (themselves or family members)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="persons",
        verbose_name=_("Benutzer"),
    )
    scout_name = models.CharField(max_length=100, blank=True, default="", verbose_name=_("Pfadfindername"))
    first_name = models.CharField(max_length=100, verbose_name=_("Vorname"))
    last_name = models.CharField(max_length=100, verbose_name=_("Nachname"))
    address = models.CharField(max_length=200, blank=True, default="", verbose_name=_("Adresse"))
    zip_code = models.CharField(max_length=10, blank=True, default="", verbose_name=_("PLZ"))
    city = models.CharField(max_length=100, blank=True, default="", verbose_name=_("Stadt"))
    email = models.EmailField(blank=True, default="", verbose_name=_("E-Mail"))
    birthday = models.DateField(null=True, blank=True, verbose_name=_("Geburtstag"))
    gender = models.CharField(
        max_length=20,
        choices=GenderChoices.choices,
        default=GenderChoices.NO_ANSWER,
        verbose_name=_("Geschlecht"),
    )
    nutritional_tags = models.ManyToManyField(
        "supply.NutritionalTag",
        blank=True,
        related_name="persons",
        verbose_name=_("Ernährungstags"),
    )
    is_owner = models.BooleanField(default=False, verbose_name=_("Ist Eigentümer"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Person")
        verbose_name_plural = _("Personen")
        ordering = ["-is_owner", "last_name", "first_name"]

    def __str__(self):
        label = f"{self.last_name}, {self.first_name}"
        if self.scout_name:
            label += f" ({self.scout_name})"
        return label


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------


class Registration(models.Model):
    """A user's registration for an event (contains participants)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="event_registrations",
        verbose_name=_("Benutzer"),
    )
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="registrations",
        verbose_name=_("Event"),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Anmeldung")
        verbose_name_plural = _("Anmeldungen")
        unique_together = [("user", "event")]

    def __str__(self):
        return f"{self.event.name}: {self.user}"


# ---------------------------------------------------------------------------
# Participant
# ---------------------------------------------------------------------------


class Participant(models.Model):
    """A participant in an event, cloned from a Person at registration time."""

    registration = models.ForeignKey(
        Registration,
        on_delete=models.CASCADE,
        related_name="participants",
        verbose_name=_("Anmeldung"),
    )
    person = models.ForeignKey(
        Person,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="participations",
        verbose_name=_("Originalperson"),
    )
    booking_option = models.ForeignKey(
        BookingOption,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="participants",
        verbose_name=_("Buchungsoption"),
    )
    # Cloned person data
    scout_name = models.CharField(max_length=100, blank=True, default="", verbose_name=_("Pfadfindername"))
    first_name = models.CharField(max_length=100, verbose_name=_("Vorname"))
    last_name = models.CharField(max_length=100, verbose_name=_("Nachname"))
    address = models.CharField(max_length=200, blank=True, default="", verbose_name=_("Adresse"))
    zip_code = models.CharField(max_length=10, blank=True, default="", verbose_name=_("PLZ"))
    city = models.CharField(max_length=100, blank=True, default="", verbose_name=_("Stadt"))
    email = models.EmailField(blank=True, default="", verbose_name=_("E-Mail"))
    birthday = models.DateField(null=True, blank=True, verbose_name=_("Geburtstag"))
    gender = models.CharField(
        max_length=20,
        choices=GenderChoices.choices,
        default=GenderChoices.NO_ANSWER,
        verbose_name=_("Geschlecht"),
    )
    nutritional_tags = models.ManyToManyField(
        "supply.NutritionalTag",
        blank=True,
        related_name="participants",
        verbose_name=_("Ernährungstags"),
    )
    labels = models.ManyToManyField(
        "event.ParticipantLabel",
        blank=True,
        related_name="participants",
        verbose_name=_("Labels"),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Teilnehmer")
        verbose_name_plural = _("Teilnehmer")
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.last_name}, {self.first_name}"

    @property
    def total_paid(self) -> Decimal:
        """Sum of all payment amounts for this participant."""
        total = self.payments.aggregate(total=models.Sum("amount"))["total"]
        return total or Decimal("0.00")

    @property
    def remaining_amount(self) -> Decimal:
        """Remaining amount to be paid (booking option price minus total paid)."""
        if self.booking_option and self.booking_option.price:
            return max(Decimal("0.00"), self.booking_option.price - self.total_paid)
        return Decimal("0.00")

    @property
    def is_paid(self) -> bool:
        """Whether the participant has fully paid (total_paid >= booking option price)."""
        if self.booking_option and self.booking_option.price:
            return self.total_paid >= self.booking_option.price
        # No booking option or free option — considered paid
        return True

    @classmethod
    def create_from_person(cls, registration, person, booking_option=None):
        """Clone person data into a new participant."""
        participant = cls.objects.create(
            registration=registration,
            person=person,
            booking_option=booking_option,
            scout_name=person.scout_name,
            first_name=person.first_name,
            last_name=person.last_name,
            address=person.address,
            zip_code=person.zip_code,
            city=person.city,
            email=person.email,
            birthday=person.birthday,
            gender=person.gender,
        )
        participant.nutritional_tags.set(person.nutritional_tags.all())
        return participant
