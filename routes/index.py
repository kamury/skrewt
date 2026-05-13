from flask import jsonify, render_template, request
from .. import app
from ..models import get_all_stations, get_station_by_id, get_station_data_per_page, get_station_data_total_count
from ..config import ITEMS_PER_PAGE
import traceback
import math


@app.route('/')
def index():
    try:
        stations = get_all_stations()
        return render_template('index.html', stations=stations)
    except Exception as e:
        app.logger.info(f'Error: {e}')
        return jsonify({"error": f'Error: {e}'}),500