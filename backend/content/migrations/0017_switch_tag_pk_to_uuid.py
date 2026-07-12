"""Switch content_tag PK from integer to UUID. IRREVERSIBLE.

Multi-step approach:
1. Drop all FK constraints pointing to content_tag.id
2. Add temp UUID PK column, populate from existing uuid values
3. Drop old integer PK
4. For each referencing table: migrate FK columns from int to UUID via mapping
5. Swap id columns + drop old uuid
6. Recreate FK constraints
"""

import uuid
from django.db import migrations, models

# (table, column, constraint_name, nullable)
# Nullable FKs (parent_id on self-ref and TagSuggestion)
NULLABLE_FK_CONSTRAINTS = [
    ("content_tag", "parent_id", "content_tag_parent_id_7f9a587a_fk_content_tag_id", True),
    ("content_tagsuggestion", "parent_id", "content_tagsuggestion_parent_id_55bc15b2_fk_content_tag_id", True),
]

# M2M through tables — FK columns are NOT NULL
M2M_FK_CONSTRAINTS = [
    ("blog_blog_tags", "tag_id", "blog_blog_tags_tag_id_36a3abc6_fk_content_tag_id", False),
    ("game_game_tags", "tag_id", "game_game_tags_tag_id_0741c7f0_fk_content_tag_id", False),
    ("recipe_recipe_tags", "tag_id", "recipe_recipe_tags_tag_id_ee78e406_fk_content_tag_id", False),
    ("session_groupsession_tags", "tag_id", "session_groupsession_tags_tag_id_c49ed868_fk_content_tag_id", False),
    ("supply_ingredient_tags", "tag_id", "supply_ingredient_tags_tag_id_86e80a16_fk_content_tag_id", False),
]

ALL_FK_CONSTRAINTS = NULLABLE_FK_CONSTRAINTS + M2M_FK_CONSTRAINTS


def _drop_fk_constraints():
    return [
        f'ALTER TABLE "{table}" DROP CONSTRAINT IF EXISTS {constraint};'
        for table, _column, constraint, _nullable in ALL_FK_CONSTRAINTS
    ]


def _migrate_fk_column(table, column, nullable):
    """Generate SQL steps to migrate one FK column from integer to UUID."""
    steps = [
        f'ALTER TABLE "{table}" ADD COLUMN temp_{column} UUID;',
        f'UPDATE "{table}" ref '
        f'SET temp_{column} = tag.temp_uuid_id '
        f'FROM content_tag tag '
        f'WHERE ref.{column} = tag.id;',
        f'ALTER TABLE "{table}" DROP COLUMN "{column}";',
        f'ALTER TABLE "{table}" RENAME COLUMN temp_{column} TO "{column}";',
    ]
    if not nullable:
        steps.append(f'ALTER TABLE "{table}" ALTER COLUMN "{column}" SET NOT NULL;')
    return steps


def _recreate_fk_constraints():
    return [
        f'ALTER TABLE "{table}" ADD CONSTRAINT {constraint} '
        f'FOREIGN KEY ("{column}") REFERENCES content_tag(id) DEFERRABLE INITIALLY DEFERRED;'
        for table, column, constraint, _nullable in ALL_FK_CONSTRAINTS
    ]


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0016_populate_tag_uuids"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveField(
                    model_name="tag",
                    name="uuid",
                ),
                migrations.AlterField(
                    model_name="tag",
                    name="id",
                    field=models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
            ],
            database_operations=[
                # Step 1: Drop all FK constraints pointing to content_tag
                migrations.RunSQL(
                    sql=_drop_fk_constraints(),
                    reverse_sql=[],
                ),
                # Step 2: Add temp_uuid_id column as new UUID PK
                migrations.RunSQL(
                    sql="""
                        ALTER TABLE content_tag
                        ADD COLUMN temp_uuid_id UUID DEFAULT gen_random_uuid() NOT NULL;
                    """,
                    reverse_sql="ALTER TABLE content_tag DROP COLUMN temp_uuid_id;",
                ),
                # Step 3: Populate temp_uuid_id from existing uuid values
                migrations.RunSQL(
                    sql="UPDATE content_tag SET temp_uuid_id = uuid;",
                    reverse_sql="",
                ),
                # Step 4: Drop old integer PK constraint
                migrations.RunSQL(
                    sql="ALTER TABLE content_tag DROP CONSTRAINT content_tag_pkey;",
                    reverse_sql="",
                ),
                # Step 5: For each referencing table, migrate FK columns
                *[
                    migrations.RunSQL(
                        sql=_migrate_fk_column(table, column, nullable),
                        reverse_sql=[],
                    )
                    for table, column, _constraint, nullable in ALL_FK_CONSTRAINTS
                ],
                # Step 6: Drop old int id, rename temp_uuid_id to id, add PK
                migrations.RunSQL(
                    sql="""
                        ALTER TABLE content_tag DROP COLUMN id;
                        ALTER TABLE content_tag RENAME COLUMN temp_uuid_id TO id;
                        ALTER TABLE content_tag ADD PRIMARY KEY (id);
                    """,
                    reverse_sql="",
                ),
                # Step 7: Recreate FK constraints
                migrations.RunSQL(
                    sql=_recreate_fk_constraints(),
                    reverse_sql=_drop_fk_constraints(),
                ),
                # Step 8: Drop old uuid column (id is now the UUID PK)
                migrations.RunSQL(
                    sql="ALTER TABLE content_tag DROP COLUMN uuid;",
                    reverse_sql="",
                ),
            ],
        ),
    ]
