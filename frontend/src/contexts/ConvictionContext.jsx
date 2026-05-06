import React, { createContext, useContext, useState, useEffect } from 'react';

const ConvictionContext = createContext({ conviction: 'base', setConviction: () => {} });

export function ConvictionProvider({ children }) {
  const [conviction, setConviction] = useState('base');

  useEffect(() => {
    document.documentElement.setAttribute('data-conviction', conviction);
  }, [conviction]);

  return (
    <ConvictionContext.Provider value={{ conviction, setConviction }}>
      {children}
    </ConvictionContext.Provider>
  );
}

export function useConviction() {
  return useContext(ConvictionContext);
}
