from db import query_db
from datetime import datetime, timedelta

def get_all_spots():
    return query_db('SELECT * FROM spots')

def is_active_spot(spot_id):
    last_datetime = query_db('SELECT last_request FROM spots WHERE id=%s', [spot_id], one=True)
    now = datetime.now()
    return (now - last_datetime['last_request']) < timedelta(days=14)

def set_spot_as_active(spot_id):
    return query_db('UPDATE spots SET last_request=%s WHERE id=%s', [datetime.now(), spot_id], one=True)

def get_sounding_data(spot_id):
    return query_db("SELECT * FROM forecast WHERE spot_id=%s AND datetime='2026-03-28 15:00:00' ORDER BY `datetime` DESC, pressure", [spot_id])

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
            row['pressure'],
            row['temp'],
            row['wind_u'],
            row['wind_v']
        ])

    # Создаем плейсхолдеры
    placeholders = ','.join(['(%s, %s, %s, %s, %s, %s, %s, %s, %s)'] * len(data))

    query = f'''
        INSERT INTO forecast 
        (spot_id, request_date, request_time, `datetime`, dewpoint, pressure, temp, wind_u, wind_v)
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
            row['pressure'],
            row['temp'],
            row['wind_u'],
            row['wind_v']
        ])

    # Создаем плейсхолдеры
    placeholders = ','.join(['(%s, %s, %s, %s, %s, %s, %s)'] * len(data))

    query = f'''
        INSERT INTO sounding_archive 
        (spot_id, `datetime`, dewpoint, pressure, temp, wind_u, wind_v)
        VALUES {placeholders}
    '''
    return query_db(query, values)