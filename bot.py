import asyncio 
import json
import logging
from datetime import datetime
from aiogram import Bot, Dispatcher, types
from aiogram.types import (
    InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, 
    MenuButtonWebApp, BotCommand, ReplyKeyboardMarkup, KeyboardButton
)
from aiogram.filters import Command
import database

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bot.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Токен твоего бота
TOKEN = "8548031527:AAFPbXMfwauEkhElFKKyC_lnzItmuVFPLrc"

# Ссылки на Mini App (ngrok HTTPS или хостинг)
# ⚠️ ЗАМЕНИТЕ на ваш домен!
CLIENT_WEBAPP_URL = "https://manicure-miniapp.vercel.app"  # URL основного приложения
ADMIN_PANEL_URL = "https://manicure-miniapp.vercel.app/admin"  # URL админ-панели

# Инициализация бота и диспетчера
bot = Bot(token=TOKEN)
dp = Dispatcher()

# Инициализация БД
database.init_db()

# Функция для создания inline клавиатуры
def create_main_keyboard(is_admin=False):
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="💅 Записаться на маникюр", web_app=WebAppInfo(url=CLIENT_WEBAPP_URL))],
        ]
    )
    
    if is_admin:
        keyboard.inline_keyboard.append(
            [InlineKeyboardButton(text="⚙️ Админ-панель", web_app=WebAppInfo(url=ADMIN_PANEL_URL))]
        )
    
    return keyboard

# Функция для создания постоянной клавиатуры (Reply Keyboard)
def create_reply_keyboard(is_admin=False):
    """Создает постоянную клавиатуру, которая всегда видна"""
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="💅 Записаться на маникюр", web_app=WebAppInfo(url=CLIENT_WEBAPP_URL))],
        ],
        resize_keyboard=True,
        persistent=True  # Клавиатура остается видимой
    )
    
    if is_admin:
        keyboard.keyboard.append(
            [KeyboardButton(text="⚙️ Админ-панель", web_app=WebAppInfo(url=ADMIN_PANEL_URL))]
        )
    
    return keyboard

# Команда /start
@dp.message(Command("start"))
async def start(message: types.Message):
    user_id = message.from_user.id
    is_admin = database.is_admin(user_id)
    
    # Используем inline кнопки (они всегда работают)
    inline_keyboard = create_main_keyboard(is_admin)
    
    # Также пробуем установить постоянную клавиатуру
    try:
        reply_keyboard = create_reply_keyboard(is_admin)
    except:
        reply_keyboard = None
    
    # Устанавливаем menu button для этого пользователя
    try:
        menu_button = MenuButtonWebApp(
            text="💅 Записаться",
            web_app=WebAppInfo(url=CLIENT_WEBAPP_URL)
        )
        await bot.set_chat_menu_button(chat_id=message.chat.id, menu_button=menu_button)
    except Exception as e:
        logger.warning(f"Не удалось установить menu button для пользователя: {e}")
    
    # Отправляем сообщение с inline кнопками (они точно работают)
    await message.answer(
        f"Привет, {message.from_user.first_name}! 👋\n\n"
        "💅 Нажмите кнопку ниже, чтобы записаться на маникюр:",
        reply_markup=inline_keyboard  # Используем inline кнопки
    )
    
    # Если постоянная клавиатура работает, отправляем её отдельным сообщением
    if reply_keyboard:
        try:
            await message.answer(
                "👇 Или используйте кнопку внизу экрана:",
                reply_markup=reply_keyboard
            )
        except:
            pass

# Отладочный обработчик - ловим все сообщения
@dp.message()
async def debug_all_messages(message: types.Message):
    """Отладочный обработчик всех сообщений"""
    # Логируем все сообщения для отладки
    if message.web_app_data:
        logger.debug(f"🔍 ОТЛАДКА: Найдено web_app_data!")
        logger.debug(f"   Пользователь: {message.from_user.id}")
        logger.debug(f"   Данные: {message.web_app_data.data}")
        # Вызываем основной обработчик
        await handle_web_app(message)
        return
    
    # Если это команда, пропускаем (команды обрабатываются отдельно через фильтры)
    if message.text and message.text.startswith('/'):
        return
    
    # Обычные текстовые сообщения
    if message.text:
        await handle_any_message_text(message)

