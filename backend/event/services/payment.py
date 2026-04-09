"""PaymentService — handles payment creation with automatic timeline logging."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from django.contrib.auth.models import User
from django.db import models

from ..choices import TimelineActionChoices
from ..models.payment import Payment
from .timeline import TimelineService


class PaymentService:
    """Provides payment operations with integrated timeline logging."""

    @staticmethod
    def create_payment(
        participant: models.Model,
        amount: Decimal,
        method: str,
        received_at: datetime,
        created_by: User | None = None,
        location: str = "",
        note: str = "",
    ) -> Payment:
        """Create a payment for a participant and log it in the timeline.

        Args:
            participant: The Participant instance.
            amount: Payment amount.
            method: One of PaymentMethodChoices values.
            received_at: When the payment was received.
            created_by: User who recorded the payment.
            location: Where the payment was received.
            note: Optional note.

        Returns:
            The created Payment instance.
        """
        payment = Payment.objects.create(
            participant=participant,
            amount=amount,
            method=method,
            received_at=received_at,
            created_by=created_by,
            location=location,
            note=note,
        )

        # Log timeline entry
        event = participant.registration.event
        description = f"{participant.first_name} {participant.last_name}: {amount}€ ({payment.get_method_display()})"
        TimelineService.log(
            event=event,
            action_type=TimelineActionChoices.PAYMENT_RECEIVED,
            description=description,
            participant=participant,
            user=created_by,
            metadata={
                "payment_id": payment.id,
                "amount": str(amount),
                "method": method,
            },
        )

        return payment

    @staticmethod
    def delete_payment(
        payment: Payment,
        deleted_by: User | None = None,
    ) -> None:
        """Delete a payment and log it in the timeline.

        Args:
            payment: The Payment instance to delete.
            deleted_by: User who deleted the payment.
        """
        participant = payment.participant
        event = participant.registration.event

        description = (
            f"{participant.first_name} {participant.last_name}: "
            f"{payment.amount}€ ({payment.get_method_display()}) entfernt"
        )
        TimelineService.log(
            event=event,
            action_type=TimelineActionChoices.PAYMENT_REMOVED,
            description=description,
            participant=participant,
            user=deleted_by,
            metadata={
                "payment_id": payment.id,
                "amount": str(payment.amount),
                "method": payment.method,
            },
        )

        payment.delete()
