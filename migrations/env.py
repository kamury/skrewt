import os
import sys
from logging.config import fileConfig
from urllib.parse import quote_plus

from alembic import context
from sqlalchemy import create_engine, pool

#чтобы импортировался config.py из корня проекта
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config as app_config

alembic_config = context.config

if alembic_config.config_file_name is not None:
    fileConfig(alembic_config.config_file_name)

#схему не описываем моделями, поэтому autogenerate не используется
target_metadata = None


def get_url():
    """Адрес базы: из переменной окружения, иначе из config.py."""
    url = os.environ.get('DATABASE_URL')

    if url:
        return url

    #mysqldb — это тот же драйвер mysqlclient, что уже стоит для flask_mysqldb
    return (f"mysql+mysqldb://{app_config.MYSQL_USER}:{quote_plus(app_config.MYSQL_PASSWORD)}"
            f"@{app_config.MYSQL_HOST}/{app_config.MYSQL_DB}?charset=utf8mb4")


def run_migrations_offline():
    """Печатает SQL вместо выполнения (alembic upgrade head --sql)."""
    context.configure(
        url=get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Применяет миграции к базе."""
    connectable = create_engine(get_url(), poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            #в MySQL DDL не откатывается, поэтому каждая миграция коммитится отдельно
            transaction_per_migration=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
