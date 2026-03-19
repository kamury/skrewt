from flask import Flask, render_template
import pygrib
import math
import numpy as np

from routes.api import api_bp

name = 'main'
app = Flask(name)

app.register_blueprint(api_bp)

@app.route('/')
def index():
  return render_template('index.html')

if name == 'main':
  app.run(debug=True)