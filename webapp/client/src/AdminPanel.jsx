import { useState, useEffect } from "react";
import "./AdminPanel.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function AdminPanel() {
  const tg = window.Telegram?.WebApp;
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState([]);
  const [masters, setMasters] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSlot, setNewSlot] = useState({
    date: "",
    time: "",
    master: "",
  });

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      checkAdminStatus();
    }
    loadMasters();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadSlots();
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    try {
      const userId = tg?.initDataUnsafe?.user?.id || 0;
      const response = await fetch(`${API_URL}/api/admin/check?user_id=${userId}`);
      const data = await response.json();
      setIsAdmin(data.is_admin);
    } catch (error) {
      console.error("Error checking admin status:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMasters = async () => {
    try {
      const response = await fetch(`${API_URL}/api/masters`);
      const data = await response.json();
      setMasters(data);
      if (data.length > 0) {
        setNewSlot({ ...newSlot, master: data[0].name });
      }
    } catch (error) {
      console.error("Error loading masters:", error);
    }
  };

  const loadSlots = async () => {
    try {
      const userId = tg?.initDataUnsafe?.user?.id || 0;
      const response = await fetch(`${API_URL}/api/admin/slots?user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSlots(data);
      }
    } catch (error) {
      console.error("Error loading slots:", error);
    }
  };

  const handleAddSlot = async () => {
    if (!newSlot.date || !newSlot.time || !newSlot.master) {
      alert("Заполните все поля");
      return;
    }

    try {
      const userId = tg?.initDataUnsafe?.user?.id || 0;
      const response = await fetch(`${API_URL}/api/admin/slots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          ...newSlot,
        }),
      });

      if (response.ok) {
        setNewSlot({ date: "", time: "", master: masters[0]?.name || "" });
        setShowAddForm(false);
        loadSlots();
        alert("Слот успешно добавлен!");
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error || "Не удалось добавить слот"}`);
      }
    } catch (error) {
      console.error("Error adding slot:", error);
      alert("Произошла ошибка при добавлении слота");
    }
  };

  const handleDeleteSlot = async (slot) => {
    if (!window.confirm(`Удалить слот ${slot.date} ${slot.time} для ${slot.master}?`)) {
      return;
    }

    try {
      const userId = tg?.initDataUnsafe?.user?.id || 0;
      const response = await fetch(`${API_URL}/api/admin/slots`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          date: slot.date,
          time: slot.time,
          master: slot.master,
        }),
      });

      if (response.ok) {
        loadSlots();
        alert("Слот успешно удален!");
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error || "Не удалось удалить слот"}`);
      }
    } catch (error) {
      console.error("Error deleting slot:", error);
      alert("Произошла ошибка при удалении слота");
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

  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split("T")[0]);
    }
    return dates;
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