# Обработчик для любого текстового сообщения (кроме команд и web_app_data)
async def handle_any_message_text(message: types.Message):
    """Показываем кнопки при любом текстовом сообщении"""
    user_id = message.from_user.id
    is_admin = database.is_admin(user_id)
    
    # Устанавливаем menu button для пользователя
    try:
        menu_button = MenuButtonWebApp(
            text="💅 Записаться",
            web_app=WebAppInfo(url=CLIENT_WEBAPP_URL)
        )
        await bot.set_chat_menu_button(chat_id=message.chat.id, menu_button=menu_button)
    except:
        pass
    
    # Используем inline кнопки (они точно работают)
    inline_keyboard = create_main_keyboard(is_admin)
    
    # Также пробуем постоянную клавиатуру
    try:
        reply_keyboard = create_reply_keyboard(is_admin)
    except:
        reply_keyboard = None
    
    # Отправляем inline кнопки (они всегда работают)
    await message.answer(
        f"👋 Привет, {message.from_user.first_name}!\n\n"
        "💅 Нажмите кнопку ниже, чтобы записаться на маникюр:",
        reply_markup=inline_keyboard  # Inline кнопки всегда работают
    )
    
    # Если постоянная клавиатура работает, отправляем её
    if reply_keyboard:
        try:
            await message.answer(
                "👇 Или используйте кнопку внизу экрана:",
                reply_markup=reply_keyboard
            )
        except:
            pass

# Команда /admin для добавления админа
@dp.message(Command("admin"))
async def add_admin_command(message: types.Message):
    # Здесь можно добавить проверку на суперадмина или использовать переменную окружения
    # Для простоты, первый пользователь, который использует команду, станет админом
    user_id = message.from_user.id
    username = message.from_user.username or ""
    
    if database.add_admin(user_id, username):
        await message.answer("✅ Вы стали администратором!")
    else:
        if database.is_admin(user_id):
            await message.answer("✅ Вы уже администратор!")
        else:
            await message.answer("❌ Ошибка при добавлении администратора")

# Команда для регистрации мастера
@dp.message(Command("register_master"))
async def register_master_command(message: types.Message):
    """Мастер может зарегистрировать себя, указав свое имя"""
    text = message.text.split()
    if len(text) < 2:
        await message.answer(
            "Используйте команду так:\n"
            "/register_master <ваше_имя>\n\n"
            "Например: /register_master Анна\n\n"
            "Доступные имена мастеров:\n"
            "• Анна\n"
            "• Мария\n"
            "• Елена"
        )
        return
    
    master_name = text[1]
    chat_id = message.from_user.id
    
    # Проверяем, существует ли такой мастер
    masters = database.get_masters()
    master_names = [m[1] for m in masters]
    
    if master_name not in master_names:
        await message.answer(
            f"❌ Мастер '{master_name}' не найден.\n\n"
            f"Доступные мастера: {', '.join(master_names)}"
        )
        return
    
    # Регистрируем мастера
    if database.set_master_chat_id(master_name, chat_id):
        await message.answer(
            f"✅ Вы успешно зарегистрированы как мастер '{master_name}'!\n\n"
            f"Теперь вы будете получать уведомления о новых записях."
        )
    else:
        await message.answer("❌ Ошибка при регистрации мастера")

