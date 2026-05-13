import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type ColorPalette } from './colors';
import { getThemeMode, setThemeMode, type ThemeMode } from '../lib/preferences';

interface ThemeCtx {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  colors: ColorPalette;
  isDark: boolean;
}

const Ctx = createContext<ThemeCtx>({
  mode: 'auto',
  setMode: () => {},
  colors: darkColors,
  isDark: true,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const sys = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('auto');

  useEffect(() => {
    getThemeMode().then(setModeState);
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    setThemeMode(m);
  }, []);

  const isDark = mode === 'auto' ? sys !== 'light' : mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const value = useMemo(() => ({ mode, setMode, colors, isDark }), [mode, setMode, colors, isDark]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
