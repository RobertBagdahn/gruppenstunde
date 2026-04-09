"""Statistics service for computing event KPIs and aggregates."""

from collections import Counter, defaultdict
from datetime import date
from decimal import Decimal

from django.db.models import Sum

from event.models import Event, Participant, Registration


class StatsService:
    """Computes capacity, payment, demographic, nutrition, and timeline stats for an event."""

    @staticmethod
    def get_stats(event: Event) -> dict:
        """Return all aggregated statistics for the given event."""
        participants = list(
            Participant.objects.filter(registration__event=event)
            .select_related("booking_option")
            .prefetch_related("nutritional_tags", "labels", "payments")
        )

        reference_date = event.start_date or date.today()

        return {
            "capacity": StatsService._capacity_stats(event, participants),
            "payment": StatsService._payment_stats(participants),
            "demographics": StatsService._demographic_stats(participants, reference_date),
            "nutrition": StatsService._nutrition_stats(participants),
            "registration_timeline": StatsService._registration_timeline(event),
        }

    @staticmethod
    def _capacity_stats(event: Event, participants: list[Participant]) -> dict:
        """Booking option capacity KPIs."""
        booking_options = []
        total_capacity = 0
        total_registered = len(participants)

        for opt in event.booking_options.all():
            count = sum(1 for p in participants if p.booking_option_id == opt.id)
            max_p = opt.max_participants
            fill_pct = round((count / max_p * 100), 1) if max_p > 0 else 0
            booking_options.append(
                {
                    "name": opt.name,
                    "max_participants": max_p,
                    "current_count": count,
                    "fill_percentage": fill_pct,
                }
            )
            if max_p > 0:
                total_capacity += max_p

        total_fill_percentage = round(total_registered / total_capacity * 100, 1) if total_capacity > 0 else 0

        return {
            "booking_options": booking_options,
            "total_capacity": total_capacity,
            "total_registered": total_registered,
            "total_fill_percentage": total_fill_percentage,
        }

    @staticmethod
    def _payment_stats(participants: list[Participant]) -> dict:
        """Payment KPIs."""
        total_expected = Decimal("0.00")
        total_received = Decimal("0.00")
        paid_count = 0
        unpaid_count = 0

        payment_by_method: dict[str, dict] = defaultdict(lambda: {"count": 0, "total_amount": Decimal("0.00")})

        for p in participants:
            if p.booking_option and p.booking_option.price:
                total_expected += p.booking_option.price

            paid = p.total_paid
            total_received += paid

            if p.is_paid:
                paid_count += 1
            else:
                unpaid_count += 1

            for payment in p.payments.all():
                method = payment.get_method_display()
                payment_by_method[method]["count"] += 1
                payment_by_method[method]["total_amount"] += payment.amount

        total_outstanding = max(Decimal("0.00"), total_expected - total_received)
        total = paid_count + unpaid_count
        paid_percentage = round(paid_count / total * 100, 1) if total > 0 else 0

        return {
            "total_expected": str(total_expected),
            "total_received": str(total_received),
            "total_outstanding": str(total_outstanding),
            "paid_count": paid_count,
            "unpaid_count": unpaid_count,
            "paid_percentage": paid_percentage,
            "payment_by_method": [
                {"method": method, "count": data["count"], "total_amount": str(data["total_amount"])}
                for method, data in sorted(payment_by_method.items())
            ],
        }

    @staticmethod
    def _demographic_stats(participants: list[Participant], reference_date: date) -> dict:
        """Gender and age distribution."""
        # Gender distribution
        gender_counts = Counter()
        for p in participants:
            gender_counts[p.get_gender_display()] += 1

        total = len(participants)
        gender_distribution = [
            {
                "gender": gender,
                "count": count,
                "percentage": round(count / total * 100, 1) if total > 0 else 0,
            }
            for gender, count in gender_counts.most_common()
        ]

        # Age distribution
        age_groups = {"0-5": 0, "6-10": 0, "11-14": 0, "15-18": 0, "19+": 0, "Unbekannt": 0}
        for p in participants:
            if not p.birthday:
                age_groups["Unbekannt"] += 1
                continue

            age = reference_date.year - p.birthday.year
            if (reference_date.month, reference_date.day) < (p.birthday.month, p.birthday.day):
                age -= 1

            if age < 6:
                age_groups["0-5"] += 1
            elif age <= 10:
                age_groups["6-10"] += 1
            elif age <= 14:
                age_groups["11-14"] += 1
            elif age <= 18:
                age_groups["15-18"] += 1
            else:
                age_groups["19+"] += 1

        age_distribution = [
            {
                "age_group": group,
                "count": count,
                "percentage": round(count / total * 100, 1) if total > 0 else 0,
            }
            for group, count in age_groups.items()
            if count > 0
        ]

        return {
            "gender_distribution": gender_distribution,
            "age_distribution": age_distribution,
        }

    @staticmethod
    def _nutrition_stats(participants: list[Participant]) -> dict:
        """Nutritional tag summaries."""
        tag_counts = Counter()
        for p in participants:
            for tag in p.nutritional_tags.all():
                tag_counts[tag.name] += 1

        return {
            "nutritional_summary": [{"tag_name": name, "count": count} for name, count in tag_counts.most_common()],
        }

    @staticmethod
    def _registration_timeline(event: Event) -> list[dict]:
        """Registration-over-time data (cumulative by day)."""
        registrations = (
            Registration.objects.filter(event=event).order_by("created_at").values_list("created_at", flat=True)
        )

        daily_counts: dict[str, int] = defaultdict(int)
        for dt in registrations:
            day_str = dt.strftime("%Y-%m-%d")
            daily_counts[day_str] += 1

        # Build cumulative timeline
        timeline = []
        cumulative = 0
        for day in sorted(daily_counts.keys()):
            cumulative += daily_counts[day]
            timeline.append({"date": day, "cumulative_count": cumulative})

        return timeline
