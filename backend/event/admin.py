from django.contrib import admin

from .models import (
    BookingOption,
    CustomField,
    CustomFieldValue,
    Event,
    EventLocation,
    Participant,
    ParticipantLabel,
    Payment,
    Person,
    Registration,
    TimelineEntry,
)


@admin.register(EventLocation)
class EventLocationAdmin(admin.ModelAdmin):
    list_display = ["name", "city", "zip_code", "created_at"]
    search_fields = ["name", "city", "street"]
    list_per_page = 25


class BookingOptionInline(admin.TabularInline):
    model = BookingOption
    extra = 1


class ParticipantInline(admin.TabularInline):
    model = Participant
    extra = 0
    readonly_fields = ["person", "created_at", "is_paid"]
    fields = [
        "first_name",
        "last_name",
        "scout_name",
        "booking_option",
        "is_paid",
        "gender",
        "email",
        "birthday",
        "person",
        "created_at",
    ]


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "start_date", "end_date", "is_public", "created_at"]
    list_filter = ["is_public", "start_date"]
    search_fields = ["name", "description"]
    prepopulated_fields = {"slug": ("name",)}
    filter_horizontal = ["responsible_persons", "invited_users", "invited_groups"]
    inlines = [BookingOptionInline]
    list_per_page = 25


@admin.register(BookingOption)
class BookingOptionAdmin(admin.ModelAdmin):
    list_display = ["name", "event", "price", "max_participants"]
    list_filter = ["event"]
    search_fields = ["name"]
    list_per_page = 25


@admin.register(Person)
class PersonAdmin(admin.ModelAdmin):
    list_display = ["last_name", "first_name", "scout_name", "user", "gender"]
    list_filter = ["gender"]
    search_fields = ["first_name", "last_name", "scout_name", "user__email"]
    raw_id_fields = ["user"]
    filter_horizontal = ["nutritional_tags"]
    list_per_page = 25


@admin.register(Registration)
class RegistrationAdmin(admin.ModelAdmin):
    list_display = ["event", "user", "participant_count", "created_at"]
    list_filter = ["event"]
    search_fields = ["user__email", "event__name"]
    raw_id_fields = ["user"]
    inlines = [ParticipantInline]
    list_per_page = 25

    @admin.display(description="Teilnehmer")
    def participant_count(self, obj):
        return obj.participants.count()


@admin.register(Participant)
class ParticipantAdmin(admin.ModelAdmin):
    list_display = [
        "last_name",
        "first_name",
        "event_name",
        "booking_option",
        "is_paid",
        "gender",
    ]
    list_filter = ["gender", "registration__event"]
    search_fields = ["first_name", "last_name", "email"]
    raw_id_fields = ["registration", "person", "booking_option"]
    filter_horizontal = ["nutritional_tags", "labels"]
    list_per_page = 25

    @admin.display(description="Event")
    def event_name(self, obj):
        return obj.registration.event.name


@admin.register(TimelineEntry)
class TimelineEntryAdmin(admin.ModelAdmin):
    list_display = ["event", "action_type", "participant", "user", "created_at"]
    list_filter = ["action_type", "event"]
    search_fields = ["description"]
    raw_id_fields = ["event", "participant", "user"]
    readonly_fields = ["created_at"]
    list_per_page = 50


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["participant", "amount", "method", "received_at", "created_by", "created_at"]
    list_filter = ["method", "participant__registration__event"]
    search_fields = ["participant__first_name", "participant__last_name", "note"]
    raw_id_fields = ["participant", "created_by"]
    readonly_fields = ["created_at"]
    list_per_page = 25


@admin.register(CustomField)
class CustomFieldAdmin(admin.ModelAdmin):
    list_display = ["label", "event", "field_type", "is_required", "sort_order"]
    list_filter = ["field_type", "is_required", "event"]
    search_fields = ["label"]
    list_per_page = 25


class CustomFieldValueInline(admin.TabularInline):
    model = CustomFieldValue
    extra = 0


@admin.register(ParticipantLabel)
class ParticipantLabelAdmin(admin.ModelAdmin):
    list_display = ["name", "event", "color", "created_at"]
    list_filter = ["event"]
    search_fields = ["name"]
    list_per_page = 25
