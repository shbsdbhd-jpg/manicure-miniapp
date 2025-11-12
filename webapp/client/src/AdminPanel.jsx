import { useState, useEffect, useCallback } from "react";
import "./AdminPanel.css";
import { MASTERS, getSlotsFromStorage, saveSlotsToStorage, initSlotsIfNeeded, getBookingsFromStorage } from "./data";

function AdminPanel() {
  const tg = window.Telegram?.WebApp;
  const isAdmin = true; // Упрощенная версия - все админы
  const [slots, setSlots] = useState([]);
  const [masters] = useState(MASTERS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBookings, setShowBookings] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [newSlot, setNewSlot] = useState({
    date: "",
    time: "",
    master: "",
  });

  const loadSlots = useCallback(() => {
    const allSlots = getSlotsFromStorage();
    setSlots(allSlots.filter(slot => slot.is_available));
  }, []);

  const loadBookings = useCallback(() => {
    const allBookings = getBookingsFromStorage();
    // Сортируем по дате и времени
    const sorted = allBookings.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time_slot}`);
      const dateB = new Date(`${b.date}T${b.time_slot}`);
      return dateA - dateB;
    });
    setBookings(sorted);
  }, []);

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
    }
    // Инициализируем слоты если нужно
    initSlotsIfNeeded();
    if (masters.length > 0) {
      setNewSlot((prev) => ({ ...prev, master: masters[0].name }));
    }
    loadSlots();
    loadBookings();
  }, [tg, masters, loadSlots, loadBookings]);

  const handleAddSlot = () => {
    if (!newSlot.date || !newSlot.time || !newSlot.master) {
      window.alert("Заполните все поля");
      return;
    }

    try {
      const slots = getSlotsFromStorage();
      
      // Проверяем, существует ли уже такой слот
      const exists = slots.some(slot => 
        slot.date === newSlot.date && 
        slot.time === newSlot.time && 
        slot.master === newSlot.master
      );

      if (!exists) {
        slots.push({
          date: newSlot.date,
          time: newSlot.time,
          master: newSlot.master,
          is_available: true
        });
        saveSlotsToStorage(slots);
        setNewSlot({ date: "", time: "", master: masters[0]?.name || "" });
        setShowAddForm(false);
        loadSlots();
        window.alert("Слот успешно добавлен!");
      } else {
        window.alert("Такой слот уже существует");
      }
    } catch (error) {
      console.error("Error adding slot:", error);
      window.alert("Произошла ошибка при добавлении слота");
    }
  };

  const handleDeleteSlot = (slot) => {
    if (!window.confirm(`Удалить слот ${slot.date} ${slot.time} для ${slot.master}?`)) {
      return;
    }

    try {
      const slots = getSlotsFromStorage();
      const filtered = slots.filter(s => 
        !(s.date === slot.date && s.time === slot.time && s.master === slot.master)
      );
      saveSlotsToStorage(filtered);
      loadSlots();
      window.alert("Слот успешно удален!");
    } catch (error) {
      console.error("Error deleting slot:", error);
      window.alert("Произошла ошибка при удалении слота");
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour < 21; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        slots.push(timeStr);
      }
    }
    return slots;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    const months = [
      "янв",
      "фев",
      "мар",
      "апр",
      "мая",
      "июн",
      "июл",
      "авг",
      "сен",
      "окт",
      "ноя",
      "дек",
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${days[date.getDay()]}`;
  };

  if (!isAdmin) {
    return (
      <div className="admin-container">
        <div className="unauthorized">
          <h2>🔒 Доступ запрещен</h2>
          <p>У вас нет прав администратора</p>
          <p className="hint">
            Используйте команду /admin в боте для получения прав
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>⚙️ Админ-панель</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="btn-add"
            onClick={() => {
              setShowBookings(!showBookings);
              setShowAddForm(false);
              if (!showBookings) loadBookings();
            }}
          >
            {showBookings ? "✕ Закрыть" : "📋 Записи"}
          </button>
          <button
            className="btn-add"
            onClick={() => {
              setShowAddForm(!showAddForm);
              setShowBookings(false);
            }}
          >
            {showAddForm ? "✕ Отмена" : "+ Добавить слот"}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="add-slot-form">
          <h3>Добавить доступное время</h3>
          <div className="form-group">
            <label>Мастер:</label>
            <select
              value={newSlot.master}
              onChange={(e) =>
                setNewSlot({ ...newSlot, master: e.target.value })
              }
            >
              {masters.map((master) => (
                <option key={master.id} value={master.name}>
                  {master.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Дата:</label>
            <input
              type="date"
              value={newSlot.date}
              onChange={(e) =>
                setNewSlot({ ...newSlot, date: e.target.value })
              }
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div className="form-group">
            <label>Время:</label>
            <select
              value={newSlot.time}
              onChange={(e) =>
                setNewSlot({ ...newSlot, time: e.target.value })
              }
            >
              <option value="">Выберите время</option>
              {generateTimeSlots().map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-primary" onClick={handleAddSlot}>
            Добавить
          </button>
        </div>
      )}

      {showBookings && (
        <div className="bookings-list" style={{ marginBottom: "30px" }}>
          <h2>📋 Все записи клиентов</h2>
          {bookings.length === 0 ? (
            <div className="empty-state">
              <p>Нет записей</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  style={{
                    background: "linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)",
                    borderRadius: "16px",
                    padding: "16px",
                    border: "2px solid #e9ecef",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                    <div>
                      <div style={{ fontWeight: "700", fontSize: "16px", color: "#2d3748", marginBottom: "4px" }}>
                        {booking.first_name || booking.username || "Клиент"}
                      </div>
                      <div style={{ fontSize: "14px", color: "#718096" }}>
                        {booking.phone || "Телефон не указан"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "12px", color: "#718096" }}>
                        {new Date(booking.created_at).toLocaleDateString("ru-RU")}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e9ecef" }}>
                    <div>
                      <div style={{ fontSize: "12px", color: "#718096", marginBottom: "4px" }}>Услуга</div>
                      <div style={{ fontWeight: "600", color: "#2d3748" }}>{booking.service}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", color: "#718096", marginBottom: "4px" }}>Мастер</div>
                      <div style={{ fontWeight: "600", color: "#2d3748" }}>{booking.master}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", color: "#718096", marginBottom: "4px" }}>Дата</div>
                      <div style={{ fontWeight: "600", color: "#2d3748" }}>{formatDate(booking.date)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", color: "#718096", marginBottom: "4px" }}>Время</div>
                      <div style={{ fontWeight: "600", color: "#2d3748" }}>{booking.time_slot}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="slots-list">
        <h2>Доступные слоты</h2>
        {slots.length === 0 ? (
          <div className="empty-state">
            <p>Нет доступных слотов</p>
            <p className="hint">Добавьте слоты, чтобы клиенты могли записываться</p>
          </div>
        ) : (
          <div className="slots-grid">
            {slots
              .filter((slot) => slot.is_available)
              .map((slot) => (
                <div key={`${slot.date}-${slot.time}-${slot.master}`} className="slot-card">
                  <div className="slot-info">
                    <div className="slot-master">{slot.master}</div>
                    <div className="slot-date">{formatDate(slot.date)}</div>
                    <div className="slot-time">{slot.time}</div>
                  </div>
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteSlot(slot)}
                  >
                    Удалить
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;

