"""environment_settings_single_json

Revision ID: env_settings_single_json
Revises: add_idp_user_social
Create Date: 2026-03-08

Transform settings table: one row per environment, settings as JSON array.
Remove key, description; rename value -> settings. No default settings injected.
"""
from typing import Sequence, Union
import json
import uuid as uuid_module
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "env_settings_single_json"
down_revision: Union[str, None] = "add_idp_user_social"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _json_type(val):
    """Infer type string for a value."""
    if val is None:
        return "string"
    if isinstance(val, bool):
        return "boolean"
    if isinstance(val, (int, float)) and not isinstance(val, bool):
        return "number"
    if isinstance(val, list):
        return "list"
    if isinstance(val, dict):
        return "object"
    return "string"


def upgrade() -> None:
    conn = op.get_bind()

    op.create_table(
        "settings_new",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("uuid", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("environment_id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("settings", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.ForeignKeyConstraint(["environment_id"], ["environments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("environment_id", name="uq_settings_environment_id"),
        sa.UniqueConstraint("uuid", name="uq_settings_new_uuid"),
    )
    op.create_index("ix_settings_new_organization_id", "settings_new", ["organization_id"], unique=False)

    env_rows = conn.execute(sa.text("SELECT id, organization_id FROM environments")).fetchall()
    for seq_id, (env_id, org_id) in enumerate(env_rows, start=1):
        existing = conn.execute(
            sa.text("SELECT key, value, description FROM settings WHERE environment_id = :eid"),
            {"eid": env_id},
        ).fetchall()
        if existing:
            items = [
                {
                    "key": r[0],
                    "value": r[1],
                    "description": r[2] or "",
                    "type": _json_type(r[1]),
                }
                for r in existing
            ]
            settings_json = json.dumps(items)
        else:
            settings_json = "[]"
        new_uuid = str(uuid_module.uuid4())
        conn.execute(
            sa.text(
                "INSERT INTO settings_new (id, uuid, environment_id, organization_id, settings) "
                "VALUES (:id, CAST(:uuid AS uuid), :eid, :oid, CAST(:settings AS jsonb))"
            ),
            {"id": seq_id, "uuid": new_uuid, "eid": env_id, "oid": org_id, "settings": settings_json},
        )

    op.drop_table("settings")
    op.rename_table("settings_new", "settings")
    op.create_index(op.f("ix_settings_organization_id"), "settings", ["organization_id"], unique=False)


def downgrade() -> None:
    op.drop_table("settings")
    op.create_table(
        "settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("uuid", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("value", postgresql.JSON(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("environment_id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["environment_id"], ["environments.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key", "environment_id", name="uq_key_environment"),
        sa.UniqueConstraint("uuid"),
    )
    op.create_index(op.f("ix_settings_organization_id"), "settings", ["organization_id"], unique=False)