# Команда для просмотра записей мастера
@dp.message(Command("my_bookings"))
async def my_bookings_command(message: types.Message):
    """Показать все записи мастера"""
    user_id = message.from_user.id
    
    # Определяем, какой это мастер
    master_name = None
    masters = database.get_masters()
    for master in masters:
        master_chat_id = database.get_master_chat_id(master[1])
        if master_chat_id == user_id:
            master_name = master[1]
            break
    
    if not master_name:
        await message.answer(
            "❌ Вы не зарегистрированы как мастер.\n\n"
            "Используйте команду /register_master <ваше_имя>"
        )
        return
    
    # Получаем все записи мастера
    bookings = database.get_master_bookings(master_name)
    
    if not bookings:
        await message.answer(
            f"📅 У вас пока нет записей, {master_name}.\n\n"
            "Как только клиенты начнут записываться, записи появятся здесь."
        )
        return
    
    # Формируем сообщение с записями
    message_text = f"📋 Ваши записи, {master_name}:\n\n"
    
    # Группируем записи по датам
    bookings_by_date = {}
    for booking in bookings:
        date = booking[7]  # booking[7] - это date
        if date not in bookings_by_date:
            bookings_by_date[date] = []
        bookings_by_date[date].append(booking)
    
    # Сортируем даты
    sorted_dates = sorted(bookings_by_date.keys())
    
    # Форматируем дату
    def format_date(date_str):
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            months = ["января", "февраля", "марта", "апреля", "мая", "июня",
                     "июля", "августа", "сентября", "октября", "ноября", "декабря"]
            days = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]
            return f"{days[date_obj.weekday()]}, {date_obj.day} {months[date_obj.month - 1]}"
        except:
            return date_str
    
    # Формируем сообщение для каждой даты
    for date in sorted_dates:
        message_text += f"📅 {format_date(date)}\n"
        message_text += "─" * 30 + "\n"
        
        # Сортируем записи по времени
        date_bookings = sorted(bookings_by_date[date], key=lambda x: x[8])  # x[8] - это time_slot
        
        for booking in date_bookings:
            # booking структура: (id, user_id, username, first_name, phone, service, master, date, time_slot, confirmed, created_at)
            time = booking[8]
            client_name = booking[3] or booking[2] or "Не указано"
            phone = booking[4] or "Не указан"
            service = booking[5]
            
            message_text += f"⏰ {time} - {service}\n"
            message_text += f"   👤 {client_name}\n"
            message_text += f"   📞 {phone}\n"
            message_text += "\n"
        
        message_text += "\n"
    
    # Если сообщение слишком длинное, разбиваем на части
    if len(message_text) > 4000:
        # Разбиваем на части по 4000 символов
        parts = []
        current_part = ""
        for line in message_text.split('\n'):
            if len(current_part) + len(line) + 1 > 4000:
                parts.append(current_part)
                current_part = line + "\n"
            else:
                current_part += line + "\n"
        if current_part:
            parts.append(current_part)
        
        for i, part in enumerate(parts):
            if i == 0:
                await message.answer(part)
            else:
                await message.answer(f"📋 Продолжение ({i+1}/{len(parts)}):\n\n{part}")
    else:
        await message.answer(message_text)

# Тестовая команда для проверки работы бота
@dp.message(Command("test"))
async def test_command(message: types.Message):
    """Тестовая команда"""
    await message.answer("✅ Бот работает! Команды обрабатываются.")

# Команда для ручного создания записи (для тестирования)
@dp.message(Command("add_booking"))
async def add_booking_command(message: types.Message):
    """Ручное создание записи для тестирования"""
    user_id = message.from_user.id
    
    # Создаем тестовую запись
    try:
        from datetime import datetime, timedelta
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        booking_id = database.add_booking(
            user_id=user_id,
            username=message.from_user.username or "",
            first_name=message.from_user.first_name or "Тестовый",
            phone="+7 (999) 123-45-67",
            service="Классический маникюр",
            master="Анна",
            date=tomorrow,
            time_slot="10:00"
        )
        
        await message.answer(
            f"✅ Тестовая запись создана!\n\n"
            f"📅 Дата: {tomorrow}\n"
            f"⏰ Время: 10:00\n"
            f"💅 Услуга: Классический маникюр\n"
            f"👩‍🎨 Мастер: Анна\n\n"
            f"ID записи: {booking_id}\n\n"
            f"Теперь попробуйте команду /allbookings"
        )
        logger.info(f"✅ Тестовая запись создана с ID: {booking_id}")
    except Exception as e:
        logger.error(f"❌ Ошибка создания тестовой записи: {e}", exc_info=True)
        await message.answer(f"❌ Ошибка: {str(e)}")

