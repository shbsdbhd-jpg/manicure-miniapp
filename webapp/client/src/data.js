// Статические данные (без API)
export const SERVICES = [
  { id: 1, name: "Классический маникюр", duration: 60, price: 1500 },
  { id: 2, name: "Покрытие гель-лаком", duration: 90, price: 2000 },
  { id: 3, name: "Снятие покрытия", duration: 30, price: 500 },
  { id: 4, name: "Маникюр + покрытие", duration: 120, price: 3000 },
  { id: 5, name: "SPA-маникюр", duration: 90, price: 2500 },
];

export const MASTERS = [
  { id: 1, name: "Анна" },
  { id: 2, name: "Мария" },
  { id: 3, name: "Елена" },
];

// Функции для работы с localStorage (слоты)
export const getSlotsFromStorage = () => {
  try {
    const slots = localStorage.getItem('availableSlots');
    return slots ? JSON.parse(slots) : [];
  } catch (error) {
    console.error('Error reading slots from storage:', error);
    return [];
  }
};

export const saveSlotsToStorage = (slots) => {
  try {
    localStorage.setItem('availableSlots', JSON.stringify(slots));
  } catch (error) {
    console.error('Error saving slots to storage:', error);
  }
};

export const generateDefaultSlots = () => {
  const slots = [];
  const today = new Date();
  const masters = MASTERS.map(m => m.name);
  
  // Генерируем слоты на 30 дней вперед
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Время работы: 9:00 - 20:00, каждые 30 минут
    for (let hour = 9; hour < 21; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Добавляем слот для каждого мастера
        masters.forEach(master => {
          slots.push({
            date: dateStr,
            time: timeStr,
            master: master,
            is_available: true
          });
        });
      }
    }
  }
  
  return slots;
};

// Инициализация слотов при первом запуске
export const initSlotsIfNeeded = () => {
  const slots = getSlotsFromStorage();
  if (slots.length === 0) {
    const defaultSlots = generateDefaultSlots();
    saveSlotsToStorage(defaultSlots);
    return defaultSlots;
  }
  return slots;
};

