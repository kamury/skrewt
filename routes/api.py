from flask import Blueprint, jsonify, request
import pygrib
import requests
import tempfile
import math
import numpy as np
import os
from datetime import datetime, timezone, timedelta
from metpy.calc import dewpoint_from_relative_humidity
from metpy.units import units
import models

NOAA_DELAY = 3

# Создаем blueprint для API
api_bp = Blueprint('api', __name__, url_prefix='/api')

# Эндпоинт для получения данных
@api_bp.route('/<int:spot_id>', methods=['GET'])
def get_sounding_data(spot_id):
    data = models.get_sounding_data(spot_id)
    return jsonify(data)

    data_by_datetime = {}
    set = []
    current_datetime = False
    data = models.get_sounding_data(spot_id)
    for d in data:
        if d['datetime'] == current_datetime:
            set.append(d)
        else:
            if current_datetime:
                data_by_datetime[current_datetime.strftime('%Y-%m-%d %H:%M')] = set
                set = []
            current_datetime = d['datetime']



    return jsonify(data_by_datetime)

@api_bp.route('/load', methods=['GET'])
def load_by_cron():
    hours = [0, 6, 12, 18]
    local_hours = [0, 9, 12, 15, 18]

    #Получить текущее время UTC
    utc_now = datetime.now(timezone.utc)
    noaa_hour = max([h for h in hours if h < (utc_now.hour - NOAA_DELAY)])

    #для подстановки в урл
    noaa_date_url = utc_now.strftime('%Y%m%d')
    #datetime c noaa_hour для записи в таблицу даты anl
    noaa_datetime = datetime.strptime(f'{utc_now.date()} {noaa_hour}:00', '%Y-%m-%d %H:%M')

    spots = models.get_all_spots()

    for spot in spots:
        #проверяем, может мы на эти даты уже запрашивали
        if models.is_forecast_exist(spot['id'], utc_now.date(), noaa_hour):
            print(spot['id'], 444)
            continue

        lat = int(spot['latitude'])
        lon = int(spot['longtitude'])

        url = f"https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25_1hr.pl?dir=%2Fgfs.{noaa_date_url}%2F{noaa_hour:02d}%2Fatmos&file=gfs.t{noaa_hour:02d}z.pgrb2.0p25.anl&var_RH=on&var_TMP=on&var_UGRD=on&var_VGRD=on&lev_1829_m_above_mean_sea_level=on&lev_2743_m_above_mean_sea_level=on&lev_3658_m_above_mean_sea_level=on&lev_1000_mb=on&lev_975_mb=on&lev_950_mb=on&lev_925_mb=on&lev_900_mb=on&lev_850_mb=on&lev_800_mb=on&lev_750_mb=on&lev_700_mb=on&lev_650_mb=on&lev_600_mb=on&lev_550_mb=on&lev_500_mb=on&lev_450_mb=on&lev_400_mb=on&lev_350_mb=on&lev_300_mb=on&lev_250_mb=on&lev_200_mb=on&lev_150_mb=on&lev_100_mb=on&lev_surface=on&lev_max_wind=on&lev_mean_sea_level=on&lev_boundary_layer_cloud_layer=on&lev_convective_cloud_layer=on&lev_convective_cloud_bottom_level=on&lev_convective_cloud_top_level=on&lev_high_cloud_layer=on&lev_high_cloud_bottom_level=on&lev_high_cloud_top_level=on&lev_low_cloud_layer=on&lev_low_cloud_bottom_level=on&lev_low_cloud_top_level=on&lev_middle_cloud_layer=on&lev_middle_cloud_bottom_level=on&lev_middle_cloud_top_level=on&subregion=&toplat={lat+1}&leftlon={lon}&rightlon={lon+1}&bottomlat={lat}"
        #читаем гриб, пишем данные в табличку
        data = read_grib(url, spot['latitude'], spot['longtitude'])
        models.save_forecast(data, spot['id'], utc_now.date(), noaa_hour, noaa_datetime)
        #чистим все, что старше на 2 дня чем сегодня
        yesterday_date = utc_now.date() - timedelta(days=1)
        models.clean_previous_forecast(spot['id'], yesterday_date)

        #если этих данных нет в архиве, пишем
        if not (models.is_archive_exist(spot['id'], noaa_datetime)):
            models.save_sounding_archive(spot['id'], noaa_datetime, data)
        
        #сдвигаем массив часов, которые мы хотим показывать, по utc
        utc_local_hours = [(h - spot['timezone']) % 24 for h in local_hours]
        utc_local_hours.sort()

        #массив из всех utc_local_hours которые позже нашего anl
        today = [h for h in utc_local_hours if h > noaa_hour]

        print(utc_local_hours)

        for time in today:
            f = time - noaa_hour
            hour_timezone = (time + spot['timezone']) % 24
            forecast_datetime = datetime.strptime(f'{utc_now.date()} {hour_timezone}:00', '%Y-%m-%d %H:%M')
            print(f, time, noaa_hour)
            url = f"https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25_1hr.pl?dir=%2Fgfs.{noaa_date_url}%2F{noaa_hour:02d}%2Fatmos&file=gfs.t{noaa_hour:02d}z.pgrb2.0p25.f0{f:02d}&var_RH=on&var_TMP=on&var_UGRD=on&var_VGRD=on&lev_1829_m_above_mean_sea_level=on&lev_2743_m_above_mean_sea_level=on&lev_3658_m_above_mean_sea_level=on&lev_1000_mb=on&lev_975_mb=on&lev_950_mb=on&lev_925_mb=on&lev_900_mb=on&lev_850_mb=on&lev_800_mb=on&lev_750_mb=on&lev_700_mb=on&lev_650_mb=on&lev_600_mb=on&lev_550_mb=on&lev_500_mb=on&lev_450_mb=on&lev_400_mb=on&lev_350_mb=on&lev_300_mb=on&lev_250_mb=on&lev_200_mb=on&lev_150_mb=on&lev_100_mb=on&lev_surface=on&lev_max_wind=on&lev_mean_sea_level=on&lev_boundary_layer_cloud_layer=on&lev_convective_cloud_layer=on&lev_convective_cloud_bottom_level=on&lev_convective_cloud_top_level=on&lev_high_cloud_layer=on&lev_high_cloud_bottom_level=on&lev_high_cloud_top_level=on&lev_low_cloud_layer=on&lev_low_cloud_bottom_level=on&lev_low_cloud_top_level=on&lev_middle_cloud_layer=on&lev_middle_cloud_bottom_level=on&lev_middle_cloud_top_level=on&subregion=&toplat={lat+1}&leftlon={lon}&rightlon={lon+1}&bottomlat={lat}"
            data = read_grib(url, spot['latitude'], spot['longtitude'])
            models.save_forecast(data, spot['id'], utc_now.date(), noaa_hour, forecast_datetime)

        for i in range(1,4):
            forecast_date = utc_now.date() + timedelta(days=i)
            for time in utc_local_hours:
                f = (time + 24*i) - noaa_hour
                hour_timezone = (time + spot['timezone']) % 24
                forecast_datetime = datetime.strptime(f'{forecast_date} {hour_timezone}:00', '%Y-%m-%d %H:%M')
                print(f, forecast_datetime, time, noaa_hour)
                url = f"https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25_1hr.pl?dir=%2Fgfs.{noaa_date_url}%2F{noaa_hour:02d}%2Fatmos&file=gfs.t{noaa_hour:02d}z.pgrb2.0p25.f0{f:02d}&var_RH=on&var_TMP=on&var_UGRD=on&var_VGRD=on&lev_1829_m_above_mean_sea_level=on&lev_2743_m_above_mean_sea_level=on&lev_3658_m_above_mean_sea_level=on&lev_1000_mb=on&lev_975_mb=on&lev_950_mb=on&lev_925_mb=on&lev_900_mb=on&lev_850_mb=on&lev_800_mb=on&lev_750_mb=on&lev_700_mb=on&lev_650_mb=on&lev_600_mb=on&lev_550_mb=on&lev_500_mb=on&lev_450_mb=on&lev_400_mb=on&lev_350_mb=on&lev_300_mb=on&lev_250_mb=on&lev_200_mb=on&lev_150_mb=on&lev_100_mb=on&lev_surface=on&lev_max_wind=on&lev_mean_sea_level=on&lev_boundary_layer_cloud_layer=on&lev_convective_cloud_layer=on&lev_convective_cloud_bottom_level=on&lev_convective_cloud_top_level=on&lev_high_cloud_layer=on&lev_high_cloud_bottom_level=on&lev_high_cloud_top_level=on&lev_low_cloud_layer=on&lev_low_cloud_bottom_level=on&lev_low_cloud_top_level=on&lev_middle_cloud_layer=on&lev_middle_cloud_bottom_level=on&lev_middle_cloud_top_level=on&subregion=&toplat={lat+1}&leftlon={lon}&rightlon={lon+1}&bottomlat={lat}"
                data = read_grib(url, spot['latitude'], spot['longtitude'])
                models.save_forecast(data, spot['id'], utc_now.date(), noaa_hour, forecast_datetime)




    print(333)
    return jsonify(spots)


    models.set_spot_as_active(1)
    print(models.is_active_spot(1))
    return jsonify({})


