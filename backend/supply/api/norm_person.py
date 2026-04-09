"""Norm-person calculation API endpoints."""

from ninja import Query, Router, Schema
from ninja.errors import HttpError

from supply.data.dge_reference import get_all_dge_reference, get_dge_reference
from supply.schemas.norm_person import (
    DgeReferencePointOut,
    NormPersonCurvePointOut,
    NormPersonCurvesOut,
    NormPersonReferenceOut,
    NormPersonResultOut,
)
from supply.services.norm_person_service import (
    NORM_PERSON_AGE,
    NORM_PERSON_GENDER,
    NORM_PERSON_PAL,
    Gender,
    calculate_norm_factor,
)

norm_person_router = Router(tags=["norm-person"])


class CalculateQueryIn(Schema):
    age: int
    gender: str
    pal: float = 1.5


class CurvesQueryIn(Schema):
    pal: float = 1.5


def _validate_params(age: int, gender: str, pal: float) -> Gender:
    """Validate common parameters and return the Gender enum value."""
    if age < 0 or age > 99:
        raise HttpError(422, "Alter muss zwischen 0 und 99 liegen.")

    if gender not in ("male", "female"):
        raise HttpError(422, "Geschlecht muss 'male' oder 'female' sein.")

    if pal < 1.0 or pal > 2.5:
        raise HttpError(422, "PAL-Wert muss zwischen 1.0 und 2.5 liegen.")

    return Gender(gender)


@norm_person_router.get("/calculate", response=NormPersonResultOut)
def calculate(request, params: Query[CalculateQueryIn]):
    """Calculate BMR, TDEE, and norm factor for a single person.

    Also returns DGE reference values for the given age and gender.
    """
    gender_enum = _validate_params(params.age, params.gender, params.pal)

    result = calculate_norm_factor(
        age=params.age,
        gender=gender_enum,
        pal=params.pal,
    )

    dge_ref = get_dge_reference(params.age, params.gender)

    return NormPersonResultOut(
        bmr=result.bmr,
        tdee=result.tdee,
        norm_factor=result.norm_factor,
        weight_kg=result.weight_kg,
        height_cm=result.height_cm,
        age=result.age,
        gender=result.gender.value,
        pal=result.pal,
        dge_reference=dge_ref,
    )


@norm_person_router.get("/curves", response=NormPersonCurvesOut)
def curves(request, params: Query[CurvesQueryIn]):
    """Return TDEE and norm factor curves for ages 0-99, both genders.

    Also includes DGE reference data for graph overlays.
    """
    if params.pal < 1.0 or params.pal > 2.5:
        raise HttpError(422, "PAL-Wert muss zwischen 1.0 und 2.5 liegen.")

    ref_result = calculate_norm_factor(
        age=NORM_PERSON_AGE,
        gender=NORM_PERSON_GENDER,
        pal=NORM_PERSON_PAL,
    )

    reference = NormPersonReferenceOut(
        age=NORM_PERSON_AGE,
        gender=NORM_PERSON_GENDER.value,
        pal=NORM_PERSON_PAL,
        tdee=ref_result.tdee,
        norm_factor=ref_result.norm_factor,
    )

    data_points: list[NormPersonCurvePointOut] = []
    for age in range(100):
        male = calculate_norm_factor(age=age, gender=Gender.MALE, pal=params.pal)
        female = calculate_norm_factor(age=age, gender=Gender.FEMALE, pal=params.pal)

        data_points.append(
            NormPersonCurvePointOut(
                age=age,
                male_tdee=male.tdee,
                female_tdee=female.tdee,
                male_norm_factor=male.norm_factor,
                female_norm_factor=female.norm_factor,
            )
        )

    dge_data = [DgeReferencePointOut(**item) for item in get_all_dge_reference()]

    return NormPersonCurvesOut(
        pal=params.pal,
        reference=reference,
        data_points=data_points,
        dge_reference=dge_data,
    )


@norm_person_router.get("/dge-reference", response=list[DgeReferencePointOut])
def dge_reference(request):
    """Return all DGE reference values for graph rendering."""
    return [DgeReferencePointOut(**item) for item in get_all_dge_reference()]
