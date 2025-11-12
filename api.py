from flask import Flask, request, jsonify
from flask_cors import CORS
import database
from datetime import datetime, timedelta

app = Flask(__name__)
# Разрешаем CORS для всех доменов (в продакшене лучше указать конкретные)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Инициализация БД при запуске
database.init_db()

@app.route('/api/services', methods=['GET'])
def get_services():
    services = database.get_services()
    return jsonify([{
        'id': s[0],
        'name': s[1],
        'duration': s[2],
        'price': s[3]
    } for s in services])

@app.route('/api/masters', methods=['GET'])
def get_masters():
    masters = database.get_masters()
    return jsonify([{
        'id': m[0],
        'name': m[1]
    } for m in masters])

@app.route('/api/slots', methods=['GET'])
def get_slots():
    date = request.args.get('date')
    master = request.args.get('master')
    if not date:
        return jsonify({'error': 'Date is required'}), 400
    slots = database.get_available_slots(date, master)
    return jsonify(slots)

@app.route('/api/bookings', methods=['POST'])
def create_booking():
    data = request.json
    required_fields = ['user_id', 'service', 'master', 'date', 'time_slot']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    booking_id = database.add_booking(
        user_id=data['user_id'],
        username=data.get('username', ''),
        first_name=data.get('first_name', ''),
        phone=data.get('phone', ''),
        service=data['service'],
        master=data['master'],
        date=data['date'],
        time_slot=data['time_slot']
    )
    return jsonify({'booking_id': booking_id, 'success': True})

@app.route('/api/admin/slots', methods=['GET'])
def get_all_slots():
    user_id = request.args.get('user_id')
    if not user_id or not database.is_admin(int(user_id)):
        return jsonify({'error': 'Unauthorized'}), 403
    
    slots = database.get_all_available_slots()
    return jsonify([{
        'id': s[0],
        'date': s[1],
        'time': s[2],
        'master': s[3],
        'is_available': bool(s[4])
    } for s in slots])

@app.route('/api/admin/slots', methods=['POST'])
def add_slot():
    data = request.json
    user_id = data.get('user_id')
    if not user_id or not database.is_admin(int(user_id)):
        return jsonify({'error': 'Unauthorized'}), 403
    
    required_fields = ['date', 'time', 'master']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    success = database.add_available_slot(
        date=data['date'],
        time=data['time'],
        master=data['master']
    )
    if success:
        return jsonify({'success': True})
    else:
        return jsonify({'error': 'Slot already exists'}), 400

@app.route('/api/admin/slots', methods=['DELETE'])
def delete_slot():
    data = request.json
    user_id = data.get('user_id')
    if not user_id or not database.is_admin(int(user_id)):
        return jsonify({'error': 'Unauthorized'}), 403
    
    required_fields = ['date', 'time', 'master']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    database.remove_available_slot(
        date=data['date'],
        time=data['time'],
        master=data['master']
    )
    return jsonify({'success': True})

@app.route('/api/admin/check', methods=['GET'])
def check_admin():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'is_admin': False})
    is_admin = database.is_admin(int(user_id))
    return jsonify({'is_admin': is_admin})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