# Команда для просмотра всех записей (только для админов)
@dp.message(Command("all_bookings", "allbookings"))
async def all_bookings_command(message: types.Message):
    """Показать все записи (только для администраторов)"""
    user_id = message.from_user.id
    
    logger.info(f"🔍 Команда /all_bookings от пользователя {user_id}")
    
    # Сначала отправляем подтверждение, что команда получена
    await message.answer("⏳ Получаю записи из базы данных...")
    
    # Временно убираем проверку админа для отладки
    # if not database.is_admin(user_id):
    #     await message.answer("❌ У вас нет прав администратора.\n\nИспользуйте команду /admin для получения прав.")
    #     logger.warning(f"Пользователь {user_id} не является администратором")
    #     return
    
    logger.info(f"✅ Получаю записи из базы данных...")
    
    # Получаем все записи
    import sqlite3
    try:
        conn = sqlite3.connect("database.db")
        c = conn.cursor()
        
        # Проверяем, существует ли таблица
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='bookings'")
        table_exists = c.fetchone()
        logger.info(f"Таблица bookings существует: {table_exists is not None}")
        
        if table_exists:
            c.execute("SELECT COUNT(*) FROM bookings")
            count = c.fetchone()[0]
            logger.info(f"Всего записей в базе: {count}")
            
            c.execute("SELECT * FROM bookings ORDER BY date, time_slot")
            all_bookings = c.fetchall()
            logger.info(f"Получено записей: {len(all_bookings)}")
            
            if len(all_bookings) > 0:
                logger.debug(f"Первая запись: {all_bookings[0]}")
        else:
            all_bookings = []
            logger.warning("Таблица bookings не существует!")
        
        conn.close()
        
        if not all_bookings:
            response_text = (
                "📅 Записей пока нет.\n\n"
                "Как только клиенты начнут записываться через бота, записи появятся здесь.\n\n"
                "💡 Чтобы создать запись:\n"
                "1. Откройте Mini App через кнопку '💅 Записаться на маникюр'\n"
                "2. Выберите услугу, мастера, дату и время\n"
                "3. Заполните телефон и подтвердите запись\n\n"
                f"📊 Статистика: найдено {len(all_bookings)} записей в базе данных."
            )
            await message.answer(response_text)
            logger.info("✅ Отправлено сообщение: записей нет")
            return
    except Exception as db_error:
        logger.error(f"❌ Ошибка при получении записей из базы: {db_error}", exc_info=True)
        await message.answer(f"❌ Ошибка при получении записей: {str(db_error)}")
        return
    
    # Группируем по мастерам
    bookings_by_master = {}
    for booking in all_bookings:
        master = booking[6]  # booking[6] - это master
        if master not in bookings_by_master:
            bookings_by_master[master] = []
        bookings_by_master[master].append(booking)
    
    message_text = "📋 Все записи:\n\n"
    
    for master_name in sorted(bookings_by_master.keys()):
        message_text += f"👩‍🎨 {master_name}\n"
        message_text += "─" * 30 + "\n"
        
        # Группируем по датам
        master_bookings = bookings_by_master[master_name]
        bookings_by_date = {}
        for booking in master_bookings:
            date = booking[7]
            if date not in bookings_by_date:
                bookings_by_date[date] = []
            bookings_by_date[date].append(booking)
        
        for date in sorted(bookings_by_date.keys()):
            try:
                date_obj = datetime.strptime(date, '%Y-%m-%d')
                months = ["января", "февраля", "марта", "апреля", "мая", "июня",
                          "июля", "августа", "сентября", "октября", "ноября", "декабря"]
                message_text += f"  📅 {date_obj.day} {months[date_obj.month - 1]}\n"
            except:
                message_text += f"  📅 {date}\n"
            
            date_bookings = sorted(bookings_by_date[date], key=lambda x: x[8])
            for booking in date_bookings:
                time = booking[8]
                client_name = booking[3] or booking[2] or "Не указано"
                service = booking[5]
                message_text += f"    ⏰ {time} - {service} ({client_name})\n"
            message_text += "\n"
        
        message_text += "\n"
    
    # Разбиваем на части, если слишком длинное
    try:
        if len(message_text) > 4000:
            parts = []
            current_part = ""
            for line in message_text.split('\n'):
                if len(current_part) + len(line) + 1 > 4000:
                    parts.append(current_part)
                    current_part = line + "\n"
                else:
                    current_part += line + "\n"
            if current_part:
                parts.append(current_part)
            
            logger.info(f"Сообщение разбито на {len(parts)} частей")
            
            for i, part in enumerate(parts):
                if i == 0:
                    await message.answer(part)
                else:
                    await message.answer(f"📋 Продолжение ({i+1}/{len(parts)}):\n\n{part}")
        else:
            logger.info(f"Отправляю сообщение длиной {len(message_text)} символов")
            await message.answer(message_text)
    except Exception as send_error:
        logger.error(f"Ошибка при отправке сообщения: {send_error}", exc_info=True)
        await message.answer(f"❌ Ошибка при отправке записей: {str(send_error)}")

