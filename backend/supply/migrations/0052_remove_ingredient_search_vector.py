# Remove search_vector field from Ingredient model

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("supply", "0051_ingredient_embedding_text_hash"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="ingredient",
            name="search_vector",
        ),
    ]
