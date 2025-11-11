import { useEffect, useState } from "react";

function App() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    // Здесь можно подгрузить данные через API (если backend будет расширен)
    setBookings([
      { id: 1, user: "@katya", service: "Маникюр", date: "2025-11-12T10:00" },
      { id: 2, user: "@olga", service: "Покрытие", date: "2025-11-12T12:00" },
    ]);
  }, []);

  const confirmBooking = (id) => {
    window.Telegram.WebApp.sendData(JSON.stringify({ confirm: id }));
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">📋 Ваши записи</h2>
      {bookings.map(b => (
        <div key={b.id} className="p-2 border rounded mb-2">
          <p><b>{b.user}</b> — {b.service}</p>
          <p>⏰ {new Date(b.date).toLocaleString()}</p>
          <button className="bg-green-500 text-white rounded px-3 py-1 mt-1" onClick={() => confirmBooking(b.id)}>
            ✅ Подтвердить
          </button>
        </div>
      ))}
    </div>
  );
}

export default App;
