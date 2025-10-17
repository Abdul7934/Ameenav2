import React, { useState, useEffect } from 'react';
import { SunIcon, MoonIcon } from '../icons/Icons';

type Theme = 'light' | 'dark' | 'auto';

const ThemeToggleButton: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('auto');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (mode: Theme) => {
      if (mode === 'dark' || (mode === 'auto' && media.matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    const init = savedTheme ?? 'auto';
    setTheme(init);
    apply(init);
    const listener = () => { if (theme === 'auto') apply('auto'); };
    media.addEventListener?.('change', listener);
    return () => media.removeEventListener?.('change', listener);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    if (theme === 'dark' || (theme === 'auto' && media.matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : prev === 'dark' ? 'auto' : 'light'));
    try {
      const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light';
      const toast = document.createElement('div');
      toast.className = 'theme-toast';
      toast.textContent = `Switched to ${next.charAt(0).toUpperCase() + next.slice(1)} Mode`;
      document.body.appendChild(toast);
      setTimeout(() => { toast.classList.add('show'); }, 10);
      setTimeout(() => { toast.classList.remove('show'); toast.remove(); }, 1600);
    } catch {}
  };

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle-btn"
      aria-label={`Switch theme (current: ${theme})`}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
};

export default ThemeToggleButton;
