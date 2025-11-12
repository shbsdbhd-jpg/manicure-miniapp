import { useState, useEffect, useCallback } from "react";
import "./App.css";
import { SERVICES, MASTERS, initSlotsIfNeeded, getSlotsFromStorage, saveSlotsToStorage, saveBookingToStorage } from "./data";

function App() {
  const tg = window.Telegram?.WebApp;
  const [step, setStep] = useState(1);
  const [services] = useState(SERVICES);
  const [masters] = useState(MASTERS);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  // Инициализация слотов из localStorage
  useEffect(() => {
    initSlotsIfNeeded();
  }, []);

  // Загрузка доступных слотов для выбранной даты и мастера
  const loadAvailableSlots = useCallback(() => {
    if (!selectedDate || !selectedMaster) {
      setAvailableSlots([]);
      return;
    }
    
    const slots = getSlotsFromStorage();
    const filtered = slots
      .filter(slot => 
        slot.date === selectedDate && 
        slot.master === selectedMaster.name && 
        slot.is_available
      )
      .map(slot => slot.time)
      .sort();
    
    setAvailableSlots([...new Set(filtered)]); // Убираем дубликаты
  }, [selectedDate, selectedMaster]);

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      setPhone(tg.initDataUnsafe?.user?.phone_number || "");
    }
  }, [tg]);

  useEffect(() => {
    if (selectedDate && selectedMaster) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedMaster, loadAvailableSlots]);

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setStep(2);
  };

  const handleMasterSelect = (master) => {
    setSelectedMaster(master);
    setStep(3);
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setStep(4);
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    setStep(5);
  };

  const handleSubmit = async () => {
    if (!selectedService || !selectedMaster || !selectedDate || !selectedTime) {
      window.alert("Пожалуйста, заполните все поля");
      return;
    }

    if (!phone || phone.trim() === "") {
      window.alert("Пожалуйста, укажите номер телефона");
      return;
    }

    setLoading(true);
    try {
      // Помечаем слот как занятый в localStorage
      const slots = getSlotsFromStorage();
      const slotIndex = slots.findIndex(slot => 
        slot.date === selectedDate && 
        slot.time === selectedTime && 
        slot.master === selectedMaster.name
      );
      
      if (slotIndex !== -1) {
        slots[slotIndex].is_available = false;
        saveSlotsToStorage(slots);
      }

      // Сохраняем запись в localStorage
      const bookingData = {
        type: "booking",
        service: selectedService.name,
        master: selectedMaster.name,
        date: selectedDate,
        time_slot: selectedTime,
        phone: phone,
        user_id: tg?.initDataUnsafe?.user?.id || 0,
        username: tg?.initDataUnsafe?.user?.username || "",
        first_name: tg?.initDataUnsafe?.user?.first_name || "",
      };
      
      saveBookingToStorage(bookingData);

      try {
        if (tg && tg.sendData) {
          tg.sendData(JSON.stringify(bookingData));
        } else {
          console.warn("Telegram WebApp API not available");
        }
      } catch (telegramError) {
        console.error("Error sending data to Telegram:", telegramError);
        window.alert("Ошибка отправки в Telegram. Запись сохранена локально.");
      }

      setStep(6); // Шаг успешной записи
    } catch (error) {
      console.error("Error creating booking:", error);
      window.alert("Произошла ошибка при создании записи. Попробуйте еще раз.");
    } finally {
      setLoading(false);
    }
  };

  const getAvailableDates = () => {
    if (!selectedMaster) return [];
    
    const slots = getSlotsFromStorage();
    const availableDatesSet = new Set();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Вычисляем дату через месяц
    const oneMonthLater = new Date(today);
    oneMonthLater.setMonth(today.getMonth() + 1);
    
    // Находим все даты, где есть доступные слоты для выбранного мастера
    // и которые находятся в пределах месяца от сегодня
    slots.forEach(slot => {
      if (slot.master === selectedMaster.name && slot.is_available) {
        const slotDate = new Date(slot.date);
        slotDate.setHours(0, 0, 0, 0);
        
        // Проверяем, что дата не в прошлом и не более чем через месяц
        if (slotDate >= today && slotDate <= oneMonthLater) {
          availableDatesSet.add(slot.date);
        }
      }
    });
    
    return Array.from(availableDatesSet).sort();
  };

  const getCalendarDays = () => {
    const availableDates = getAvailableDates();
    if (availableDates.length === 0) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Вычисляем дату через месяц
    const oneMonthLater = new Date(today);
    oneMonthLater.setMonth(today.getMonth() + 1);
    
    const calendarDays = [];
    
    // Получаем первую доступную дату (сегодня или позже)
    const firstDate = new Date(availableDates[0]);
    firstDate.setHours(0, 0, 0, 0);
    
    // Используем сегодня как начальную дату, если она раньше первой доступной
    const startDate = firstDate < today ? new Date(today) : new Date(firstDate);
    
    // Используем дату через месяц как конечную, если она раньше последней доступной
    const lastAvailableDate = new Date(availableDates[availableDates.length - 1]);
    lastAvailableDate.setHours(0, 0, 0, 0);
    const endDate = lastAvailableDate > oneMonthLater ? new Date(oneMonthLater) : new Date(lastAvailableDate);
    
    // Находим первый день недели (понедельник) для начальной даты
    const calendarStartDate = new Date(startDate);
    const dayOfWeek = calendarStartDate.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0 = воскресенье, 1 = понедельник
    calendarStartDate.setDate(calendarStartDate.getDate() - daysToMonday);
    
    // Находим последний день недели (воскресенье) для конечной даты
    const calendarEndDate = new Date(endDate);
    const endDayOfWeek = calendarEndDate.getDay();
    const daysToSunday = endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek;
    calendarEndDate.setDate(calendarEndDate.getDate() + daysToSunday);
    
    // Генерируем все дни календаря
    const currentDate = new Date(calendarStartDate);
    while (currentDate <= calendarEndDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const isAvailable = availableDates.includes(dateStr);
      const isPast = currentDate < today;
      const isFuture = currentDate > oneMonthLater;
      const isToday = dateStr === today.toISOString().split("T")[0];
      
      // Дата доступна только если она не в прошлом и не более чем через месяц
      const canSelect = isAvailable && !isPast && !isFuture;
      
      calendarDays.push({
        date: dateStr,
        day: currentDate.getDate(),
        dayOfWeek: currentDate.getDay(),
        isAvailable: canSelect,
        isToday: isToday,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return calendarDays;
  };

  const formatTime = (time) => {
    return time;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    const months = [
      "января",
      "февраля",
      "марта",
      "апреля",
      "мая",
      "июня",
      "июля",
      "августа",
      "сентября",
      "октября",
      "ноября",
      "декабря",
    ];
    return `${date.getDate()} ${months[date.getMonth()]}, ${days[date.getDay()]}`;
  };

  if (step === 6) {
    return (
      <div className="app-container">
        <div className="success-screen">
          <div className="success-icon">✅</div>
          <h2>Запись успешно создана!</h2>
          <div className="booking-summary">
            <p>
              <strong>Услуга:</strong> {selectedService.name}
            </p>
            <p>
              <strong>Мастер:</strong> {selectedMaster.name}
            </p>
            <p>
              <strong>Дата:</strong> {formatDate(selectedDate)}
            </p>
            <p>
              <strong>Время:</strong> {selectedTime}
            </p>
          </div>
          <p className="success-message">
            Мы напомним вам за 1 час до записи 💌
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="header">
        <h1>💅 Запись на маникюр</h1>
        {step > 1 && (
          <button className="back-button" onClick={() => setStep(step - 1)}>
            ← Назад
          </button>
        )}
      </div>

      {step === 1 && (
        <div className="step-container">
          <h2>Выберите услугу</h2>
          <div className="service-grid">
            {services.map((service) => (
              <div
                key={service.id}
                className="service-card"
                onClick={() => handleServiceSelect(service)}
              >
                <div className="service-name">{service.name}</div>
                <div className="service-duration">
                  ⏱️ {service.duration} мин
                </div>
                <div className="service-price">{service.price} ₽</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="step-container">
          <h2>Выберите мастера</h2>
          <div className="master-grid">
            {masters.map((master) => (
              <div
                key={master.id}
                className="master-card"
                onClick={() => handleMasterSelect(master)}
              >
                <div className="master-avatar">👩‍🎨</div>
                <div className="master-name">{master.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="step-container">
          <h2>Выберите дату</h2>
          {getAvailableDates().length === 0 ? (
            <div className="no-slots">
              <p>Нет доступных дат для выбранного мастера</p>
            </div>
          ) : (
            <div className="calendar-container">
              <div className="calendar-header">
                <div className="calendar-weekday">Пн</div>
                <div className="calendar-weekday">Вт</div>
                <div className="calendar-weekday">Ср</div>
                <div className="calendar-weekday">Чт</div>
                <div className="calendar-weekday">Пт</div>
                <div className="calendar-weekday">Сб</div>
                <div className="calendar-weekday">Вс</div>
              </div>
              <div className="calendar-grid">
                {getCalendarDays().map((day) => {
                  return (
                    <div
                      key={day.date}
                      className={`calendar-day ${
                        !day.isAvailable ? "disabled" : ""
                      } ${selectedDate === day.date ? "selected" : ""} ${
                        day.isToday ? "today" : ""
                      }`}
                      onClick={() => day.isAvailable && handleDateSelect(day.date)}
                    >
                      <div className="calendar-day-number">{day.day}</div>
                      {day.isToday && <div className="calendar-today-indicator">•</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="step-container">
          <h2>Выберите время</h2>
          {availableSlots.length === 0 ? (
            <div className="no-slots">
              <p>На эту дату нет доступного времени</p>
              <button
                className="btn-secondary"
                onClick={() => setStep(3)}
              >
                Выбрать другую дату
              </button>
            </div>
          ) : (
            <div className="time-grid">
              {availableSlots.map((time) => (
                <div
                  key={time}
                  className={`time-slot ${selectedTime === time ? "selected" : ""}`}
                  onClick={() => handleTimeSelect(time)}
                >
                  {formatTime(time)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="step-container">
          <h2>Подтверждение записи</h2>
          <div className="booking-details">
            <div className="detail-item">
              <span className="detail-label">Услуга:</span>
              <span className="detail-value">{selectedService.name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Мастер:</span>
              <span className="detail-value">{selectedMaster.name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Дата:</span>
              <span className="detail-value">{formatDate(selectedDate)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Время:</span>
              <span className="detail-value">{selectedTime}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Телефон:</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (999) 123-45-67"
                className="phone-input"
              />
            </div>
          </div>
          <button
            className="btn-primary submit-button"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "⏳ Отправка..." : "✅ Подтвердить запись"}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
