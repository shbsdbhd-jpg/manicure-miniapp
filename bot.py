import asyncio 
import json
from aiogram import Bot, Dispatcher, types
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from aiogram.filters import Command

# Токен твоего бота
TOKEN = "8548031527:AAFPbXMfwauEkhElFKKyC_lnzItmuVFPLrc"

# Ссылки на Mini App (ngrok HTTPS или хостинг)
CLIENT_WEBAPP_URL = "https://manicure-miniapp.vercel.app"
MASTER_PANEL_URL = "https://manicure-miniapp.vercel.app//master"

# Инициализация бота и диспетчера
bot = Bot(token=TOKEN)
dp = Dispatcher()

# Хендлер команды /start
def add_booking(user_id, username, service, master, date):
    print(f"Новая запись: {user_id}, {username}, {service}, {master}, {date}")

def confirm_booking(booking_id):
    print(f"Запись {booking_id} подтверждена")

# Команда /start
@dp.message(Command("start"))
async def start(message: types.Message):
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="💅 Записаться", web_app=WebAppInfo(url=CLIENT_WEBAPP_URL))],
            [InlineKeyboardButton(text="🧑‍🎨 Панель мастера", web_app=WebAppInfo(url=MASTER_PANEL_URL))]
        ]
    )
    await message.answer("Привет! 👋 Что хочешь сделать?", reply_markup=keyboard)
# Получаем данные из Mini App (клиент)
@dp.message(lambda message: message.web_app_data is not None)
async def handle_web_app(message: types.Message):
    data = json.loads(message.web_app_data.data)
    add_booking(message.from_user.id, message.from_user.username, data["service"], data["master"], data["date"])
    await message.answer(f"✅ Запись принята!\nМастер: {data['master']}\nДата: {data['date']}")
    await bot.send_message(message.chat.id, "Мы напомним вам за 1 час до записи 💌")

# Подтверждение записи от мастера
@dp.callback_query(lambda c: c.data.startswith("confirm_"))
async def confirm_booking_callback(callback_query: types.CallbackQuery):
    booking_id = callback_query.data.split("_")[1]
    confirm_booking(booking_id)
    await bot.answer_callback_query(callback_query.id, "Запись подтверждена ✅")
    await bot.send_message(callback_query.from_user.id, "Клиент уведомлён!")

# Асинхронный запуск
async def main():
    print("Бот запущен...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())