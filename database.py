import sqlite3
from datetime import datetime

def init_db():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            username TEXT,
            service TEXT,
            master TEXT,
            date TEXT,
            confirmed INTEGER DEFAULT 0
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS masters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            chat_id INTEGER
        )
    """)
    conn.commit()
    conn.close()

def add_booking(user_id, username, service, master, date):
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute(
        "INSERT INTO bookings (user_id, username, service, master, date) VALUES (?, ?, ?, ?, ?)",
        (user_id, username, service, master, date)
    )
    conn.commit()
    conn.close()

def get_upcoming_bookings():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("SELECT * FROM bookings WHERE confirmed = 1")
    data = c.fetchall()
    conn.close()
    return data

def get_master_bookings(master):
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("SELECT * FROM bookings WHERE master=? ORDER BY date", (master,))
    data = c.fetchall()
    conn.close()
    return data

def confirm_booking(booking_id):
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("UPDATE bookings SET confirmed=1 WHERE id=?", (booking_id,))
    conn.commit()
    conn.close()