@api_bp.route('/dd', methods=['GET'])
def get_dd():
    data = []
    data.append({
            'spot_id': 1,
            'request_date': 'fdsa',
            'request_time': 'dsa',
            'timestamp': 'fw',
            'dewpoint': 12,
            'pressure': 13,
            'temp': 14,
            'wind_u': 1,
            'wind_v': 2
    })
    data.append({
            'spot_id': 1,
            'request_date': 'fdsa2',
            'request_time': 'dsa2',
            'timestamp': 'fw2',
            'dewpoint': 122,
            'pressure': 132,
            'temp': 142,
            'wind_u': 21,
            'wind_v': 22
    })
    return jsonify(models.save_forecast(data))
    
def read_grib(url, point_lat, point_lon):
    print('read', url)

    response = requests.get(url)

    with tempfile.NamedTemporaryFile(mode='wb', suffix='.grib', delete=False) as f:
        f.write(response.content)
        temp_path = f.name

    #читаем из временного файла    
    grbs = pygrib.open(temp_path)
    #grbs = pygrib.open('static/data/grib2.anl')
    
    #получаем все уровни isobaricInhPa и heightAboveSea
    isobaric_levels = []
    aboveSea_levels = []
    
    for grb in grbs:
        if grb.shortName == 't':
            if grb.typeOfLevel == 'isobaricInhPa':
                isobaric_levels.append(grb.level)
            elif grb.typeOfLevel == 'heightAboveSea':
                aboveSea_levels.append(grb.level)

    print(isobaric_levels)
    print(aboveSea_levels)

    #определяем индексы координат ближайших точкек и веса
    distances = []
    indexes = []
    
    up_lat = (point_lat // 0.25) * 0.25
    right_lon = (point_lon // 0.25) * 0.25

    #координаты 4х ближайших точек сетки вокруг нашей точки 
    closed_points = [[up_lat, right_lon], [up_lat, right_lon + 0.25], [up_lat + 0.25, right_lon], [up_lat + 0.25, right_lon + 0.25]]

    #пишем в distance расстояние(веса, по которым будем считать среднее)
    for point in closed_points:
        distances.append(math.sqrt((point_lat - point[0]) ** 2 + (point_lon - point[1]) ** 2))

    #находим индексы этих 4х ближайших точек
    t850 = grbs.select(shortName='t', level=850)
    for it in t850:
        values, lat1, lon1 = it.data()

        lat_ind = [row[0] for row in lat1].index(up_lat)
        lon_ind = np.where(lon1[0] == right_lon)[0][0]
        lat_ind25 = [row[0] for row in lat1].index(up_lat + 0.25)
        lon_ind25 = np.where(lon1[0] == right_lon + 0.25)[0][0]

        indexes = [[lat_ind, lon_ind], [lat_ind, lon_ind25], [lat_ind25, lon_ind], [lat_ind25, lon_ind25]]

    data = []
    params = {'t': 'temp',
              'u': 'wind_u',
              'v': 'wind_v'}

    for level in isobaric_levels:
        line = {}

        for p in params:
            field = grbs.select(shortName=p, level=level)[0]
            print('param', p)
            line[params[p]] = get_average_value(field, indexes, distances)

        #влажность
        field = grbs.select(shortName='r', level=level)[0]
        r = get_average_value(field, indexes, distances)
        dew = dewpoint_from_relative_humidity(line['temp'] *  units.kelvin, r * units.percent)
        line['dewpoint'] = dew.to(units.kelvin).magnitude
        line['pressure'] = level
        data.append(line)

    #добавление кастомных уровней
    aboveSea_levels = [1829, 2743, 3658]
    pressureToSea = [812, 724, 644]

    for i, level in enumerate(aboveSea_levels):
        line = {}

        for p in params:
            field = grbs.select(shortName=p, typeOfLevel='heightAboveSea', level=level)[0]
            line[params[p]] = get_average_value(field, indexes, distances)

        print(line['temp'], math.isnan(line['temp']))

        #может не быть значений для этого левела
        if math.isnan(line['temp']):
            continue        

        #влажность
        boundary1 = (pressureToSea[i] // 50) * 50
        boundary2 = ((pressureToSea[i] // 50)+1) * 50   

        field1 = grbs.select(shortName='r', level=boundary1)[0]
        field2 = grbs.select(shortName='r', level=boundary2)[0]

        r1 = get_average_value(field1, indexes, distances)
        r2 = get_average_value(field2, indexes, distances)

        r = (r1+r2)/2

        dew = dewpoint_from_relative_humidity(line['temp'] *  units.kelvin, r * units.percent)
        line['dewpoint'] = dew.to(units.kelvin).magnitude
        line['pressure'] = pressureToSea[i]

        data.append(line)

    grbs.close()

    #удаляем временный grib
    if os.path.exists(temp_path):
        os.unlink(temp_path)
    
    return data

def get_average_value(field, indexes, distances):
    values, lat1, lon1 = field.data()
    print(values)

    #собираем в массив 4 значения для ближайших точек
    closest_nodes_values = np.array([values[indexes[0][0]][indexes[0][1]], 
                                    values[indexes[1][0]][indexes[1][1]],
                                    values[indexes[2][0]][indexes[2][1]],
                                    values[indexes[3][0]][indexes[3][1]]])

    #возвращаем взвешеное среднее
    return np.sum(closest_nodes_values * distances) / sum(distances)