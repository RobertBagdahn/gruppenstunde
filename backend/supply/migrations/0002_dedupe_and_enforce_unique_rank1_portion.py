"""Data migration: dedupe duplicate active rank=1 portions per ingredient,
then enforce uniqueness on the DB level so this can never regress.

See openspec change `fix-portion-integrity-and-ai-estimate` for background:
`enrich_seeds`-style maintenance runs created new rank=1 portions without
demoting the legacy rank=1 portion, leaving up to two simultaneously "active"
default portions for the same ingredient. This made the AI quantity
estimation's `.filter(rank=1).first()` lookup non-deterministic and, combined
with the RecipeItem-apply bug, caused reproducible data corruption.
"""

from django.db import migrations, models


def dedupe_rank1_portions(apps, schema_editor):
    from supply.services.portion_integrity import dedupe_rank1_portions

    dedupe_rank1_portions()


def noop_reverse(apps, schema_editor):
    # Demoted ranks are not restored on reverse — this is a one-way data fix.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('supply', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(dedupe_rank1_portions, noop_reverse),
        migrations.AddConstraint(
            model_name='portion',
            constraint=models.UniqueConstraint(
                fields=['ingredient'],
                condition=models.Q(('deleted_at__isnull', True), ('rank', 1)),
                name='unique_rank1_portion_per_ingredient',
            ),
        ),
    ]
