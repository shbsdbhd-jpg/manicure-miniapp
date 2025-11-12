# 📊 Руководство по базе данных

## Структура базы данных

База данных создается автоматически при первом запуске бота. Файл базы данных: `database.db` (SQLite)

## Таблицы в базе данных

### 1. Таблица `bookings` (Записи клиентов)

```sql
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,              -- ID пользователя Telegram
    username TEXT,                -- Username в Telegram
    first_name TEXT,              -- Имя пользователя
    phone TEXT,                   -- Номер телефона
    service TEXT,                 -- Название услуги
    master TEXT,                  -- Имя мастера
    date TEXT,                    -- Дата записи (формат: YYYY-MM-DD)
    time_slot TEXT,               -- Время записи (формат: HH:MM)
    confirmed INTEGER DEFAULT 0,  -- Подтверждена ли запись (0/1)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP  -- Дата создания записи
)
```

**Пример записи:**
```
id: 1
user_id: 123456789
username: @username
first_name: Иван
phone: +7 (999) 123-45-67
service: Классический маникюр
master: Анна
date: 2025-01-15
time_slot: 14:00
confirmed: 0
created_at: 2025-01-14 10:30:00
```

### 2. Таблица `masters` (Мастера)

```sql
CREATE TABLE IF NOT EXISTS masters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,      -- Имя мастера (уникальное)
    chat_id INTEGER        -- Telegram chat_id мастера (для уведомлений)
)
```

**Начальные данные:**
- Анна
- Мария
- Елена

### 3. Таблица `available_slots` (Доступные временные слоты)

```sql
CREATE TABLE IF NOT EXISTS available_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,                    -- Дата слота (формат: YYYY-MM-DD)
    time TEXT,                    -- Время слота (формат: HH:MM)
    master TEXT,                  -- Имя мастера
    is_available INTEGER DEFAULT 1,  -- Доступен ли слот (0/1)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
```

### 4. Таблица `admins` (Администраторы)

```sql
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE,  -- Telegram user_id администратора
    username TEXT            -- Username администратора
)
```

### 5. Таблица `services` (Услуги)

```sql
CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,    -- Название услуги
    duration INTEGER,    -- Длительность в минутах
    price INTEGER        -- Цена в рублях
)
```

**Начальные данные:**
- Маникюр (60 мин, 1500 ₽)
- Покрытие гель-лаком (90 мин, 2000 ₽)
- Снятие покрытия (30 мин, 500 ₽)
- Маникюр + покрытие (120 мин, 3000 ₽)

## Как создать базу данных

### Автоматическое создание

База данных создается автоматически при первом запуске бота:

```python
# В bot.py
database.init_db()  # Вызывается автоматически при запуске
```

### Ручное создание

Вы можете создать базу данных вручную, запустив:

```bash
python init_db.py
```

Это создаст базу данных и добавит тестовые данные.

## Основные функции работы с базой данных

### Создание записи

```python
booking_id = database.add_booking(
    user_id=123456789,
    username="@username",
    first_name="Иван",
    phone="+7 (999) 123-45-67",
    service="Классический маникюр",
    master="Анна",
    date="2025-01-15",
    time_slot="14:00"
)
```

### Получение записей мастера

```python
bookings = database.get_master_bookings("Анна")
# Возвращает список всех записей для мастера "Анна"
```

### Получение доступных слотов

```python
slots = database.get_available_slots("2025-01-15", master="Анна")
# Возвращает список доступных времен для указанной даты и мастера
```

### Проверка администратора

```python
is_admin = database.is_admin(user_id)
# Возвращает True, если пользователь является администратором
```

## Просмотр базы данных

### Через Python

```python
import sqlite3

conn = sqlite3.connect("database.db")
c = conn.cursor()

# Просмотр всех записей
c.execute("SELECT * FROM bookings")
print(c.fetchall())

# Просмотр записей конкретного мастера
c.execute("SELECT * FROM bookings WHERE master = ?", ("Анна",))
print(c.fetchall())

conn.close()
```

### Через SQLite Browser

1. Скачайте [DB Browser for SQLite](https://sqlitebrowser.org/)
2. Откройте файл `database.db`
3. Просматривайте и редактируйте данные

### Через командную строку

```bash
sqlite3 database.db

# Просмотр всех записей
SELECT * FROM bookings;

# Просмотр записей мастера
SELECT * FROM bookings WHERE master = 'Анна';

# Выход
.quit
```

## Структура данных записей

Когда вы получаете запись из базы данных, она возвращается как кортеж:

```python
booking = (id, user_id, username, first_name, phone, service, master, date, time_slot, confirmed, created_at)

# Индексы:
# 0 - id
# 1 - user_id
# 2 - username
# 3 - first_name
# 4 - phone
# 5 - service
# 6 - master
# 7 - date
# 8 - time_slot
# 9 - confirmed
# 10 - created_at
```

## Резервное копирование

Рекомендуется регулярно делать резервные копии базы данных:

```bash
# Копирование базы данных
cp database.db database_backup.db

# Или через Python
import shutil
shutil.copy("database.db", "database_backup.db")
```

## Восстановление базы данных

Если нужно восстановить базу данных:

```bash
# Восстановление из резервной копии
cp database_backup.db database.db
```

## Очистка базы данных

⚠️ **Внимание:** Это удалит все данные!

```python
import os
os.remove("database.db")
# Затем перезапустите бота - база создастся заново
```

## Добавление тестовых данных

Запустите скрипт для добавления тестовых слотов:

```bash
python init_db.py
```

Это добавит доступные слоты на ближайшие 7 дней для всех мастеров.

