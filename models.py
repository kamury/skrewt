from db import query_db
from datetime import datetime, timedelta, timezone

LOG_FILE = '/home/m/mymysewi/meteo.xcmonsters.com/debug.log'

#в базе колонка называется Last_request с большой буквы, и SELECT * возвращает ключ
#именно в таком написании. Алиас приводит его к last_request во всем коде.
SPOT_FIELDS = 'id, title, latitude, longtitude, timezone, is_active, Last_request AS last_request'

def get_all_spots():
    #только включенные в админке — для публичного списка и сбора данных
    return query_db(f'SELECT {SPOT_FIELDS} FROM spots WHERE is_active=1 ORDER by title ASC')

def get_all_spots_for_admin():
    #в админке видны все: сначала активные, потом отключенные, внутри по алфавиту
    return query_db(f'SELECT {SPOT_FIELDS} FROM spots ORDER BY is_active DESC, title ASC')

def get_spot_by_id(id):
    return query_db(f'SELECT {SPOT_FIELDS} FROM spots WHERE id=%s', [id], one=True)

def create_spot(title, latitude, longtitude, timezone, is_active, last_request):
    return query_db(
        'INSERT INTO spots (title, latitude, longtitude, timezone, is_active, Last_request) '
        'VALUES (%s, %s, %s, %s, %s, %s)',
        [title, latitude, longtitude, timezone, is_active, last_request])

def update_spot(id, title, latitude, longtitude, timezone, is_active, last_request):
    return query_db(
        'UPDATE spots SET title=%s, latitude=%s, longtitude=%s, timezone=%s, is_active=%s, '
        'Last_request=%s WHERE id=%s',
        [title, latitude, longtitude, timezone, is_active, last_request, id])

def set_spot_activity(id, is_active):
    return query_db('UPDATE spots SET is_active=%s WHERE id=%s', [is_active, id])

def check_admin_credentials(login, password):
    #пароль лежит в базе открытым текстом, чтобы его можно было править руками
    user = query_db('SELECT * FROM users WHERE login=%s', [login], one=True)
    return bool(user) and user['password'] == password

def is_spot_requested_recently(spot_id):
    #по спотам, которые никто не открывал, прогноз не собираем
    row = query_db('SELECT Last_request AS last_request FROM spots WHERE id=%s', [spot_id], one=True)

    #колонка обнуляемая, пустое значение считаем за «давно не заходили»
    if not row or not row['last_request']:
        return False

    return (datetime.now() - row['last_request']) < timedelta(days=3)

def touch_spot_request_time(spot_id):
    return query_db('UPDATE spots SET Last_request=%s WHERE id=%s', [datetime.now(), spot_id], one=True)

def get_actual_sounding_data(spot_id):
    #получить дату последнего запроса для этого спота, если она меньше 12 часов назад, 
    # показываем. запрашиваем все с этой датой, и после нее то что сегодня, то было раньше
    #этой даты
    result = query_db("SELECT * FROM forecast WHERE spot_id=%s ORDER BY request_date DESC, request_time DESC LIMIT 1", [spot_id], one=True)
    utc_now = datetime.now(timezone.utc)
    hours = [0, 6, 12, 18]

    if result:
        last_request_datetime = datetime.strptime(f"{result['request_date']} {result['request_time']}:00", '%Y-%m-%d %H:%M')
        last_request_datetime = last_request_datetime.replace(tzinfo=timezone.utc)
        print(1111, last_request_datetime, utc_now)
        #если есть свежие данные
        #if ((utc_now - request_datetime) < timedelta(hours=10)):
        if ((utc_now - last_request_datetime) < timedelta(hours=312)):
            index = hours.index(result['request_time'])
            if index:
                prev_request_time = hours[index - 1]
                prev_request_date = result['request_date']      
            else:
                prev_request_time = 18
                prev_request_date = last_request_datetime.date() - timedelta(days=1)

            datetime_limit = f"{result['datetime'].date()} 00:00:00"

        
            print(prev_request_date, prev_request_time, datetime_limit)

            query = '''select * from ( 
                            SELECT *
                            FROM forecast f
                            WHERE spot_id=%s
                            and f.request_date = %s
                            and f.request_time = %s
                            UNION ALL
                            select *
                            from forecast f
                            where spot_id=%s
                            and f.request_date = %s
                            and f.request_time = %s
                            and f.`datetime` > %s
                        ) cc
                        ORDER BY datetime, height;'''
            return query_db(query, [spot_id, result['request_date'], result['request_time'], spot_id, prev_request_date, prev_request_time, result['datetime']])
        else:
            return False
    else:
        return False

def is_forecast_exist(spot_id, request_date, request_time):
    query = "SELECT EXISTS(SELECT 1 FROM forecast WHERE spot_id=%s AND request_date=%s AND request_time=%s) as exists_flag"
    result = query_db(query, [spot_id, request_date, request_time], one=True)
    return bool(result['exists_flag']) if result else False

def save_forecast(data, spot_id, request_date, request_time, datetime):
    # Преобразуем список словарей в плоский список значений
    values = []
    for row in data:
        values.extend([
            spot_id,
            request_date,
            request_time,
            datetime,
            row['dewpoint'],
            row['height'],
            row['temp'],
            row['wind_u'],
            row['wind_v']
        ])

    # Создаем плейсхолдеры
    placeholders = ','.join(['(%s, %s, %s, %s, %s, %s, %s, %s, %s)'] * len(data))

    query = f'''
        INSERT INTO forecast 
        (spot_id, request_date, request_time, `datetime`, dewpoint, height, temp, wind_u, wind_v)
        VALUES {placeholders}
    '''
    
    return query_db(query, values)

def clean_previous_forecast(spot_id, request_date):
    return query_db('DELETE FROM forecast WHERE spot_id=%s AND request_date < %s', 
                    [spot_id, request_date]);

def is_archive_exist(spot_id, datetime):
    query = "SELECT EXISTS(SELECT 1 FROM sounding_archive WHERE spot_id=%s AND datetime=%s) as exists_flag"
    result = query_db(query, [spot_id, datetime], one=True)
    return bool(result['exists_flag']) if result else False

def save_sounding_archive(spot_id, datetime, data):
    # Преобразуем список словарей в плоский список значений
    values = []
    for row in data:
        values.extend([
            spot_id,
            datetime,
            row['dewpoint'],
            row['height'],
            row['temp'],
            row['wind_u'],
            row['wind_v']
        ])

    # Создаем плейсхолдеры
    placeholders = ','.join(['(%s, %s, %s, %s, %s, %s, %s)'] * len(data))

    query = f'''
        INSERT INTO sounding_archive 
        (spot_id, `datetime`, dewpoint, height, temp, wind_u, wind_v)
        VALUES {placeholders}
    '''
    return query_db(query, values)