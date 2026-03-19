from flask import Blueprint, jsonify, request
import pygrib
import requests
import tempfile
import math
import numpy as np
import os
from metpy.calc import dewpoint_from_relative_humidity
from metpy.units import units

# Создаем blueprint для API
api_bp = Blueprint('api', __name__, url_prefix='/api')

# Эндпоинт для получения данных
@api_bp.route('/', methods=['GET'])
def get_sounding_data():
    #url = "https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25_1hr.pl?dir=%2Fgfs.20260318%2F00%2Fatmos&file=gfs.t00z.pgrb2.0p25.anl&all_var=on&lev_2_m_above_ground=on&lev_100_m_above_ground=on&lev_1000_m_above_ground=on&lev_4000_m_above_ground=on&lev_1829_m_above_mean_sea_level=on&lev_2743_m_above_mean_sea_level=on&lev_3658_m_above_mean_sea_level=on&lev_1000_mb=on&lev_975_mb=on&lev_950_mb=on&lev_925_mb=on&lev_900_mb=on&lev_850_mb=on&lev_800_mb=on&lev_750_mb=on&lev_700_mb=on&lev_650_mb=on&lev_600_mb=on&lev_550_mb=on&lev_500_mb=on&lev_450_mb=on&lev_400_mb=on&lev_350_mb=on&lev_300_mb=on&lev_250_mb=on&lev_200_mb=on&lev_150_mb=on&lev_100_mb=on&lev_surface=on&lev_max_wind=on&lev_mean_sea_level=on&lev_boundary_layer_cloud_layer=on&lev_convective_cloud_layer=on&lev_convective_cloud_bottom_level=on&lev_convective_cloud_top_level=on&lev_high_cloud_layer=on&lev_high_cloud_bottom_level=on&lev_high_cloud_top_level=on&lev_low_cloud_layer=on&lev_low_cloud_bottom_level=on&lev_low_cloud_top_level=on&lev_middle_cloud_layer=on&lev_middle_cloud_bottom_level=on&lev_middle_cloud_top_level=on&subregion=&toplat=55&leftlon=37&rightlon=38&bottomlat=54"
    url = "https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25_1hr.pl?dir=%2Fgfs.20260318%2F00%2Fatmos&file=gfs.t00z.pgrb2.0p25.f000&var_RH=on&var_TMP=on&var_UGRD=on&var_VGRD=on&lev_1829_m_above_mean_sea_level=on&lev_2743_m_above_mean_sea_level=on&lev_3658_m_above_mean_sea_level=on&lev_1000_mb=on&lev_975_mb=on&lev_950_mb=on&lev_925_mb=on&lev_900_mb=on&lev_850_mb=on&lev_800_mb=on&lev_750_mb=on&lev_700_mb=on&lev_650_mb=on&lev_600_mb=on&lev_550_mb=on&lev_500_mb=on&lev_450_mb=on&lev_400_mb=on&lev_350_mb=on&lev_300_mb=on&lev_250_mb=on&lev_200_mb=on&lev_150_mb=on&lev_100_mb=on&lev_surface=on&lev_max_wind=on&lev_mean_sea_level=on&lev_boundary_layer_cloud_layer=on&lev_convective_cloud_layer=on&lev_convective_cloud_bottom_level=on&lev_convective_cloud_top_level=on&lev_high_cloud_layer=on&lev_high_cloud_bottom_level=on&lev_high_cloud_top_level=on&lev_low_cloud_layer=on&lev_low_cloud_bottom_level=on&lev_low_cloud_top_level=on&lev_middle_cloud_layer=on&lev_middle_cloud_bottom_level=on&lev_middle_cloud_top_level=on&subregion=&toplat=55&leftlon=37&rightlon=38&bottomlat=54"

    response = requests.get(url)

    with tempfile.NamedTemporaryFile(mode='wb', suffix='.grib', delete=False) as f:
        f.write(response.content)
        temp_path = f.name

    print(temp_path)
    grbs = pygrib.open(temp_path)
    #grbs = pygrib.open('static/data/grib2.anl')


    '''print("ВСЕ УРОВНИ ДЛЯ ТЕМПЕРАТУРЫ:")
    for grb in grbs:
        if grb.shortName == 'u':  # температура
            print(f"  Тип: {grb.typeOfLevel}, Уровень: {grb.level}")

    print("ВСЕ УРОВНИ ДЛЯ влажностиd:")
    for grb in grbs:
        if grb.shortName == 'u':  # температура
            print(f"  Тип: {grb.typeOfLevel}, Уровень: {grb.level}")
    
    return jsonify({'tt': 2})'''

    #получаем все уровни isobaricInhPa
    #TODO: добавить heightAboveSea и heightAboveGround, для влажности точек нет, нужно апроксимировать
    isobaric_levels = []
    #aboveSea_levels = []
    for grb in grbs:
        if grb.shortName == 'r':  # температура
            if grb.typeOfLevel == 'isobaricInhPa':
                isobaric_levels.append(grb.level)
            #elif grb.typeOfLevel == 'heightAboveSea':
            #    aboveSea_levels.append(grb.level)

    #определяем индексы координат ближайших точкек и веса
    distances = []
    indexes = []

    #TODO:координаты точки
    point_lat = 54.67
    point_lon = 37.97

    up_lat = (point_lat // 0.25) * 0.25
    right_lon = (point_lon // 0.25) * 0.25

    closed_points = [[up_lat, right_lon], [up_lat, right_lon + 0.25], [up_lat + 0.25, right_lon], [up_lat + 0.25, right_lon + 0.25]]

    for point in closed_points:
        distances.append(math.sqrt((point_lat - point[0]) ** 2 + (point_lon - point[1]) ** 2))

    #print(distances)

    t850 = grbs.select(shortName='t', level=850)
    for it in t850:
        values, lat1, lon1 = it.data()

        lat_ind = [row[0] for row in lat1].index(up_lat)
        
        lon_ind = np.where(lon1[0] == right_lon)[0][0]

        lat_ind25 = [row[0] for row in lat1].index(up_lat + 0.25)
        
        lon_ind25 = np.where(lon1[0] == right_lon + 0.25)[0][0]

        indexes = [[lat_ind, lon_ind], [lat_ind, lon_ind25], [lat_ind25, lon_ind], [lat_ind25, lon_ind25]]

    #print(indexes)
    data = []
    params = {'t': 'temp',
              'u': 'wind_u',
              'v': 'wind_v'}

    aboveSea_levels = [3658, 2743, 1829]
    pressureToSea = [644, 724, 812]
    boundaryPressure = [600, 700, 800]

    for level in isobaric_levels:
        data.append(get_grib_line(grbs, level, params, indexes, distances))
        
        if level in boundaryPressure:
            line = {}
            level_index = boundaryPressure.index(level)
            print(level_index, level)
            for p in params:
                field = grbs.select(shortName=p,  typeOfLevel='heightAboveSea', level=aboveSea_levels[level_index])[0]
                line[params[p]] = get_grib_data(field, indexes, distances)

            #влажность
            boundary1 = (pressureToSea[level_index] // 50) * 50
            boundary2 = ((pressureToSea[level_index] // 50)+1) * 50   

            field1 = grbs.select(shortName='r', level=boundary1)[0]
            field2 = grbs.select(shortName='r', level=boundary2)[0]

            r1 = get_grib_data(field1, indexes, distances)
            r2 = get_grib_data(field2, indexes, distances)
            r = (r1+r2)/2

            dew = dewpoint_from_relative_humidity(line['temp'] *  units.kelvin, r * units.percent)
            line['dewpoint'] = dew.m + 273.15
            line['pressure'] = pressureToSea[level_index]
            data.append(line)


    '''aboveSea_levels = [1829, 2743, 3658]
    pressureToSea = [812, 724, 644]

    for i, level in enumerate(aboveSea_levels):
        line = {}
        for p in params:
            field = grbs.select(shortName=p,  typeOfLevel='heightAboveSea', level=level)[0]
            line[params[p]] = get_grib_data(field, indexes, distances)

        #влажность
        boundary1 = (pressureToSea[i] // 50) * 50
        boundary2 = ((pressureToSea[i] // 50)+1) * 50   

        field1 = grbs.select(shortName='r', level=boundary1)[0]
        field2 = grbs.select(shortName='r', level=boundary2)[0]

        r1 = get_grib_data(field1, indexes, distances)
        r2 = get_grib_data(field2, indexes, distances)

        r = (r1+r2)/2

        dew = dewpoint_from_relative_humidity(line['temp'] *  units.kelvin, r * units.percent)
        line['dewpoint'] = dew.m + 273.15

        line['pressure'] = pressureToSea[i]

        data.append(line)'''
        
        
    grbs.close()

    #удаляем временный grib
    if os.path.exists(temp_path):
            os.unlink(temp_path)

    return jsonify(data)

def average_with_distances(values, distances):
    return np.sum(values * distances) / sum(distances)

def get_grib_data(field, indexes, distances):
    values, lat1, lon1 = field.data()

    #собираем в массив 4 значения для ближайших точек
    closest_nodes_values = np.array([values[indexes[0][0]][indexes[0][1]], 
                                    values[indexes[1][0]][indexes[1][1]],
                                    values[indexes[2][0]][indexes[2][1]],
                                    values[indexes[3][0]][indexes[3][1]]])

    #возвращаем взвешеное среднее
    return average_with_distances(closest_nodes_values, distances)

def get_grib_line(grbs, level, params, indexes, distances):
    line = {}

    for p in params:
        field = grbs.select(shortName=p, level=level)[0]
        line[params[p]] = get_grib_data(field, indexes, distances)

    #влажность
    field = grbs.select(shortName='r', level=level)[0]

    r = get_grib_data(field, indexes, distances)

    dew = dewpoint_from_relative_humidity(line['temp'] *  units.kelvin, r * units.percent)
    line['dewpoint'] = dew.m + 273.15

    line['pressure'] = level
    return line


