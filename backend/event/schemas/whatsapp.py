"""Pydantic schemas for WhatsApp connection and management."""

from datetime import datetime

from ninja import Schema


class WhatsAppConnectIn(Schema):
    """Input for connecting WhatsApp (requires privacy consent)."""

    privacy_consent: bool


class WhatsAppQRResponseOut(Schema):
    """QR code pairing status response."""

    status: str  # "initializing", "pending_qr", "connected", "failed", "timeout"
    qr_code_base64: str | None = None
    phone_number: str | None = None


class WhatsAppConnectionStatusOut(Schema):
    """Full connection status for profile display."""

    is_connected: bool
    phone_number: str | None = None
    connected_since: str | None = None
    total_messages_sent: int = 0


class WhatsAppStatsOut(Schema):
    """WhatsApp message statistics."""

    total_sent: int = 0
    sent_today: int = 0
    sent_this_week: int = 0
    last_sent_at: str | None = None


class MessageTemplateOut(Schema):
    """Output schema for a message template."""

    id: int
    title: str
    subject: str
    body: str
    is_system: bool
    created_at: datetime
    updated_at: datetime


class MessageTemplateCreateIn(Schema):
    """Input for creating a message template."""

    title: str
    subject: str = ""
    body: str


class MessageTemplateUpdateIn(Schema):
    """Input for updating a message template."""

    title: str | None = None
    subject: str | None = None
    body: str | None = None


# ---------------------------------------------------------------------------
# Health Check, Test, Reconnect, Connection Log
# ---------------------------------------------------------------------------


class WhatsAppHealthCheckOut(Schema):
    """Response for active connection health check."""

    is_healthy: bool
    status: str  # "connected", "disconnected", "session_invalid", "error"
    checked_at: str
    message: str


class WhatsAppTestResultOut(Schema):
    """Response for sending a test message to own number."""

    success: bool
    message: str


class WhatsAppReconnectOut(Schema):
    """Response for reconnect attempt."""

    success: bool
    needs_qr: bool
    status: str  # "connected", "pending_qr", "failed"
    message: str


class WhatsAppConnectionLogOut(Schema):
    """Single connection log entry for diagnostics."""

    event_type: str
    message: str
    created_at: str
