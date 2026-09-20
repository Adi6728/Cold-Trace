"""add_user_role

Revision ID: ccb8c79cce96
Revises: bba7b69cce95
Create Date: 2026-09-20 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ccb8c79cce96'
down_revision: Union[str, None] = 'bba7b69cce95'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Postgres ENUM modification
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'USER'")


def downgrade() -> None:
    pass # Dropping enum values is not supported in Postgres without a full recreation
