import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({ theme: 'default', setTheme: () => {} });

export const THEMES = [
  { id: 'default',  label: 'Gold',   title: 'Dark Terminal Gold (default)' },
  { id: 'copper',   label: 'Copper', title: 'Oxidized Copper' },
  { id: 'slate',    label: 'Slate',  title: 'Monolithic Slate' },
];

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('default');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
