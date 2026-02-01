"""remove_role_from_tokens

Revision ID: remove_role_from_tokens
Revises: initial_schema
Create Date: 2026-01-27 16:00:00.000000

Remove role column from tokens table
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'remove_role_from_tokens'
down_revision: Union[str, None] = 'initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove role column from tokens table
    op.drop_column('tokens', 'role')


def downgrade() -> None:
    # Add role column back to tokens table
    op.add_column('tokens', sa.Column('role', sa.String(), nullable=False, server_default='user'))
