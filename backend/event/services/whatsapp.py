"""WhatsApp client manager and service — neonize integration with lazy imports.

neonize is imported lazily at runtime to avoid protobuf version conflicts
with the Google Cloud SDK at import time. The conflict (neonize needs
protobuf>=7.34, google-cloud-* needs protobuf<7.0) will be resolved
upstream. Until then, all neonize functionality works correctly at runtime
but the import only happens when WhatsApp features are actually used.
"""

from __future__ import annotations

import base64
import hashlib
import io
import logging
import threading
import time
from typing import TYPE_CHECKING, Any

from django.conf import settings
from django.db import connection as django_connection
from django.utils import timezone

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from neonize import NewClient


class NeonizeUnavailableError(Exception):
    """Raised when neonize cannot be imported (protobuf conflict etc.)."""


def _import_neonize():
    """Lazily import neonize. Raises NeonizeUnavailableError on failure."""
    try:
        from neonize import NewClient

        return NewClient
    except ImportError as exc:
        raise NeonizeUnavailableError(
            "neonize ist nicht verfügbar. Bitte prüfe die Installation und Protobuf-Kompatibilität."
        ) from exc


def _build_session_name(user_id: int) -> str:
    """Build a unique neonize session/client name for a user."""
    return f"inspi_wa_user_{user_id}"


def _advisory_lock_id(user_id: int) -> int:
    """Generate a stable advisory lock ID from user_id.

    Uses a hash to avoid collision with other advisory lock users.
    The result is a 32-bit signed integer for pg_try_advisory_lock.
    """
    h = hashlib.md5(f"whatsapp_client_{user_id}".encode()).hexdigest()  # noqa: S324
    return int(h[:8], 16) & 0x7FFFFFFF


