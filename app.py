from flask import Flask, render_template
import pygrib
import math
import numpy as np
import config, db
from routes.api import api_bp

name = 'main'
app = Flask(name)

app.config.from_object(config)

# Инициализируем MySQL с этим приложением
db.init_app(app)

app.register_blueprint(api_bp)

@app.route('/')
def index():
  return render_template('index.html')

if name == 'main':
  app.run(debug=True)