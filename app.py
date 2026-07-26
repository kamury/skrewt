from flask import Flask, render_template, Response, abort
import pygrib
import math
import numpy as np
import config, db
import models
from routes.api import api_bp, load_by_cron
from routes.admin import admin_bp

name = 'main'
app = Flask(name)

app.config.from_object(config)

# Инициализируем MySQL с этим приложением
db.init_app(app)

app.register_blueprint(api_bp)
app.register_blueprint(admin_bp)

@app.route('/')
def index():
  #по умолчанию, показываем диаграмму для Журавлей
  return soundingForSpot(1)

@app.route('/<int:spot_id>')
def soundingForSpot(spot_id):
  spot = models.get_spot_by_id(spot_id)

  #отключенный спот публично не показываем, он остается только в админке
  if not spot or not spot['is_active']:
    abort(404)

  spot_list = models.get_all_spots()
  return render_template('index.html', spot = spot, spot_list = spot_list)

@app.route('/<int:spot_id>/')
def soundingForSpotWithSlash(spot_id):
    return soundingForSpot(spot_id)

#основной домен сайта, попадает в sitemap.xml и robots.txt
BASE_URL = 'https://metpara.ru'

@app.route('/sitemap.xml')
def sitemap():
  #карта сайта: главная + страница каждого спота из БД
  spots = models.get_all_spots()

  lines = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
           f'  <url><loc>{BASE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>']

  for spot in spots:
    lines.append(f'  <url><loc>{BASE_URL}/{spot["id"]}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>')

  lines.append('</urlset>')
  return Response('\n'.join(lines), mimetype='application/xml')

@app.route('/robots.txt')
def robots():
  #api и админку не индексируем, указываем путь к карте сайта
  text = f'User-agent: *\nDisallow: /api/\nDisallow: /admin/\nSitemap: {BASE_URL}/sitemap.xml\n'
  return Response(text, mimetype='text/plain')

@app.cli.command("collect_odd_data")
def collect_odd_data_command():
  load_by_cron(1)
  return

@app.cli.command("collect_even_data")
def collect_even_data_command():
  load_by_cron(0)
  return

if __name__ == '__main__':
  app.run(debug=True)