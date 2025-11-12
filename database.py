import sqlite3
from datetime import datetime, timedelta
import json

def init_db():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    
    # Таблица записей
    c.execute("""
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            username TEXT,
            first_name TEXT,
            phone TEXT,
            service TEXT,
            master TEXT,
            date TEXT,
            time_slot TEXT,
            confirmed INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Таблица мастеров
    c.execute("""
        CREATE TABLE IF NOT EXISTS masters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            chat_id INTEGER
        )
    """)
    
    # Таблица доступных временных слотов
    c.execute("""
        CREATE TABLE IF NOT EXISTS available_slots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            time TEXT,
            master TEXT,
            is_available INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Таблица админов
    c.execute("""
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE,
            username TEXT
        )
    """)
    
    # Таблица услуг
    c.execute("""
        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            duration INTEGER,
            price INTEGER
        )
    """)
    
    # Добавляем начальные данные, если их нет
    c.execute("SELECT COUNT(*) FROM services")
    if c.fetchone()[0] == 0:
        default_services = [
            ("Маникюр", 60, 1500),
            ("Покрытие гель-лаком", 90, 2000),
            ("Снятие покрытия", 30, 500),
            ("Маникюр + покрытие", 120, 3000)
        ]
        c.executemany("INSERT INTO services (name, duration, price) VALUES (?, ?, ?)", default_services)
    
    # Добавляем начальных мастеров, если их нет
    c.execute("SELECT COUNT(*) FROM masters")
    if c.fetchone()[0] == 0:
        default_masters = [
            ("Анна", None),
            ("Мария", None),
            ("Елена", None)
        ]
        c.executemany("INSERT INTO masters (name, chat_id) VALUES (?, ?)", default_masters)
    
    conn.commit()
    conn.close()

def add_booking(user_id, username, first_name, phone, service, master, date, time_slot):
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute(
        """INSERT INTO bookings (user_id, username, first_name, phone, service, master, date, time_slot) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, username, first_name, phone, service, master, date, time_slot)
    )
    booking_id = c.lastrowid
    # Помечаем слот как занятый
    c.execute(
        "UPDATE available_slots SET is_available = 0 WHERE date = ? AND time = ? AND master = ?",
        (date, time_slot, master)
    )
    conn.commit()
    conn.close()
    return booking_id

def get_available_slots(date, master=None):
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    if master:
        c.execute(
            "SELECT time FROM available_slots WHERE date = ? AND master = ? AND is_available = 1 ORDER BY time",
            (date, master)
        )
    else:
        c.execute(
            "SELECT DISTINCT time FROM available_slots WHERE date = ? AND is_available = 1 ORDER BY time",
            (date,)
        )
    slots = [row[0] for row in c.fetchall()]
    conn.close()
    return slots

def add_available_slot(date, time, master):
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    # Проверяем, не существует ли уже такой слот
    c.execute(
        "SELECT id FROM available_slots WHERE date = ? AND time = ? AND master = ?",
        (date, time, master)
    )
    if c.fetchone():
        conn.close()
        return False
    c.execute(
        "INSERT INTO available_slots (date, time, master, is_available) VALUES (?, ?, ?, 1)",
        (date, time, master)
    )
    conn.commit()
    conn.close()
    return True

def remove_available_slot(date, time, master):
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute(
        "DELETE FROM available_slots WHERE date = ? AND time = ? AND master = ?",
        (date, time, master)
    )
    conn.commit()
    conn.close()

def get_all_available_slots():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute(
        "SELECT id, date, time, master, is_available FROM available_slots ORDER BY date, time"
    )
    slots = c.fetchall()
    conn.close()
    return slots

def get_upcoming_bookings():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("SELECT * FROM bookings WHERE confirmed = 1 ORDER BY date, time_slot")
    data = c.fetchall()
    conn.close()
    return data

def get_master_bookings(master):
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("SELECT * FROM bookings WHERE master=? ORDER BY date, time_slot", (master,))
    data = c.fetchall()
    conn.close()
    return data

def confirm_booking(booking_id):
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("UPDATE bookings SET confirmed=1 WHERE id=?", (booking_id,))
    conn.commit()
    conn.close()

def is_admin(user_id):
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("SELECT id FROM admins WHERE user_id = ?", (user_id,))
    result = c.fetchone()
    conn.close()
    return result is not None

def add_admin(user_id, username):
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    try:
        c.execute("INSERT INTO admins (user_id, username) VALUES (?, ?)", (user_id, username))
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        conn.close()
        return False

def get_services():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("SELECT id, name, duration, price FROM services")
    services = c.fetchall()
    conn.close()
    return services

def get_masters():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("SELECT id, name FROM masters")
    masters = c.fetchall()
    conn.close()
    return masters

def get_master_chat_id(master_name):
    """Получить chat_id мастера по имени"""
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("SELECT chat_id FROM masters WHERE name = ?", (master_name,))
    result = c.fetchone()
    conn.close()
    return result[0] if result else None

def set_master_chat_id(master_name, chat_id):
    """Установить chat_id для мастера"""
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("UPDATE masters SET chat_id = ? WHERE name = ?", (chat_id, master_name))
    conn.commit()
    conn.close()
    return c.rowcount > 0