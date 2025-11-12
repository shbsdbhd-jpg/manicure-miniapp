import asyncio 
import json
from aiogram import Bot, Dispatcher, types
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
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

# Команда /start
@dp.message(Command("start"))
async def start(message: types.Message):
    user_id = message.from_user.id
    is_admin = database.is_admin(user_id)
    
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="💅 Записаться на маникюр", web_app=WebAppInfo(url=CLIENT_WEBAPP_URL))],
        ]
    )
    
    if is_admin:
        keyboard.inline_keyboard.append(
            [InlineKeyboardButton(text="⚙️ Админ-панель", web_app=WebAppInfo(url=ADMIN_PANEL_URL))]
        )
    
    await message.answer(
        f"Привет, {message.from_user.first_name}! 👋\n\n"
        "Выберите действие:",
        reply_markup=keyboard
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
            
            await message.answer(
                f"✅ Запись успешно создана!\n\n"
                f"📅 Дата: {data['date']}\n"
                f"⏰ Время: {data['time_slot']}\n"
                f"💅 Услуга: {data['service']}\n"
                f"👩‍🎨 Мастер: {data['master']}\n\n"
                f"Мы напомним вам за 1 час до записи 💌"
            )
        
    except Exception as e:
        await message.answer(f"❌ Произошла ошибка: {str(e)}")

# Асинхронный запуск
async def main():
    print("Бот запущен...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())