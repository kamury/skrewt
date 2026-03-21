from flask import g
from flask_mysqldb import MySQL

# Создаем экземпляр БЕЗ приложения (будет инициализирован в init_app)
mysql = MySQL()

def init_app(app):
    """Инициализирует MySQL с конкретным приложением."""
    mysql.init_app(app)

def get_db():
    """
    Возвращает соединение с БД для текущего запроса.
    Соединение кэшируется в g на время запроса.
    """
    if 'db' not in g:
        # mysql.connection использует current_app внутри себя
        g.db = mysql.connection
    return g.db
    
def query_db(query, args=(), one=False):
    """
    Универсальная функция для выполнения запросов к БД.
    """
    cur = get_db().cursor()
    cur.execute(query, args)
    
    if query.strip().upper().startswith('SELECT'):
        rv = cur.fetchall()
        cur.close()
        return (rv[0] if rv else None) if one else rv
    else:
        get_db().commit()
        affected_rows = cur.rowcount
        lastrowid = cur.lastrowid
        cur.close()
        # Для INSERT возвращаем ID новой записи
        if query.strip().upper().startswith('INSERT'):
            return lastrowid
        return affected_rows