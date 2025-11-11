import asyncio
from datetime import datetime, timedelta
from database import get_upcoming_bookings
from aiogram import Bot

TOKEN = "YOUR_BOT_TOKEN"
bot = Bot(token=TOKEN)

async def send_reminders():
    while True:
        bookings = get_upcoming_bookings()
        now = datetime.now()
        for b in bookings:
            booking_time = datetime.fromisoformat(b[5])
            if 0 < (booking_time - now).total_seconds() < 3600:
                await bot.send_message(b[1], f"💅 Напоминание! Ваша запись на {b[5]} к мастеру {b[4]}")
        await asyncio.sleep(300)  # Проверка каждые 5 минут

if __name__ == "__main__":
    asyncio.run(send_reminders())
