"""Statistics schemas for event KPIs."""

from pydantic import BaseModel


class BookingOptionCapacityOut(BaseModel):
    """Capacity stats for a single booking option."""

    name: str
    max_participants: int
    current_count: int
    fill_percentage: float


class CapacityStatsOut(BaseModel):
    """Overall capacity statistics."""

    booking_options: list[BookingOptionCapacityOut]
    total_capacity: int
    total_registered: int
    total_fill_percentage: float


class PaymentByMethodOut(BaseModel):
    """Payment breakdown by method."""

    method: str
    count: int
    total_amount: str  # Decimal as string


class PaymentStatsOut(BaseModel):
    """Payment statistics."""

    total_expected: str  # Decimal as string
    total_received: str
    total_outstanding: str
    paid_count: int
    unpaid_count: int
    paid_percentage: float
    payment_by_method: list[PaymentByMethodOut]


class GenderDistributionOut(BaseModel):
    """Gender distribution entry."""

    gender: str
    count: int
    percentage: float


class AgeDistributionOut(BaseModel):
    """Age group distribution entry."""

    age_group: str
    count: int
    percentage: float


class DemographicsStatsOut(BaseModel):
    """Demographic statistics."""

    gender_distribution: list[GenderDistributionOut]
    age_distribution: list[AgeDistributionOut]


class NutritionalSummaryOut(BaseModel):
    """Single nutritional tag count."""

    tag_name: str
    count: int


class NutritionStatsOut(BaseModel):
    """Nutrition statistics."""

    nutritional_summary: list[NutritionalSummaryOut]


class RegistrationTimelinePointOut(BaseModel):
    """Single data point in registration timeline."""

    date: str
    cumulative_count: int


class StatsOut(BaseModel):
    """Complete event statistics response."""

    capacity: CapacityStatsOut
    payment: PaymentStatsOut
    demographics: DemographicsStatsOut
    nutrition: NutritionStatsOut
    registration_timeline: list[RegistrationTimelinePointOut]
