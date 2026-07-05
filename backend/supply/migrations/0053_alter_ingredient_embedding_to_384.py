# Generated migration to update embedding dimensions from 768 to 384

from django.db import migrations
import pgvector.django.vector


class Migration(migrations.Migration):

    dependencies = [
        ("supply", "0052_remove_ingredient_search_vector"),
    ]

    operations = [
        migrations.AlterField(
            model_name="ingredient",
            name="embedding",
            field=pgvector.django.vector.VectorField(blank=True, dimensions=384, null=True),
        ),
    ]
