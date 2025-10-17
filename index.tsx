
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Default to dark theme on first load
try {
  const savedTheme = localStorage.getItem('theme');
  if (!savedTheme) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }
} catch {}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);