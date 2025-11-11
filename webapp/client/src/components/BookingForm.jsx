import React, { useState } from "react";

function BookingForm() {
  const [service, setService] = useState("");
  const [master, setMaster] = useState("");
  const [date, setDate] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    // Проверка на заполненность
    if (!service || !master || !date) {
      alert("Пожалуйста, заполните все поля");
      return;
    }

    // Отправка данных в Telegram Web App
    if (window.Telegram.WebApp) {
      window.Telegram.WebApp.sendData(
        JSON.stringify({ service, master, date })
      );
    }

    alert(`Запись принята!\nУслуга: ${service}\nМастер: ${master}\nДата: ${date}`);
  };

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", padding: "20px" }}>
      <h2>Запись на маникюр</h2>
      <form onSubmit={handleSubmit}>
        <label>Услуга:</label>
        <select
          value={service}
          onChange={(e) => setService(e.target.value)}
          required
        >
          <option value="">Выберите услугу</option>
          <option value="Маникюр классический">Маникюр классический</option>
          <option value="Маникюр аппаратный">Маникюр аппаратный</option>
          <option value="Педикюр">Педикюр</option>
        </select>

        <label>Мастер:</label>
        <select
          value={master}
          onChange={(e) => setMaster(e.target.value)}
          required
        >
          <option value="">Выберите мастера</option>
          <option value="Анна">Анна</option>
          <option value="Мария">Мария</option>
          <option value="Екатерина">Екатерина</option>
        </select>

        <label>Дата:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        <button type="submit" style={{ marginTop: "10px" }}>
          Записаться
        </button>
      </form>
    </div>
  );
}

export default BookingForm;