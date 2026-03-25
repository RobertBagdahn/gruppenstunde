"""
Bot-free view logging service.
Checks User-Agent against known bots, deduplicates per session/IP/24h,
and hashes IPs for DSGVO compliance.
"""

import logging
from datetime import timedelta

from django.utils import timezone

from idea.models import Idea, IdeaView

logger = logging.getLogger(__name__)

# Common bot user-agent patterns
BOT_PATTERNS = [
    "bot",
    "crawl",
    "spider",
    "slurp",
    "mediapartners",
    "facebookexternalhit",
    "twitterbot",
    "linkedinbot",
    "whatsapp",
    "telegrambot",
    "googlebot",
    "bingbot",
    "yandex",
    "baidu",
    "duckduckbot",
    "archive.org",
    "semrush",
    "ahrefs",
    "mj12bot",
    "dotbot",
    "petalbot",
    "bytespider",
    "gptbot",
    "chatgpt",
    "claudebot",
    "anthropic",
    "ccbot",
    "applebot",
    "ia_archiver",
    "uptimerobot",
    "pingdom",
    "headlesschrome",
    "phantomjs",
    "python-requests",
    "httpclient",
    "java/",
    "curl",
    "wget",
]


def is_bot(user_agent: str) -> bool:
    """Check if the User-Agent belongs to a known bot."""
    ua_lower = user_agent.lower()
    return any(pattern in ua_lower for pattern in BOT_PATTERNS)


def get_client_ip(request) -> str:
    """Extract client IP from request, respecting X-Forwarded-For."""
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def log_view(request, idea: Idea) -> bool:
    """
    Log a view for an idea if it's not a bot and not a duplicate.

    Returns True if view was logged, False if skipped.
    """
    user_agent = request.META.get("HTTP_USER_AGENT", "")

    # Skip bots
    if is_bot(user_agent):
        return False

    # Get or create session key
    if not request.session.session_key:
        request.session.create()
    session_key = request.session.session_key

    # Hash IP for DSGVO
    client_ip = get_client_ip(request)
    ip_hash = IdeaView.hash_ip(client_ip)

    # Deduplicate: max 1 view per idea per session per 24h
    cutoff = timezone.now() - timedelta(hours=24)
    already_viewed = IdeaView.objects.filter(
        idea=idea,
        session_key=session_key,
        created_at__gte=cutoff,
    ).exists()

    if already_viewed:
        return False

    # Log the view
    IdeaView.objects.create(
        idea=idea,
        session_key=session_key,
        ip_hash=ip_hash,
        user_agent=user_agent[:255],
        user=request.user if request.user.is_authenticated else None,
    )

    # Update cached view count
    Idea.objects.filter(id=idea.id).update(view_count=idea.view_count + 1)

    return True
