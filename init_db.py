"""
Скрипт для инициализации базы данных с тестовыми данными
"""
import database
from datetime import datetime, timedelta

def init_test_data():
    """Инициализация базы данных и добавление тестовых слотов"""
    database.init_db()
    
    # Добавляем тестовые слоты на ближайшие 7 дней
    masters = database.get_masters()
    if not masters:
        print("Сначала добавьте мастеров в базу данных")
        return
    
    today = datetime.now().date()
    times = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"]
    
    slots_added = 0
    for day in range(7):
        date = today + timedelta(days=day)
        date_str = date.strftime("%Y-%m-%d")
        
        for master in masters:
            for time in times:
                if database.add_available_slot(date_str, time, master[1]):
                    slots_added += 1
    
    print(f"✅ База данных инициализирована")
    print(f"✅ Добавлено {slots_added} временных слотов")
    print(f"✅ Мастеров: {len(masters)}")
    
    services = database.get_services()
    print(f"✅ Услуг: {len(services)}")

if __name__ == "__main__":
    init_test_data()

