"""Pydantic schemas for unified event messaging (email + WhatsApp)."""

from ninja import Schema


class MessageFilterIn(Schema):
    """Optional filters for message recipients."""

    is_paid: bool | None = None
    booking_option_id: int | None = None
    label_id: int | None = None


class SendMessageIn(Schema):
    """Input for previewing or sending a message."""

    channel: str  # "email" or "whatsapp"
    subject: str = ""  # only for email
    body: str
    recipient_type: str  # "all", "filtered", "selected"
    filters: MessageFilterIn | None = None
    participant_ids: list[int] | None = None
    template_id: int | None = None


class RecipientPreviewOut(Schema):
    """A single recipient in the preview list."""

    participant_id: int
    name: str
    contact: str  # masked email or phone
    whatsapp_status: str  # "available", "unavailable", "no_phone", "no_contact", "not_applicable", "unknown"


class MessagePreviewOut(Schema):
    """Preview of a message before sending."""

    recipients: list[RecipientPreviewOut]
    total_count: int
    reachable_count: int
    unreachable_count: int
    channel: str
    sample_message: str


class FailedRecipientOut(Schema):
    """A single failed message recipient."""

    participant_id: int
    phone_number: str = ""
    email: str = ""
    error: str


class SendMessageResultOut(Schema):
    """Result of a message sending operation."""

    sent_count: int
    failed_count: int
    failed_recipients: list[FailedRecipientOut]
