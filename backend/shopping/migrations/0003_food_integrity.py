import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("shopping", "0002_initial"),
        ("supply", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="shoppinglistitemsource",
            name="ingredient",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="shopping_item_sources",
                to="supply.ingredient",
                verbose_name="Zutat",
            ),
        ),
        migrations.AddConstraint(
            model_name="shoppinglistitem",
            constraint=models.CheckConstraint(
                condition=models.Q(("quantity_g__gte", 0)),
                name="shopping_item_quantity_g_nonnegative",
            ),
        ),
    ]
