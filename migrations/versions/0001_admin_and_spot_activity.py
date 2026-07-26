"""Админка: флаг активности спота и таблица пользователей

Revision ID: 0001
Revises:
Create Date: 2026-07-26

"""
from alembic import op
import sqlalchemy as sa

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    #неактивные споты не показываем в списке и не собираем по ним данные
    op.add_column('spots',
                  sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('1')))

    #пароль хранится в открытом виде, чтобы его можно было поменять руками в базе
    users = op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('login', sa.String(64), nullable=False, unique=True),
        sa.Column('password', sa.String(255), nullable=False),
        mysql_engine='InnoDB',
        mysql_charset='utf8mb4',
    )

    op.bulk_insert(users, [{'login': 'admin', 'password': 'qazQAZ123'}])


def downgrade():
    op.drop_table('users')
    op.drop_column('spots', 'is_active')
