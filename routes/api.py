from flask import Blueprint, jsonify, request
import pygrib
import requests
import tempfile
import math
import numpy as np
import os
from datetime import datetime, timezone
from metpy.calc import dewpoint_from_relative_humidity
from metpy.units import units
import models

NOAA_DELAY = 3

# Создаем blueprint для API
api_bp = Blueprint('api', __name__, url_prefix='/api')

# Эндпоинт для получения данных
@api_bp.route('/', methods=['GET'])
def get_sounding_data():
    data = read_grib('f', 54.8, 37.9)

    return jsonify(data)

@api_bp.route('/load', methods=['GET'])
def load_by_cron():
    spots = models.get_all_spots()

    hours = [0, 6, 12, 18]

    # Получить текущее время UTC
    utc_now = datetime.now(timezone.utc)
    i = len(hours) - 1
    while(hours[i] > (utc_now.hour - NOAA_DELAY)):
        i-=1
    current_noaa_hour = hours[i]
    
    if current_noaa_hour < 12:
        current_noaa_hour_str = f'0{current_noaa_hour}'
    else:
        current_noaa_hour_str = current_noaa_hour

    current_noaa_date = utc_now.strftime('%Y%m%d')

    for spot in spots:
        print(spot)
        lat = int(spot['latitude'])
        lon = int(spot['longtitude'])

        url = f"https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25_1hr.pl?dir=%2Fgfs.{current_noaa_date}%2F{current_noaa_hour_str}%2Fatmos&file=gfs.t{current_noaa_hour_str}z.pgrb2.0p25.anl&var_RH=on&var_TMP=on&var_UGRD=on&var_VGRD=on&lev_1829_m_above_mean_sea_level=on&lev_2743_m_above_mean_sea_level=on&lev_3658_m_above_mean_sea_level=on&lev_1000_mb=on&lev_975_mb=on&lev_950_mb=on&lev_925_mb=on&lev_900_mb=on&lev_850_mb=on&lev_800_mb=on&lev_750_mb=on&lev_700_mb=on&lev_650_mb=on&lev_600_mb=on&lev_550_mb=on&lev_500_mb=on&lev_450_mb=on&lev_400_mb=on&lev_350_mb=on&lev_300_mb=on&lev_250_mb=on&lev_200_mb=on&lev_150_mb=on&lev_100_mb=on&lev_surface=on&lev_max_wind=on&lev_mean_sea_level=on&lev_boundary_layer_cloud_layer=on&lev_convective_cloud_layer=on&lev_convective_cloud_bottom_level=on&lev_convective_cloud_top_level=on&lev_high_cloud_layer=on&lev_high_cloud_bottom_level=on&lev_high_cloud_top_level=on&lev_low_cloud_layer=on&lev_low_cloud_bottom_level=on&lev_low_cloud_top_level=on&lev_middle_cloud_layer=on&lev_middle_cloud_bottom_level=on&lev_middle_cloud_top_level=on&subregion=&toplat={lat+1}&leftlon={lon}&rightlon={lon+1}&bottomlat={lat}"

        data = read_grib(url, spot['latitude'], spot['longtitude'])

        
        print(url)
        #request_date = 

        #url = "https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25_1hr.pl?dir=%2Fgfs.20260318%2F00%2Fatmos&file=gfs.t00z.pgrb2.0p25.f000&var_RH=on&var_TMP=on&var_UGRD=on&var_VGRD=on&lev_1829_m_above_mean_sea_level=on&lev_2743_m_above_mean_sea_level=on&lev_3658_m_above_mean_sea_level=on&lev_1000_mb=on&lev_975_mb=on&lev_950_mb=on&lev_925_mb=on&lev_900_mb=on&lev_850_mb=on&lev_800_mb=on&lev_750_mb=on&lev_700_mb=on&lev_650_mb=on&lev_600_mb=on&lev_550_mb=on&lev_500_mb=on&lev_450_mb=on&lev_400_mb=on&lev_350_mb=on&lev_300_mb=on&lev_250_mb=on&lev_200_mb=on&lev_150_mb=on&lev_100_mb=on&lev_surface=on&lev_max_wind=on&lev_mean_sea_level=on&lev_boundary_layer_cloud_layer=on&lev_convective_cloud_layer=on&lev_convective_cloud_bottom_level=on&lev_convective_cloud_top_level=on&lev_high_cloud_layer=on&lev_high_cloud_bottom_level=on&lev_high_cloud_top_level=on&lev_low_cloud_layer=on&lev_low_cloud_bottom_level=on&lev_low_cloud_top_level=on&lev_middle_cloud_layer=on&lev_middle_cloud_bottom_level=on&lev_middle_cloud_top_level=on&subregion=&toplat=55&leftlon=37&rightlon=38&bottomlat=54"


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

def get_average_value(field, indexes, distances):
    values, lat1, lon1 = field.data()

    #собираем в массив 4 значения для ближайших точек
    closest_nodes_values = np.array([values[indexes[0][0]][indexes[0][1]], 
                                    values[indexes[1][0]][indexes[1][1]],
                                    values[indexes[2][0]][indexes[2][1]],
                                    values[indexes[3][0]][indexes[3][1]]])

    #возвращаем взвешеное среднее
    return np.sum(closest_nodes_values * distances) / sum(distances)
    #return average_with_distances(closest_nodes_values, distances)

def read_grib(url, point_lat, point_lon):
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