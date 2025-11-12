import { useState, useEffect, useCallback } from "react";
import "./AdminPanel.css";
import { MASTERS, getSlotsFromStorage, saveSlotsToStorage, initSlotsIfNeeded } from "./data";

function AdminPanel() {
  const tg = window.Telegram?.WebApp;
  const [isAdmin, setIsAdmin] = useState(true); // Упрощенная версия - все админы
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState([]);
  const [masters] = useState(MASTERS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSlot, setNewSlot] = useState({
    date: "",
    time: "",
    master: "",
  });

  const loadSlots = useCallback(() => {
    const allSlots = getSlotsFromStorage();
    setSlots(allSlots.filter(slot => slot.is_available));
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
  }, [tg, masters, loadSlots]);

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

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

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
        <button
          className="btn-add"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? "✕ Отмена" : "+ Добавить слот"}
        </button>
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

