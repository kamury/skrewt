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

def save_forecast(data):
    # Преобразуем список словарей в плоский список значений
    values = []
    for row in data:
        # Убедитесь, что порядок полей совпадает с ORDER в INSERT
        values.extend([
            row['spot_id'],
            row['request_date'],
            row['request_time'],
            row['timestamp'],
            row['dewpoint'],
            row['pressure'],
            row['temp'],
            row['wind_u'],
            row['wind_v']
        ])

    # Создаем плейсхолдеры
    placeholders = ','.join(['(%s, %s, %s, %s, %s, %s, %s, %s, %s)'] * len(data))

    print(data, values)

    query = f'''
        INSERT INTO forecast 
        (spot_id, request_date, request_time, `timestamp`, dewpoint, pressure, temp, wind_u, wind_v)
        VALUES {placeholders}
    '''
    
    return query_db(query, values)

def clean_previous_forecast(request_date, request_time):
    return query_db('DELETE FROM forecast WHERE request_date < %s OR request_time < %s', [request_date, request_time], one=True);


    return query_db(query, values)

def add_sounding_archive(station_id, query):
    return query_db(
        '''INSERT INTO souding_data 
            (spot_id, `timestamp`, dewpoint, pressure, temp, wind_u, wind_v)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)''',
        [spot_id, query.timestamp, query.dewpoint, query.pressure, query.wind_u, query.wind_v]
    )