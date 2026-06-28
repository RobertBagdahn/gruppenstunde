"""
Email notifications for the planner app.

Notifies users when they are added as collaborators to a meal plan.
"""

import logging

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)

DEFAULT_FROM_EMAIL = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@gruppenstunde.de")
SITE_NAME = "Inspi – gruppenstunde.de"
FRONTEND_URL = getattr(settings, "FRONTEND_URL", "https://gruppenstunde.de")

COLLABORATOR_ROLE_LABELS = {
    "viewer": "Betrachter",
    "editor": "Bearbeiter",
    "admin": "Administrator",
}

_PLATFORM_CI = {
    "ci_group_name": "gruppenstunde.de",
    "ci_primary_color": "#4a3a6b",
    "ci_secondary_color": "#e8e4f0",
    "ci_logo_url": "",
    "ci_slogan": "Die Plattform für Pfadfinder-Gruppenführer",
    "ci_greeting_text": "",
    "ci_footer_text": "",
    "ci_payment_info": "",
    "ci_signature_text": "",
}


def notify_collaborator_added(meal_plan, user, inviter, role: str) -> int:
    """
    Send an email notification when a user is added as a collaborator.

    Returns the number of emails sent (0 or 1).
    """
    if not user.email:
        logger.warning(
            "No email for user %s (%d), skipping notification",
            user.username,
            user.pk,
        )
        return 0

    role_label = COLLABORATOR_ROLE_LABELS.get(role, role)
    inviter_name = inviter.get_full_name() or inviter.username
    plan_url = f"{FRONTEND_URL}/meal-plans/{meal_plan.id}"

    subject = f"[{SITE_NAME}] Einladung zum Essensplan „{meal_plan.name}“"

    context = {
        **_PLATFORM_CI,
        "username": user.username,
        "inviter_name": inviter_name,
        "plan_name": meal_plan.name,
        "role_label": role_label,
        "plan_url": plan_url,
    }

    message_text = (
        f"Hallo {user.username},\n\n"
        f"{inviter_name} hat dich als {role_label} zum Essensplan "
        f"„{meal_plan.name}“ hinzugefügt.\n\n"
        f"Du kannst den Plan unter folgendem Link einsehen:\n{plan_url}"
    )

    html_message = render_to_string(
        "planner/email/collaborator_invited.html",
        context,
    )

    sent = send_mail(
        subject=subject,
        message=message_text,
        from_email=DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_message,
        fail_silently=True,
    )

    logger.info(
        "Collaborator notification sent to %s for meal plan '%s' (role: %s)",
        user.email,
        meal_plan.name,
        role,
    )
    return sent
