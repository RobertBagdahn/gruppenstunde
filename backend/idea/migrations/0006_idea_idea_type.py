from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("idea", "0005_materialname_slug_unique"),
    ]

    operations = [
        migrations.AddField(
            model_name="idea",
            name="idea_type",
            field=models.CharField(
                choices=[
                    ("idea", "Idee"),
                    ("knowledge", "Wissensbeitrag"),
                    ("recipe", "Rezept"),
                ],
                default="idea",
                help_text="Idee, Wissensbeitrag oder Rezept",
                max_length=20,
                verbose_name="Typ",
            ),
        ),
        migrations.AddIndex(
            model_name="idea",
            index=models.Index(
                fields=["idea_type", "status", "-created_at"],
                name="idea_idea_idea_ty_idx",
            ),
        ),
    ]
