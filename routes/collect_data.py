from flask import jsonify, render_template, request
import models


@api_bp.route('/', methods=['GET'])
def get_sounding_data():
