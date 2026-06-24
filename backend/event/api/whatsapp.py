"""WhatsApp connection API — profile-level endpoints for managing WhatsApp."""

from ninja import Router
from ninja.errors import HttpError

from event.models import WhatsAppConnection
from event.schemas.whatsapp import (
    MessageTemplateCreateIn,
    MessageTemplateOut,
    MessageTemplateUpdateIn,
    WhatsAppConnectIn,
    WhatsAppConnectionLogOut,
    WhatsAppConnectionStatusOut,
    WhatsAppHealthCheckOut,
    WhatsAppQRResponseOut,
    WhatsAppReconnectOut,
    WhatsAppStatsOut,
    WhatsAppTestResultOut,
)
from event.services.whatsapp import WhatsAppService

from .helpers import require_auth

whatsapp_router = Router(tags=["WhatsApp"])

_wa_service = WhatsAppService()


# ---------------------------------------------------------------------------
# Connection Management
# ---------------------------------------------------------------------------


@whatsapp_router.post("/connect/", response=WhatsAppQRResponseOut)
def connect(request, payload: WhatsAppConnectIn):
    """Start WhatsApp QR code pairing flow."""
    require_auth(request)

    if not payload.privacy_consent:
        raise HttpError(400, "Datenschutz-Einwilligung ist erforderlich.")

    # Store consent timestamp
    from django.utils import timezone

    conn, _ = WhatsAppConnection.objects.get_or_create(user=request.user)
    if not conn.privacy_consent_given_at:
        conn.privacy_consent_given_at = timezone.now()
        conn.save(update_fields=["privacy_consent_given_at"])

    try:
        result = _wa_service.connect(request.user)
    except RuntimeError as exc:
        raise HttpError(400, str(exc))

    return result


@whatsapp_router.get("/qr-status/", response=WhatsAppQRResponseOut)
def qr_status(request):
    """Poll for QR code pairing status (call every 2s from frontend)."""
    require_auth(request)
    return _wa_service.get_qr_status(request.user)


@whatsapp_router.post("/disconnect/")
def disconnect(request):
    """Disconnect WhatsApp session."""
    require_auth(request)
    _wa_service.disconnect(request.user)
    return {"success": True}


@whatsapp_router.get("/status/", response=WhatsAppConnectionStatusOut)
def status(request):
    """Get current WhatsApp connection status."""
    require_auth(request)
    return _wa_service.get_connection_status(request.user)


@whatsapp_router.delete("/delete/")
def delete(request):
    """Delete all WhatsApp data (irreversible)."""
    require_auth(request)
    _wa_service.delete_data(request.user)
    return {"success": True}


@whatsapp_router.get("/stats/", response=WhatsAppStatsOut)
def stats(request):
    """Get WhatsApp message statistics."""
    require_auth(request)
    return _wa_service.get_stats(request.user)


@whatsapp_router.post("/health-check/", response=WhatsAppHealthCheckOut)
def health_check(request):
    """Actively verify the WhatsApp connection against the neonize session."""
    require_auth(request)
    return _wa_service.health_check(request.user)


@whatsapp_router.post("/test/", response=WhatsAppTestResultOut)
def test_message(request):
    """Send a test WhatsApp message to the user's own phone number."""
    require_auth(request)
    return _wa_service.send_test_message(request.user)


@whatsapp_router.post("/reconnect/", response=WhatsAppReconnectOut)
def reconnect(request):
    """Attempt to reconnect WhatsApp session without new QR code."""
    require_auth(request)
    return _wa_service.reconnect(request.user)


@whatsapp_router.get("/logs/", response=list[WhatsAppConnectionLogOut])
def connection_logs(request):
    """Get the last 10 WhatsApp connection events for diagnostics."""
    require_auth(request)
    return _wa_service.get_connection_logs(request.user)


# ---------------------------------------------------------------------------
# Message Templates (user-scoped, not event-scoped)
# ---------------------------------------------------------------------------

template_router = Router(tags=["Message Templates"])


@template_router.get("/", response=list[MessageTemplateOut])
def list_templates(request):
    """List all message templates (system + user's own)."""
    require_auth(request)

    from event.models import MessageTemplate

    templates = MessageTemplate.objects.filter(user__isnull=True) | MessageTemplate.objects.filter(  # system templates
        user=request.user  # user's own templates
    )
    return list(templates.order_by("-is_system", "title"))


@template_router.post("/", response=MessageTemplateOut)
def create_template(request, payload: MessageTemplateCreateIn):
    """Create a new user message template."""
    require_auth(request)

    from event.models import MessageTemplate

    template = MessageTemplate.objects.create(
        user=request.user,
        title=payload.title,
        subject=payload.subject,
        body=payload.body,
        is_system=False,
    )
    return template


@template_router.put("/{template_id}/", response=MessageTemplateOut)
def update_template(request, template_id: int, payload: MessageTemplateUpdateIn):
    """Update a user message template. System templates cannot be modified."""
    require_auth(request)

    from event.models import MessageTemplate

    try:
        template = MessageTemplate.objects.get(id=template_id, user=request.user, is_system=False)
    except MessageTemplate.DoesNotExist:
        raise HttpError(404, "Vorlage nicht gefunden oder nicht bearbeitbar.")

    if payload.title is not None:
        template.title = payload.title
    if payload.subject is not None:
        template.subject = payload.subject
    if payload.body is not None:
        template.body = payload.body

    template.save()
    return template


@template_router.delete("/{template_id}/")
def delete_template(request, template_id: int):
    """Delete a user message template. System templates cannot be deleted."""
    require_auth(request)

    from event.models import MessageTemplate

    try:
        template = MessageTemplate.objects.get(id=template_id, user=request.user, is_system=False)
    except MessageTemplate.DoesNotExist:
        raise HttpError(404, "Vorlage nicht gefunden oder nicht löschbar.")

    template.delete()
    return {"success": True}
