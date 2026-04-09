"""Mail schemas for event participant emails."""

from pydantic import BaseModel


class MailFilterIn(BaseModel):
    """Optional filters for mail recipients."""

    is_paid: bool | None = None
    booking_option_id: int | None = None
    label_id: int | None = None


class MailCreateIn(BaseModel):
    """Input for sending a mail to event participants."""

    subject: str
    body: str
    recipient_type: str  # "all", "filtered", "selected"
    filters: MailFilterIn | None = None
    participant_ids: list[int] | None = None


class FailedRecipientOut(BaseModel):
    """A single failed mail recipient."""

    participant_id: int
    email: str
    error: str


class MailResultOut(BaseModel):
    """Result of a mail sending operation."""

    sent_count: int
    failed_count: int
    failed_recipients: list[FailedRecipientOut]