class WhatsAppClientManager:
    """Singleton manager for active neonize WhatsApp clients.

    Clients are held in-memory and lazily (re)created from PostgreSQL
    sessions on demand. Advisory locks ensure only one Cloud Run instance
    runs a client for a given user at a time.
    """

    _instance: WhatsAppClientManager | None = None
    _lock = threading.Lock()

    def __new__(cls) -> WhatsAppClientManager:
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._clients: dict[int, Any] = {}
                    cls._instance._client_threads: dict[int, threading.Thread] = {}
                    cls._instance._qr_codes: dict[int, str] = {}
                    cls._instance._statuses: dict[int, str] = {}
        return cls._instance

    def _acquire_advisory_lock(self, user_id: int) -> bool:
        """Try to acquire a PostgreSQL advisory lock for this user's client."""
        lock_id = _advisory_lock_id(user_id)
        with django_connection.cursor() as cursor:
            cursor.execute("SELECT pg_try_advisory_lock(%s)", [lock_id])
            result = cursor.fetchone()
            return result[0] if result else False

    def _release_advisory_lock(self, user_id: int) -> None:
        """Release the PostgreSQL advisory lock for this user's client."""
        lock_id = _advisory_lock_id(user_id)
        with django_connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_unlock(%s)", [lock_id])

    def get_or_create_client(self, user) -> Any:
        """Get an existing client or create one from persisted session.

        Args:
            user: Django User instance.

        Returns:
            neonize NewClient instance.

        Raises:
            NeonizeUnavailableError: If neonize cannot be imported.
            RuntimeError: If advisory lock cannot be acquired.
        """
        user_id = user.id

        # Return cached client if available
        if user_id in self._clients:
            return self._clients[user_id]

        # Try to acquire distributed lock
        if not self._acquire_advisory_lock(user_id):
            raise RuntimeError(
                "WhatsApp-Client wird bereits auf einer anderen Instanz ausgeführt. "
                "Bitte versuche es in einigen Sekunden erneut."
            )

        NewClient = _import_neonize()
        session_name = _build_session_name(user_id)

        client = NewClient(session_name)
        self._clients[user_id] = client
        self._statuses[user_id] = "initializing"

        return client

    def start_client_in_thread(self, user) -> None:
        """Start a neonize client in a daemon thread.

        The client connects and blocks in the thread, handling events.
        """
        import segno as _segno

        from neonize.events import ConnectedEv

        user_id = user.id
        client = self.get_or_create_client(user)

        def _qr_callback(_client: Any, qr_data: bytes) -> None:
            """Called by neonize when a new QR code is generated."""
            # qr_data is raw QR content — render to PNG via segno
            qr_img = _segno.make_qr(qr_data)
            buf = io.BytesIO()
            qr_img.save(buf, kind="png", scale=8, border=2)
            qr_base64 = base64.b64encode(buf.getvalue()).decode("ascii")
            self._qr_codes[user_id] = qr_base64
            self._statuses[user_id] = "pending_qr"
            logger.info("QR code generated for user %s", user_id)

        @client.event(ConnectedEv)
        def _on_connected(_client: Any, event: Any) -> None:
            """Called by neonize when connection is established."""
            from ..models import WhatsAppConnection

            self._statuses[user_id] = "connected"
            self._qr_codes.pop(user_id, None)

            device = getattr(_client, "me", None)
            phone = ""
            if device:
                # client.me is a Device protobuf with .JID (a JID protobuf)
                device_jid = getattr(device, "JID", None)
                if device_jid:
                    phone = getattr(device_jid, "User", "") or ""
                if not phone:
                    # Fallback: try Device.User directly
                    phone = getattr(device, "User", "") or ""
            phone = phone[:255]

            # Update or create connection record
            WhatsAppConnection.objects.update_or_create(
                user=user,
                defaults={
                    "phone_number": phone,
                    "session_db_name": _build_session_name(user_id),
                    "connected_at": timezone.now(),
                    "is_active": True,
                },
            )
            logger.info("WhatsApp connected for user %s", user_id)

        # Register QR callback via neonize's decorator API
        client.qr(_qr_callback)

        def _run() -> None:
            try:
                client.connect()
            except Exception:
                logger.exception("neonize client error for user %s", user_id)
                self._statuses[user_id] = "failed"
                self._cleanup_client(user_id)

        thread = threading.Thread(target=_run, daemon=True, name=f"wa-client-{user_id}")
        thread.start()
        self._client_threads[user_id] = thread

    def get_qr_code(self, user) -> tuple[str, str | None]:
        """Get current QR status and code for a user.

        Returns:
            Tuple of (status, qr_code_base64_or_none).
        """
        user_id = user.id
        status = self._statuses.get(user_id, "disconnected")
        qr_code = self._qr_codes.get(user_id)
        return status, qr_code

    def get_status(self, user) -> str:
        """Get connection status for a user."""
        user_id = user.id
        return self._statuses.get(user_id, "disconnected")

    def disconnect_client(self, user) -> None:
        """Disconnect a user's WhatsApp client."""
        from ..models import WhatsAppConnection

        user_id = user.id
        client = self._clients.get(user_id)

        if client:
            try:
                client.disconnect()
            except Exception:
                logger.exception("Error disconnecting client for user %s", user_id)

        self._cleanup_client(user_id)

        # Mark connection as inactive in DB
        WhatsAppConnection.objects.filter(user=user).update(is_active=False)

    def delete_client(self, user) -> None:
        """Disconnect and delete all WhatsApp data for a user.

        Includes neonize session tables in PostgreSQL.
        """
        from ..models import WhatsAppConnection, WhatsAppMessage

        user_id = user.id

        # Disconnect first
        self.disconnect_client(user)

        # Delete neonize session data from PostgreSQL
        session_name = _build_session_name(user_id)
        self._delete_neonize_session(session_name)

        # Delete Django model data
        WhatsAppMessage.objects.filter(connection__user=user).delete()
        WhatsAppConnection.objects.filter(user=user).delete()

        # Release advisory lock
        self._release_advisory_lock(user_id)

    def send_message(self, user, jid: str, text: str) -> None:
        """Send a text message via a user's WhatsApp client.

        Args:
            user: Django User instance.
            jid: WhatsApp JID (e.g. "4917012345678@s.whatsapp.net").
            text: Message text (WhatsApp-native formatting supported).

        Raises:
            RuntimeError: If client is not connected or send times out.
        """
        import concurrent.futures

        user_id = user.id
        client = self._clients.get(user_id)

        if not client or self._statuses.get(user_id) != "connected":
            # Try to reconnect from persisted session
            client = self.get_or_create_client(user)
            self.start_client_in_thread(user)

            # Poll for up to 5 seconds for reconnection
            for _ in range(10):
                time.sleep(0.5)
                if self._statuses.get(user_id) == "connected":
                    break

        if self._statuses.get(user_id) != "connected":
            raise RuntimeError("WhatsApp ist nicht verbunden. Bitte zuerst verbinden.")

        # neonize send_message expects a JID protobuf object, not a plain string
        from neonize.utils import build_jid

        parts = jid.split("@", 1)
        jid_obj = build_jid(parts[0], parts[1] if len(parts) > 1 else "s.whatsapp.net")

        # Use a timeout to prevent indefinite blocking
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(client.send_message, jid_obj, text)
            try:
                future.result(timeout=30)
            except concurrent.futures.TimeoutError:
                raise RuntimeError(
                    "WhatsApp-Nachricht konnte nicht gesendet werden (Timeout nach 30s)."
                )

    def is_on_whatsapp(self, user, phone_numbers: list[str]) -> dict[str, bool]:
        """Check which phone numbers are registered on WhatsApp.

        Args:
            user: Django User instance.
            phone_numbers: List of phone numbers in international format.

        Returns:
            Dict mapping phone_number -> is_on_whatsapp.
        """
        user_id = user.id
        client = self._clients.get(user_id)

        if not client or self._statuses.get(user_id) != "connected":
            # Return unknown for all if not connected
            return {num: False for num in phone_numbers}

        try:
            results = client.is_on_whatsapp(phone_numbers)
            return {r.query: r.is_in for r in results}
        except Exception:
            logger.exception("is_on_whatsapp check failed for user %s", user_id)
            return {num: False for num in phone_numbers}

    def _cleanup_client(self, user_id: int) -> None:
        """Remove client from in-memory caches."""
        self._clients.pop(user_id, None)
        self._client_threads.pop(user_id, None)
        self._qr_codes.pop(user_id, None)
        self._statuses.pop(user_id, None)

    @staticmethod
    def _delete_neonize_session(session_name: str) -> None:
        """Delete neonize session tables/rows from PostgreSQL.

        neonize stores session data in its own tables. We clean them
        by client name/namespace.
        """
        with django_connection.cursor() as cursor:
            # neonize uses tables like: {name}_keys, {name}_sessions, etc.
            # The exact table names depend on neonize version.
            # We attempt to delete from known table patterns.
            for suffix in ["_keys", "_sessions", "_pre_keys", "_sender_keys", "_identity", "_contacts", "_chats"]:
                table_name = f"{session_name}{suffix}"
                try:
                    cursor.execute(
                        f"DROP TABLE IF EXISTS {table_name} CASCADE"  # noqa: S608
                    )
                except Exception:
                    logger.debug("Could not drop table %s (may not exist)", table_name)


