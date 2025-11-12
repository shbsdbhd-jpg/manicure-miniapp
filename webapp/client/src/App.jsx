import { useState, useEffect } from "react";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function App() {
  const tg = window.Telegram?.WebApp;
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [masters, setMasters] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      setPhone(tg.initDataUnsafe?.user?.phone_number || "");
    }
    loadServices();
    loadMasters();
  }, []);

  useEffect(() => {
    if (selectedDate && selectedMaster) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedMaster]);

  const loadServices = async () => {
    try {
      const response = await fetch(`${API_URL}/api/services`);
      const data = await response.json();
      setServices(data);
    } catch (error) {
      console.error("Error loading services:", error);
    }
  };

  const loadMasters = async () => {
    try {
      const response = await fetch(`${API_URL}/api/masters`);
      const data = await response.json();
      setMasters(data);
    } catch (error) {
      console.error("Error loading masters:", error);
    }
  };

  const loadAvailableSlots = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/slots?date=${selectedDate}&master=${selectedMaster.name}`
      );
      const data = await response.json();
      setAvailableSlots(data);
    } catch (error) {
      console.error("Error loading slots:", error);
    }
  };

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
      // Сначала отправляем в API
      const response = await fetch(`${API_URL}/api/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: tg?.initDataUnsafe?.user?.id || 0,
          username: tg?.initDataUnsafe?.user?.username || "",
          first_name: tg?.initDataUnsafe?.user?.first_name || "",
          phone: phone,
          service: selectedService.name,
          master: selectedMaster.name,
          date: selectedDate,
          time_slot: selectedTime,
        }),
      });

      if (response.ok) {
        // Затем отправляем в Telegram
        const bookingData = {
          type: "booking",
          service: selectedService.name,
          master: selectedMaster.name,
          date: selectedDate,
          time_slot: selectedTime,
          phone: phone,
        };

        try {
          if (tg && tg.sendData) {
            tg.sendData(JSON.stringify(bookingData));
          } else {
            console.warn("Telegram WebApp API not available");
          }
        } catch (telegramError) {
          console.error("Error sending data to Telegram:", telegramError);
          // Продолжаем даже если не удалось отправить в Telegram
        }

        setStep(6); // Шаг успешной записи
      } else {
        const error = await response.json();
        window.alert(`Ошибка: ${error.error || "Не удалось создать запись"}`);
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      window.alert("Произошла ошибка при создании записи. Попробуйте еще раз.");
    } finally {
      setLoading(false);
    }
  };

  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split("T")[0]);
    }
    return dates;
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
          <div className="date-grid">
            {getAvailableDates().map((date) => (
              <div
                key={date}
                className={`date-card ${selectedDate === date ? "selected" : ""}`}
                onClick={() => handleDateSelect(date)}
              >
                <div className="date-day">{formatDate(date).split(",")[0]}</div>
                <div className="date-weekday">
                  {formatDate(date).split(",")[1]}
                </div>
              </div>
            ))}
          </div>
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
