import React, { useState } from "react";

function BookingForm({ onSubmit }) {
  const [service, setService] = useState("");
  const [master, setMaster] = useState("");
  const [date, setDate] = useState("");

  const handleSubmit = () => {
    if (!service || !master || !date) {
      alert("Заполните все поля!");
      return;
    }
    onSubmit({ service, master, date });
  };

  return (
    <div>
      <select value={service} onChange={(e) => setService(e.target.value)}>
        <option value="">Выберите услугу</option>
        <option>Маникюр</option>
        <option>Покрытие гель-лаком</option>
        <option>Снятие покрытия</option>
      </select>

      <select value={master} onChange={(e) => setMaster(e.target.value)}>
        <option value="">Выберите мастера</option>
        <option>Анна</option>
        <option>Мария</option>
      </select>

      <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />

      <button onClick={handleSubmit}>Отправить</button>
    </div>
  );
}

export default BookingForm;