class WhatsAppService:
    """High-level WhatsApp service for event messaging.

    Uses WhatsAppClientManager for client lifecycle and provides
    business-logic methods (rate limiting, timeline logging, etc.).
    """

    # Test message rate limit: max 1 per 60 seconds per user
    _test_message_timestamps: dict[int, float] = {}

    def __init__(self) -> None:
        self._manager = WhatsAppClientManager()

    # ------------------------------------------------------------------
    # Connection log helper
    # ------------------------------------------------------------------

    @staticmethod
    def _log_event(user, event_type: str, message: str = "") -> None:
        """Create a WhatsAppConnectionLog entry with auto-cleanup (max 50 per user)."""
        from ..models import WhatsAppConnection, WhatsAppConnectionLog

        conn = WhatsAppConnection.objects.filter(user=user).first()
        if not conn:
            return

        WhatsAppConnectionLog.objects.create(
            connection=conn,
            event_type=event_type,
            message=message,
        )

        # Auto-cleanup: keep max 50 entries per connection
        log_count = WhatsAppConnectionLog.objects.filter(connection=conn).count()
        if log_count > 50:
            oldest_ids = (
                WhatsAppConnectionLog.objects.filter(connection=conn)
                .order_by("created_at")
                .values_list("id", flat=True)[: log_count - 50]
            )
            WhatsAppConnectionLog.objects.filter(id__in=list(oldest_ids)).delete()

    # ------------------------------------------------------------------
    # Existing methods (with logging additions)
    # ------------------------------------------------------------------

    def connect(self, user) -> dict[str, Any]:
        """Start WhatsApp connection flow for a user.

        Returns initial QR status/code.
        """
        from ..models import WhatsAppConnection

        # Check if already connected
        existing = WhatsAppConnection.objects.filter(user=user, is_active=True).first()
        if existing:
            raise RuntimeError("WhatsApp ist bereits verbunden. Bitte zuerst trennen.")

        self._manager.start_client_in_thread(user)
        status, qr_code = self._manager.get_qr_code(user)

        self._log_event(user, "connected", "Verbindungsaufbau gestartet")

        return {
            "status": status,
            "qr_code_base64": qr_code,
            "phone_number": None,
        }

    def disconnect(self, user) -> None:
        """Disconnect WhatsApp for a user."""
        self._manager.disconnect_client(user)
        self._log_event(user, "disconnected", "Verbindung manuell getrennt")

    def delete_data(self, user) -> None:
        """Delete all WhatsApp data for a user (irreversible).

        Also deletes connection logs.
        """
        from ..models import WhatsAppConnection, WhatsAppConnectionLog

        # Delete logs before deleting connection (FK cascade would handle it,
        # but let's be explicit)
        conn = WhatsAppConnection.objects.filter(user=user).first()
        if conn:
            WhatsAppConnectionLog.objects.filter(connection=conn).delete()

        self._manager.delete_client(user)

    def get_qr_status(self, user) -> dict[str, Any]:
        """Get current QR pairing status."""
        from ..models import WhatsAppConnection

        status, qr_code = self._manager.get_qr_code(user)
        phone_number = None

        if status == "connected":
            conn = WhatsAppConnection.objects.filter(user=user).first()
            if conn:
                phone_number = conn.phone_number

        return {
            "status": status,
            "qr_code_base64": qr_code,
            "phone_number": phone_number,
        }

    def get_connection_status(self, user) -> dict[str, Any]:
        """Get full connection status for profile display."""
        from ..models import WhatsAppConnection

        conn = WhatsAppConnection.objects.filter(user=user).first()
        if not conn:
            return {
                "is_connected": False,
                "phone_number": None,
                "connected_since": None,
                "total_messages_sent": 0,
            }

        return {
            "is_connected": conn.is_active,
            "phone_number": conn.phone_number,
            "connected_since": conn.connected_at.isoformat() if conn.connected_at else None,
            "total_messages_sent": conn.total_messages_sent,
        }

    def get_stats(self, user) -> dict[str, Any]:
        """Get message statistics for a user's WhatsApp connection."""
        from ..models import WhatsAppConnection, WhatsAppMessage

        conn = WhatsAppConnection.objects.filter(user=user).first()
        if not conn:
            return {
                "total_sent": 0,
                "sent_today": 0,
                "sent_this_week": 0,
                "last_sent_at": None,
            }

        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timezone.timedelta(days=today_start.weekday())

        messages = WhatsAppMessage.objects.filter(connection=conn, status="sent")

        last_msg = messages.order_by("-sent_at").first()

        return {
            "total_sent": conn.total_messages_sent,
            "sent_today": messages.filter(sent_at__gte=today_start).count(),
            "sent_this_week": messages.filter(sent_at__gte=week_start).count(),
            "last_sent_at": last_msg.sent_at.isoformat() if last_msg and last_msg.sent_at else None,
        }

    def check_whatsapp_availability(self, user, phone_numbers: list[str]) -> dict[str, bool]:
        """Check which phone numbers are on WhatsApp.

        Returns dict mapping phone_number -> is_available.
        """
        return self._manager.is_on_whatsapp(user, phone_numbers)

    def send_to_participant(
        self,
        user,
        event,
        participant,
        text: str,
    ) -> dict[str, Any]:
        """Send a WhatsApp message to a single participant.

        Handles rate-limiting, JID building, message logging, and
        connection counter updates.

        Returns:
            Dict with "success", "error" keys.
        """
        from ..models import WhatsAppConnection, WhatsAppMessage

        # Check rate limit
        conn = WhatsAppConnection.objects.filter(user=user, is_active=True).first()
        if not conn:
            return {"success": False, "error": "WhatsApp ist nicht verbunden."}

        if not self._check_rate_limit(conn):
            return {
                "success": False,
                "error": "Nachrichtenlimit erreicht (50/Stunde). Bitte warte etwas.",
            }

        # Get phone number
        phone = participant.phone_number
        if not phone:
            return {"success": False, "error": "Keine Telefonnummer hinterlegt."}

        # Build JID (strip leading + and non-digit chars, add @s.whatsapp.net)
        digits = "".join(c for c in phone if c.isdigit())
        jid = f"{digits}@s.whatsapp.net"

        # Create message log entry
        msg = WhatsAppMessage.objects.create(
            connection=conn,
            event=event,
            participant=participant,
            status="pending",
        )

        try:
            self._manager.send_message(user, jid, text)
            msg.status = "sent"
            msg.sent_at = timezone.now()
            msg.save(update_fields=["status", "sent_at"])

            # Update counter
            conn.total_messages_sent += 1
            conn.save(update_fields=["total_messages_sent"])

            return {"success": True, "error": ""}

        except Exception as exc:
            logger.warning(
                "WhatsApp send failed for participant %s: %s",
                participant.id,
                exc,
            )
            msg.status = "failed"
            msg.error_message = str(exc)
            msg.save(update_fields=["status", "error_message"])

            return {"success": False, "error": str(exc)}

    def _check_rate_limit(self, conn) -> bool:
        """Check if the connection is within the hourly rate limit."""
        from ..models import WhatsAppMessage

        rate_limit = getattr(settings, "WHATSAPP_RATE_LIMIT_PER_HOUR", 50)
        one_hour_ago = timezone.now() - timezone.timedelta(hours=1)

        recent_count = WhatsAppMessage.objects.filter(
            connection=conn,
            status="sent",
            sent_at__gte=one_hour_ago,
        ).count()

        return recent_count < rate_limit

    # ------------------------------------------------------------------
    # New methods: Health Check, Test Message, Reconnect, Logs
    # ------------------------------------------------------------------

    def health_check(self, user) -> dict[str, Any]:
        """Actively verify the WhatsApp connection against the neonize client.

        Attempts to reconnect from persisted session if client is not in memory.
        Updates is_active and last_health_check_at accordingly.
        """
        from ..models import WhatsAppConnection

        conn = WhatsAppConnection.objects.filter(user=user).first()
        now = timezone.now()

        if not conn:
            return {
                "is_healthy": False,
                "status": "disconnected",
                "checked_at": now.isoformat(),
                "message": "Keine WhatsApp-Verbindung vorhanden",
            }

        # Check in-memory status first
        in_memory_status = self._manager.get_status(user)

        if in_memory_status == "connected":
            # Client is in memory and reports connected
            conn.last_health_check_at = now
            conn.is_active = True
            conn.save(update_fields=["last_health_check_at", "is_active"])
            self._log_event(user, "health_check_ok", "Verbindung aktiv")
            return {
                "is_healthy": True,
                "status": "connected",
                "checked_at": now.isoformat(),
                "message": "WhatsApp-Verbindung ist aktiv",
            }

        # Client not in memory or not connected — try to recreate from session
        try:
            self._manager.get_or_create_client(user)
            self._manager.start_client_in_thread(user)

            # Poll for up to 5 seconds to see if session reconnect works
            for _ in range(10):
                time.sleep(0.5)
                status = self._manager.get_status(user)
                if status == "connected":
                    conn.last_health_check_at = now
                    conn.is_active = True
                    conn.save(update_fields=["last_health_check_at", "is_active"])
                    self._log_event(user, "health_check_ok", "Verbindung wiederhergestellt")
                    return {
                        "is_healthy": True,
                        "status": "connected",
                        "checked_at": now.isoformat(),
                        "message": "WhatsApp-Verbindung wiederhergestellt",
                    }

            # Session reconnect didn't work — mark as invalid
            conn.is_active = False
            conn.last_health_check_at = now
            conn.save(update_fields=["is_active", "last_health_check_at"])
            self._log_event(user, "health_check_failed", "Session ungueltig")
            return {
                "is_healthy": False,
                "status": "session_invalid",
                "checked_at": now.isoformat(),
                "message": "WhatsApp-Session ist nicht mehr gueltig. Bitte erneut verbinden.",
            }

        except (NeonizeUnavailableError, RuntimeError) as exc:
            conn.is_active = False
            conn.last_health_check_at = now
            conn.save(update_fields=["is_active", "last_health_check_at"])
            self._log_event(user, "health_check_failed", str(exc))
            return {
                "is_healthy": False,
                "status": "error",
                "checked_at": now.isoformat(),
                "message": str(exc),
            }

    def send_test_message(self, user) -> dict[str, Any]:
        """Send a test WhatsApp message to the user's own phone number.

        Enforces a 1-per-minute rate limit separate from the regular rate limit.
        Does NOT count against the regular message rate limit.
        """
        from ..models import WhatsAppConnection, WhatsAppMessage

        conn = WhatsAppConnection.objects.filter(user=user, is_active=True).first()
        if not conn:
            return {
                "success": False,
                "message": "WhatsApp ist nicht verbunden. Bitte zuerst verbinden.",
            }

        if not conn.phone_number:
            return {
                "success": False,
                "message": "Keine Telefonnummer gespeichert.",
            }

        # Check test rate limit (1 per 60 seconds)
        user_id = user.id
        last_test = self._test_message_timestamps.get(user_id, 0)
        if time.time() - last_test < 60:
            return {
                "success": False,
                "message": "Bitte warte eine Minute zwischen Test-Nachrichten.",
            }

        # Build JID from own phone number (stored as plain digits)
        phone = conn.phone_number.strip()
        # Sanitize: only keep leading digits (avoid protobuf text remnants)
        digits = ""
        for c in phone:
            if c.isdigit():
                digits += c
            elif digits:
                break  # stop at first non-digit after digits started
        if not digits:
            return {
                "success": False,
                "message": "Ungueltige Telefonnummer gespeichert. Bitte neu verbinden.",
            }
        jid = f"{digits}@s.whatsapp.net"

        test_text = "Inspi WhatsApp-Test: Deine Verbindung funktioniert!"

        # Create message log entry (no event, no participant — test message)
        msg = WhatsAppMessage.objects.create(
            connection=conn,
            event=None,
            participant=None,
            status="pending",
        )

        try:
            self._manager.send_message(user, jid, test_text)
            msg.status = "sent"
            msg.sent_at = timezone.now()
            msg.save(update_fields=["status", "sent_at"])

            self._test_message_timestamps[user_id] = time.time()
            self._log_event(user, "test_sent", "Test-Nachricht erfolgreich gesendet")

            return {
                "success": True,
                "message": "Test-Nachricht erfolgreich gesendet",
            }

        except Exception as exc:
            logger.warning("WhatsApp test message failed for user %s: %s", user.id, exc)
            msg.status = "failed"
            msg.error_message = str(exc)
            msg.save(update_fields=["status", "error_message"])

            self._log_event(user, "test_failed", str(exc))
            return {
                "success": False,
                "message": f"Test fehlgeschlagen: {exc}",
            }

    def reconnect(self, user) -> dict[str, Any]:
        """Attempt to reconnect the WhatsApp session without a new QR code.

        Falls back to QR pairing if the persisted session is invalid.
        """
        from ..models import WhatsAppConnection

        conn = WhatsAppConnection.objects.filter(user=user).first()

        # Check if already connected
        in_memory_status = self._manager.get_status(user)
        if in_memory_status == "connected":
            if conn:
                conn.is_active = True
                conn.save(update_fields=["is_active"])
            self._log_event(user, "reconnect_success", "Bereits verbunden")
            return {
                "success": True,
                "needs_qr": False,
                "status": "connected",
                "message": "WhatsApp ist bereits verbunden",
            }

        try:
            # Clean up any stale client state
            self._manager._cleanup_client(user.id)

            # Start fresh client from persisted session
            self._manager.start_client_in_thread(user)

            # Poll for up to 10 seconds
            for _ in range(20):
                time.sleep(0.5)
                status = self._manager.get_status(user)
                if status == "connected":
                    if conn:
                        conn.is_active = True
                        conn.save(update_fields=["is_active"])
                    self._log_event(user, "reconnect_success", "Session wiederhergestellt")
                    return {
                        "success": True,
                        "needs_qr": False,
                        "status": "connected",
                        "message": "WhatsApp erfolgreich wiederverbunden",
                    }
                if status == "pending_qr":
                    # Session is invalid, needs new QR pairing
                    self._log_event(user, "reconnect_failed", "Neuer QR-Code erforderlich")
                    return {
                        "success": False,
                        "needs_qr": True,
                        "status": "pending_qr",
                        "message": "Session abgelaufen. Bitte erneut per QR-Code verbinden.",
                    }

            # Timeout — probably needs QR
            self._log_event(user, "reconnect_failed", "Timeout bei Reconnect")
            return {
                "success": False,
                "needs_qr": True,
                "status": "pending_qr",
                "message": "Reconnect-Timeout. Bitte per QR-Code verbinden.",
            }

        except (NeonizeUnavailableError, RuntimeError) as exc:
            self._log_event(user, "reconnect_failed", str(exc))
            return {
                "success": False,
                "needs_qr": False,
                "status": "failed",
                "message": str(exc),
            }

    def get_connection_logs(self, user) -> list[dict[str, Any]]:
        """Return the last 10 connection log entries for a user."""
        from ..models import WhatsAppConnection, WhatsAppConnectionLog

        conn = WhatsAppConnection.objects.filter(user=user).first()
        if not conn:
            return []

        logs = WhatsAppConnectionLog.objects.filter(connection=conn).order_by("-created_at")[:10]

        return [
            {
                "event_type": log.event_type,
                "message": log.message,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ]
