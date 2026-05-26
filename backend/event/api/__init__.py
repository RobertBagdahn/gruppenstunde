"""Event API package — re-exports all routers for backward compatibility.

Import order matters: participants and day_slots register endpoints on event_router,
so they must be imported after events.py.
"""

from .events import event_router  # noqa: F401 — main event router
from .participants import *  # noqa: F401, F403 — registers endpoints on event_router
from .day_slots import *  # noqa: F401, F403 — registers endpoints on event_router
from .timeline import *  # noqa: F401, F403 — registers endpoints on event_router
from .payment import *  # noqa: F401, F403 — registers endpoints on event_router
from .custom_fields import *  # noqa: F401, F403 — registers endpoints on event_router
from .labels import *  # noqa: F401, F403 — registers endpoints on event_router
from .export import *  # noqa: F401, F403 — registers endpoints on event_router
from .mail import *  # noqa: F401, F403 — registers endpoints on event_router
from .stats import *  # noqa: F401, F403 — registers endpoints on event_router
from .invitation import *  # noqa: F401, F403 — registers endpoints on event_router
from .checklist import *  # noqa: F401, F403 — registers endpoints on event_router
from .waitlist import *  # noqa: F401, F403 — registers endpoints on event_router
from .attendance import *  # noqa: F401, F403 — registers endpoints on event_router
from .room_assignment import *  # noqa: F401, F403 — registers endpoints on event_router
from .parent_access import *  # noqa: F401, F403 — registers endpoints on event_router
from .budget import *  # noqa: F401, F403 — registers endpoints on event_router
from .import_data import *  # noqa: F401, F403 — registers endpoints on event_router
from .messaging import *  # noqa: F401, F403 — registers endpoints on event_router
from .persons import person_router  # noqa: F401 — person CRUD router
from .locations import location_router  # noqa: F401 — location CRUD router
from .meeting_points import meeting_point_router  # noqa: F401 — meeting point CRUD router
from .whatsapp import template_router, whatsapp_router  # noqa: F401 — WhatsApp routers

__all__ = [
    "event_router",
    "location_router",
    "meeting_point_router",
    "person_router",
    "template_router",
    "whatsapp_router",
]