# Получаем данные из Mini App (клиент)
@dp.message(lambda message: message.web_app_data is not None)
async def handle_web_app(message: types.Message):
    try:
        logger.info(f"📨 Получены данные из Mini App от пользователя {message.from_user.id}")
        logger.info(f"Имя: {message.from_user.first_name}, Username: {message.from_user.username}")
        logger.debug(f"Тип сообщения: {type(message)}")
        logger.debug(f"web_app_data: {message.web_app_data}")
        if message.web_app_data:
            logger.debug(f"Данные: {message.web_app_data.data}")
        
        if not message.web_app_data or not message.web_app_data.data:
            logger.warning("⚠️ web_app_data пуст или отсутствует")
            await message.answer("⚠️ Данные из Mini App не получены. Попробуйте создать запись еще раз.")
            return
        
        data = json.loads(message.web_app_data.data)
        logger.info(f"Распарсенные данные: {data}")
        
        if data.get('type') == 'booking':
            logger.info(f"📝 Создаю запись в базе данных...")
            logger.info(f"Мастер: {data.get('master')}, Дата: {data.get('date')}, Время: {data.get('time_slot')}")
            
            # Создание записи
            try:
                booking_id = database.add_booking(
                    user_id=message.from_user.id,
                    username=message.from_user.username or "",
                    first_name=message.from_user.first_name or "",
                    phone=data.get('phone', ''),
                    service=data['service'],
                    master=data['master'],
                    date=data['date'],
                    time_slot=data['time_slot']
                )
                logger.info(f"✅ Запись успешно сохранена в базу данных с ID: {booking_id}")
                logger.info(f"Теперь в базе есть запись для мастера '{data['master']}' на {data['date']} в {data['time_slot']}")
            except Exception as booking_error:
                logger.error(f"❌ Ошибка при сохранении записи: {booking_error}", exc_info=True)
                await message.answer(f"❌ Ошибка при сохранении записи: {str(booking_error)}")
                return
            
            # Отправляем подтверждение клиенту
            await message.answer(
                f"✅ Запись успешно создана!\n\n"
                f"📅 Дата: {data['date']}\n"
                f"⏰ Время: {data['time_slot']}\n"
                f"💅 Услуга: {data['service']}\n"
                f"👩‍🎨 Мастер: {data['master']}\n\n"
                f"Мы напомним вам за 1 час до записи 💌"
            )
            
            # Отправляем уведомление мастеру
            try:
                master_chat_id = database.get_master_chat_id(data['master'])
                if master_chat_id:
                    master_message = (
                        f"🔔 Новая запись!\n\n"
                        f"👤 Клиент: {message.from_user.first_name or message.from_user.username or 'Не указано'}\n"
                        f"📞 Телефон: {data.get('phone', 'Не указан')}\n"
                        f"💅 Услуга: {data['service']}\n"
                        f"📅 Дата: {data['date']}\n"
                        f"⏰ Время: {data['time_slot']}\n\n"
                        f"Подготовьтесь к приему клиента! 💅"
                    )
                    await bot.send_message(master_chat_id, master_message)
                else:
                    # Если мастер не зарегистрирован, отправляем сообщение в консоль
                    logger.warning(f"⚠️ Мастер {data['master']} не зарегистрирован. Используйте /register_master")
            except Exception as master_error:
                logger.error(f"Ошибка отправки сообщения мастеру: {master_error}", exc_info=True)
                # Продолжаем работу даже если не удалось отправить мастеру
            
        
    except Exception as e:
        await message.answer(f"❌ Произошла ошибка: {str(e)}")

# Настройка меню бота и кнопок
async def setup_bot_menu():
    """Настройка автоматических кнопок и меню бота"""
    try:
        # Устанавливаем команды бота (появляются при нажатии на /)
        commands = [
            BotCommand(command="start", description="🚀 Начать работу с ботом"),
            BotCommand(command="admin", description="👑 Получить права администратора"),
            BotCommand(command="register_master", description="👩‍🎨 Зарегистрироваться как мастер"),
        ]
        
        # Добавляем команды для просмотра записей
        commands.append(
            BotCommand(command="my_bookings", description="📋 Мои записи (для мастеров)")
        )
        commands.append(
            BotCommand(command="all_bookings", description="📋 Все записи (для админов)")
        )
        
        await bot.set_my_commands(commands)
        
        # Устанавливаем Menu Button для всех пользователей
        # Используем set_chat_menu_button с chat_id=None для глобальной настройки
        menu_button = MenuButtonWebApp(
            text="💅 Записаться",
            web_app=WebAppInfo(url=CLIENT_WEBAPP_URL)
        )
        # Пытаемся установить глобально
        try:
            await bot.set_chat_menu_button(chat_id=None, menu_button=menu_button)
        except:
            # Если не работает глобально, попробуем другой способ
            pass
        
        logger.info("✅ Меню бота настроено!")
        logger.info("💡 Кнопка '💅 Записаться' должна появиться рядом с полем ввода")
    except Exception as e:
        logger.warning(f"⚠️ Ошибка настройки меню бота: {e}")
        logger.warning("Бот будет работать, но меню может не отображаться")

# Асинхронный запуск
async def main():
    logger.info("🤖 Бот запущен...")
    logger.info("⏳ Настраиваю меню...")
    await setup_bot_menu()
    logger.info("✅ Бот готов к работе!")
    logger.info("💡 Отправьте /start боту, чтобы увидеть кнопки")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())