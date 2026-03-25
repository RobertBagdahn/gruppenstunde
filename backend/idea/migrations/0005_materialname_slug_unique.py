# Second step: add unique constraint to slug after data is populated

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("idea", "0004_materialitem_quantity_type_materialname_description_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="materialname",
            name="slug",
            field=models.SlugField(blank=True, max_length=280, unique=True),
        ),
    ]
