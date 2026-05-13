from flask import Flask, render_template
import pygrib
import math
import numpy as np
import config, db
import models
from routes.api import api_bp

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

if name == 'main':
  app.run(debug=True)