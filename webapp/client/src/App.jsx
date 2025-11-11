
import { useState, useEffect } from "react";

function App() {
  const tg = window.Telegram?.WebApp; // безопасный доступ

  const [service, setService] = useState("");
  const [master, setMaster] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    tg?.ready(); // вызываем ready один раз
  }, []); // пустой массив зависимостей

  const sendData = () => {
    if (!service || !master || !date) return alert("Заполните все поля!");
    tg?.sendData(JSON.stringify({ service, master, date }));
  };

  return (
    <div className="p-4 text-center">
      <h2 className="text-xl font-bold mb-4">💅 Запись на маникюр</h2>

      <select onChange={e => setService(e.target.value)} value={service}>
        <option value="">Выберите услугу</option>
        <option>Маникюр</option>
        <option>Покрытие гель-лаком</option>
        <option>Снятие покрытия</option>
      </select>

      <select onChange={e => setMaster(e.target.value)} value={master}>
        <option value="">Выберите мастера</option>
        <option>Анна</option>
        <option>Мария</option>
      </select>

      <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />

      <button onClick={sendData} className="bg-pink-500 text-white rounded-xl px-4 py-2 mt-4">
        Отправить
      </button>
    </div>
  );
}

export default App;
