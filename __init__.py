from flask import Flask, render_template
import pygrib
import math
import numpy as np
import config, db
import models
import logging
from routes.api import api_bp, load_by_cron
from routes.admin import admin_bp

app = Flask(__name__)

# Настройка логгера для записи ВСЕХ ошибок в файл
file_handler = logging.FileHandler('flask_errors.log')
file_handler.setLevel(logging.ERROR) # Ловим ошибки и критические сообщения
app.logger.addHandler(file_handler)

# Это заставит Flask также писать в лог предупреждения и информацию
# stream_handler = logging.StreamHandler() 
# app.logger.addHandler(stream_handler)
    
app.logger.setLevel(logging.ERROR) 

z = 5

# Простой лог-файл в корне вашего проекта
LOG_FILE = '/home/m/mymysewi/meteo.xcmonsters.com/debug.log'

# Пишем, что начали загрузку
with open(LOG_FILE, 'w') as f:
    f.write("=== Загрузка началась! ===\n")
    f.write(f"Текущая директория: {z}\n")


app.config.from_object(config)

# Инициализируем MySQL с этим приложением
db.init_app(app)

app.register_blueprint(api_bp)
app.register_blueprint(admin_bp)

@app.route('/')
def hello_world():
    with open(LOG_FILE, 'a') as f:
        f.write("Пути добавлены\n")
    #rrr.push('f')
    return soundingForSpot(1)
    #return 'Hello Flask4!'

@app.route('/<int:spot_id>', strict_slashes=False)
def soundingForSpot(spot_id):
  spot = models.get_spot_by_id(spot_id)
  spot_list = models.get_all_spots()
  models.get_all_spots()
  return render_template('index.html', spot = spot, spot_list = spot_list)

@app.cli.command("collect_odd_data")
def collect_odd_data_command():
  load_by_cron(1)
  return

@app.cli.command("collect_even_data")
def collect_even_data_command():
  load_by_cron(0)
  return

if __name__ == '__main__':
    app.run()