"""add identity_providers and user_social_accounts

Revision ID: add_idp_user_social
Revises: remove_role_from_tokens
Create Date: 2026-02-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "add_idp_user_social"
down_revision: Union[str, None] = "remove_role_from_tokens"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = insp.get_table_names()

    if "identity_providers" not in tables:
        op.create_table(
            "identity_providers",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("uuid", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("slug", sa.String(64), nullable=False),
            sa.Column("display_name", sa.String(255), nullable=False),
            sa.Column("client_id", sa.String(512), nullable=False),
            sa.Column("client_secret_encrypted", sa.Text(), nullable=True),
            sa.Column("authorization_url", sa.String(1024), nullable=False),
            sa.Column("token_url", sa.String(1024), nullable=False),
            sa.Column("userinfo_url", sa.String(1024), nullable=True),
            sa.Column("scopes", sa.String(512), nullable=False, server_default="openid email profile"),
            sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("organization_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        )
        op.create_index("ix_identity_providers_slug", "identity_providers", ["slug"], unique=True)
        op.create_index("ix_identity_providers_uuid", "identity_providers", ["uuid"], unique=True)

    if "user_social_accounts" not in tables:
        op.create_table(
            "user_social_accounts",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("identity_provider_id", sa.Integer(), nullable=False),
            sa.Column("provider_user_id", sa.String(255), nullable=False),
            sa.Column("provider_email", sa.String(512), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["identity_provider_id"], ["identity_providers.id"], ondelete="CASCADE"),
            sa.UniqueConstraint("identity_provider_id", "provider_user_id", name="uix_identity_provider_provider_user_id"),
        )
        op.create_index("ix_user_social_accounts_user_id", "user_social_accounts", ["user_id"])
        op.create_index("ix_user_social_accounts_identity_provider_id", "user_social_accounts", ["identity_provider_id"])


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = insp.get_table_names()
    if "user_social_accounts" in tables:
        op.drop_table("user_social_accounts")
    if "identity_providers" in tables:
        op.drop_table("identity_providers")
