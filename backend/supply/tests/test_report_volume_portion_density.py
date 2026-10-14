import pytest
from django.core.management import call_command

from supply.models import MeasuringUnit, Portion
from supply.tests import make_ingredient


@pytest.mark.django_db
def test_report_lists_deviating_volume_portions_without_writing(capsys):
    ingredient = make_ingredient(name="Haferdrink natur", physical_density=1.02)
    ml, _ = MeasuringUnit.objects.get_or_create(name="Milliliter", defaults={"quantity": 1.0, "unit": "ml"})
    ml.unit = "ml"
    ml.save()
    bad = Portion.objects.create(
        ingredient=ingredient, measuring_unit=ml, name="Liter", quantity=1000.0, weight_g=1000.0
    )
    Portion.objects.filter(pk=bad.pk).update(weight_g=1000.0)  # bypass save-time recomputation
    ok_ingredient = make_ingredient(name="Wasser Test", physical_density=1.0)
    good = Portion.objects.create(
        ingredient=ok_ingredient, measuring_unit=ml, name="Liter", quantity=1000.0, weight_g=1000.0
    )

    call_command("report_volume_portion_density")
    out = capsys.readouterr().out

    assert "Haferdrink natur" in out
    assert "Wasser Test" not in out
    bad.refresh_from_db()
    good.refresh_from_db()
    assert bad.weight_g == 1000.0
