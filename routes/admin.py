from datetime import datetime
from functools import wraps
from flask import Blueprint, render_template, request, redirect, url_for, session, flash, abort
import models

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

#формат, который понимает <input type="datetime-local">
INPUT_DATETIME_FORMAT = '%Y-%m-%dT%H:%M'
#что готовы разобрать из формы: с секундами и без, через T и через пробел
DATETIME_FORMATS = ('%Y-%m-%dT%H:%M:%S', '%Y-%m-%dT%H:%M', '%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M')


@admin_bp.app_template_filter('dt')
def format_datetime(value):
    """Дата для показа в таблице. Из базы может прийти и datetime, и строка."""
    if not value:
        return '—'
    if isinstance(value, str):
        return value[:16].replace('T', ' ')
    return value.strftime('%d.%m.%Y %H:%M')


def datetime_for_input(value):
    """Значение для поля формы."""
    if not value:
        return ''
    if isinstance(value, str):
        #строка уже пришла из формы, отдаем обратно как есть
        return value
    return value.strftime(INPUT_DATETIME_FORMAT)


def login_required(view):
    """Пускает в админку только залогиненных."""
    @wraps(view)
    def wrapper(*args, **kwargs):
        if not session.get('admin_login'):
            return redirect(url_for('admin.login', next=request.path))
        return view(*args, **kwargs)
    return wrapper


@admin_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        login_value = request.form.get('login', '').strip()
        password = request.form.get('password', '')

        if models.check_admin_credentials(login_value, password):
            session['admin_login'] = login_value
            #next берем только как локальный путь, чтобы не редиректить на чужой домен
            next_path = request.form.get('next', '')
            if next_path.startswith('/') and not next_path.startswith('//'):
                return redirect(next_path)
            return redirect(url_for('admin.spots'))

        flash('Неверный логин или пароль')

    return render_template('admin/login.html', next=request.args.get('next', ''))


@admin_bp.route('/logout')
def logout():
    session.pop('admin_login', None)
    return redirect(url_for('admin.login'))


@admin_bp.route('/')
@login_required
def spots():
    return render_template('admin/spots.html', spots=models.get_all_spots_for_admin())


def parse_spot_form(form):
    """Достает поля спота из формы. Возвращает (значения, список ошибок)."""
    errors = []

    title = form.get('title', '').strip()
    if not title:
        errors.append('Название не может быть пустым')

    def parse_number(field, label, cast, low, high):
        raw = form.get(field, '').strip().replace(',', '.')
        if not raw:
            errors.append(f'{label}: не заполнено')
            return None
        try:
            value = cast(raw)
        except ValueError:
            errors.append(f'{label}: нужно число')
            return None
        if not (low <= value <= high):
            errors.append(f'{label}: должно быть от {low} до {high}')
            return None
        return value

    latitude = parse_number('latitude', 'Широта', float, -90, 90)
    longtitude = parse_number('longtitude', 'Долгота', float, -180, 180)
    timezone = parse_number('timezone', 'Часовой пояс', int, -12, 14)

    #пустое поле — это NULL в базе, а не ошибка
    raw_last_request = form.get('last_request', '').strip()
    last_request = None

    if raw_last_request:
        for fmt in DATETIME_FORMATS:
            try:
                last_request = datetime.strptime(raw_last_request, fmt)
                break
            except ValueError:
                continue
        else:
            errors.append('Последний запрос: нужен формат ГГГГ-ММ-ДД ЧЧ:ММ')

    values = {
        'title': title,
        'latitude': latitude,
        'longtitude': longtitude,
        'timezone': timezone,
        'is_active': 1 if form.get('is_active') else 0,
        'last_request': last_request,
    }

    return values, errors


@admin_bp.route('/spot/new', methods=['GET', 'POST'])
@login_required
def create_spot():
    #новый спот по умолчанию активен, дату последнего запроса ставим текущую,
    #иначе он сразу считается заброшенным и данные по нему собираться не будут
    spot = {'id': None, 'title': '', 'latitude': '', 'longtitude': '', 'timezone': '',
            'is_active': 1, 'last_request': datetime.now()}

    if request.method == 'POST':
        values, errors = parse_spot_form(request.form)

        if errors:
            #возвращаем в форму то, что ввели, чтобы не набирать заново
            spot.update(request.form.to_dict())
            spot['is_active'] = values['is_active']
            return render_template('admin/spot_form.html', spot=spot, errors=errors, is_new=True,
                                   last_request_value=datetime_for_input(spot['last_request']))

        spot_id = models.create_spot(values['title'], values['latitude'], values['longtitude'],
                                     values['timezone'], values['is_active'], values['last_request'])
        flash(f'Спот «{values["title"]}» добавлен')
        return redirect(url_for('admin.edit_spot', spot_id=spot_id))

    return render_template('admin/spot_form.html', spot=spot, errors=[], is_new=True,
                           last_request_value=datetime_for_input(spot['last_request']))


@admin_bp.route('/spot/<int:spot_id>', methods=['GET', 'POST'])
@login_required
def edit_spot(spot_id):
    spot = models.get_spot_by_id(spot_id)

    if not spot:
        abort(404)

    if request.method == 'POST':
        values, errors = parse_spot_form(request.form)

        if errors:
            spot = dict(spot)
            spot.update(request.form.to_dict())
            spot['id'] = spot_id
            spot['is_active'] = values['is_active']
            return render_template('admin/spot_form.html', spot=spot, errors=errors, is_new=False,
                                   last_request_value=datetime_for_input(spot['last_request']))

        models.update_spot(spot_id, values['title'], values['latitude'], values['longtitude'],
                           values['timezone'], values['is_active'], values['last_request'])
        flash('Изменения сохранены')
        return redirect(url_for('admin.edit_spot', spot_id=spot_id))

    return render_template('admin/spot_form.html', spot=spot, errors=[], is_new=False,
                           last_request_value=datetime_for_input(spot['last_request']))


@admin_bp.route('/spot/<int:spot_id>/toggle', methods=['POST'])
@login_required
def toggle_spot(spot_id):
    spot = models.get_spot_by_id(spot_id)

    if not spot:
        abort(404)

    is_active = 0 if spot['is_active'] else 1
    models.set_spot_activity(spot_id, is_active)
    flash(f'Спот «{spot["title"]}» {"включен" if is_active else "отключен"}')

    return redirect(url_for('admin.spots'))
