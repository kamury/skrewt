from db import query_db
from datetime import datetime, timedelta, timezone

def get_all_spots():
    return query_db('SELECT * FROM spots')

def get_spot_by_id(id):
    return query_db('SELECT * FROM spots WHERE id=%s', [id], one=True)

def is_active_spot(spot_id):
    last_datetime = query_db('SELECT last_request FROM spots WHERE id=%s', [spot_id], one=True)
    now = datetime.now()
    return (now - last_datetime['last_request']) < timedelta(days=14)

def set_spot_as_active(spot_id):
    return query_db('UPDATE spots SET last_request=%s WHERE id=%s', [datetime.now(), spot_id], one=True)

def get_actual_sounding_data(spot_id):
    #получить дату последнего запроса для этого спота, если она меньше 12 часов назад, 
    # показываем. запрашиваем все с этой датой, и после нее то что сегодня, то было раньше
    #этой даты
    result = query_db("SELECT * FROM forecast WHERE spot_id=%s ORDER BY request_date DESC, request_time DESC LIMIT 1", [spot_id], one=True)
    utc_now = datetime.now(timezone.utc)
    hours = [0, 6, 12, 18]

    if result:
        last_request_datetime = datetime.strptime(f'{result['request_date']} {result['request_time']}:00', '%Y-%m-%d %H:%M')
        last_request_datetime = last_request_datetime.replace(tzinfo=timezone.utc)
        print(1111, last_request_datetime, utc_now)
        #если есть свежие данные
        #if ((utc_now - request_datetime) < timedelta(hours=10)):
        if ((utc_now - last_request_datetime) < timedelta(hours=116)):
            index = hours.index(result['request_time'])
            if index:
                prev_request_time = hours[index - 1]
                prev_request_date = result['request_date']      
            else:
                prev_request_time = 18
                prev_request_date = request_datetime.date() - timedelta(days=1)

            datetime_limit = f'{result['datetime'].date()} 00:00:00'

        
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