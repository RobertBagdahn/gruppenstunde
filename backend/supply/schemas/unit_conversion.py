"""Unit conversion schemas."""

from pydantic import BaseModel


class UnitConversionOut(BaseModel):
    id: int
    from_unit_id: int
    from_unit_name: str
    to_unit_id: int
    to_unit_name: str
    factor: float
    ingredient_id: int | None = None
    ingredient_name: str | None = None

    class Config:
        from_attributes = True


class UnitConversionCreateIn(BaseModel):
    from_unit_id: int
    to_unit_id: int
    factor: float
    ingredient_id: int | None = None


class UnitConversionUpdateIn(BaseModel):
    factor: float | None = None
