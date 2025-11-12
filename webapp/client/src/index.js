import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AdminPanel from './AdminPanel';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Простая маршрутизация на основе пути
const path = window.location.pathname;
let Component = App;

if (path.includes('/admin')) {
  Component = AdminPanel;
}

root.render(
  <React.StrictMode>
    <Component />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
