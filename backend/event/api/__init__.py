"""Event API package — re-exports all routers for backward compatibility.

Import order matters: participants and day_slots register endpoints on event_router,
so they must be imported after events.py.
"""

from .attendance import *  # noqa: F403 — registers endpoints on event_router
from .budget import *  # noqa: F403 — registers endpoints on event_router
from .checklist import *  # noqa: F403 — registers endpoints on event_router
from .custom_fields import *  # noqa: F403 — registers endpoints on event_router
from .day_slots import *  # noqa: F403 — registers endpoints on event_router
from .events import event_router
from .export import *  # noqa: F403 — registers endpoints on event_router
from .import_data import *  # noqa: F403 — registers endpoints on event_router
from .invitation import *  # noqa: F403 — registers endpoints on event_router
from .labels import *  # noqa: F403 — registers endpoints on event_router
from .locations import location_router
from .mail import *  # noqa: F403 — registers endpoints on event_router
from .meeting_points import meeting_point_router
from .messaging import *  # noqa: F403 — registers endpoints on event_router
from .parent_access import *  # noqa: F403 — registers endpoints on event_router
from .participants import *  # noqa: F403 — registers endpoints on event_router
from .payment import *  # noqa: F403 — registers endpoints on event_router
from .persons import person_router
from .room_assignment import *  # noqa: F403 — registers endpoints on event_router
from .stats import *  # noqa: F403 — registers endpoints on event_router
from .timeline import *  # noqa: F403 — registers endpoints on event_router
from .waitlist import *  # noqa: F403 — registers endpoints on event_router
from .whatsapp import template_router, whatsapp_router

__all__ = [
    "event_router",
    "location_router",
    "meeting_point_router",
    "person_router",
    "template_router",
    "whatsapp_router",
]
