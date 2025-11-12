import asyncio 
import json
from aiogram import Bot, Dispatcher, types
from aiogram.types import (
    InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, 
    MenuButtonWebApp, BotCommand, ReplyKeyboardMarkup, KeyboardButton
)
from aiogram.filters import Command
import database

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
    
    # Используем постоянную клавиатуру (Reply Keyboard) - она всегда видна
    reply_keyboard = create_reply_keyboard(is_admin)
    
    # Также устанавливаем menu button для этого пользователя
    try:
        menu_button = MenuButtonWebApp(
            text="💅 Записаться",
            web_app=WebAppInfo(url=CLIENT_WEBAPP_URL)
        )
        await bot.set_chat_menu_button(chat_id=message.chat.id, menu_button=menu_button)
    except Exception as e:
        print(f"Не удалось установить menu button для пользователя: {e}")
    
    await message.answer(
        f"Привет, {message.from_user.first_name}! 👋\n\n"
        "💅 Нажмите кнопку ниже, чтобы записаться на маникюр:",
        reply_markup=reply_keyboard  # Используем постоянную клавиатуру
    )

# Обработчик для любого текстового сообщения (кроме команд и web_app_data)
# Этот обработчик должен быть последним, чтобы не перехватывать команды
@dp.message(lambda message: message.text and not message.text.startswith('/') and message.web_app_data is None)
async def handle_any_message(message: types.Message):
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
    
    # Используем постоянную клавиатуру - она всегда видна
    reply_keyboard = create_reply_keyboard(is_admin)
    
    await message.answer(
        f"👋 Привет, {message.from_user.first_name}!\n\n"
        "💅 Нажмите кнопку ниже, чтобы записаться на маникюр:",
        reply_markup=reply_keyboard  # Постоянная клавиатура всегда видна
    )

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

# Получаем данные из Mini App (клиент)
@dp.message(lambda message: message.web_app_data is not None)
async def handle_web_app(message: types.Message):
    try:
        data = json.loads(message.web_app_data.data)
        
        if data.get('type') == 'booking':
            # Создание записи
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
                    print(f"⚠️ Мастер {data['master']} не зарегистрирован. Используйте /register_master")
            except Exception as master_error:
                print(f"Ошибка отправки сообщения мастеру: {master_error}")
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
        
        print("✅ Меню бота настроено!")
        print("💡 Кнопка '💅 Записаться' должна появиться рядом с полем ввода")
    except Exception as e:
        print(f"⚠️ Ошибка настройки меню бота: {e}")
        print("Бот будет работать, но меню может не отображаться")

# Асинхронный запуск
async def main():
    print("Бот запущен...")
    await setup_bot_menu()
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())