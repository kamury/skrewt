from flask import Flask, render_template
name = 'main'
app = Flask(name)

@app.route('/')
def index():
  return render_template('index.html')

if name == 'main':
  app.run(debug=True)