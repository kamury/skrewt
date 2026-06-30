from flask import Flask, render_template
import pygrib
import math
import numpy as np
import config, db
import models
from routes.api import api_bp, load_by_cron

name = 'main'
app = Flask(name)

app.config.from_object(config)

# Инициализируем MySQL с этим приложением
db.init_app(app)

app.register_blueprint(api_bp)

@app.route('/')
def index():
  #по умолчанию, показываем диаграмму для Журавлей
  return soundingForSpot(1)

@app.route('/<int:spot_id>')
def soundingForSpot(spot_id):
  spot = models.get_spot_by_id(spot_id)
  spot_list = models.get_all_spots()
  models.get_all_spots()
  return render_template('index.html', spot = spot, spot_list = spot_list)

@app.route('/<int:spot_id>/')
def soundingForSpotWithSlash(spot_id):
    return soundingForSpot(spot_id)

@app.cli.command("collect_odd_data")
def collect_odd_data_command():
  load_by_cron(1)
  return

@app.cli.command("collect_even_data")
def collect_even_data_command():
  load_by_cron(0)
  return

if name == 'main':
  app.run(debug=True)