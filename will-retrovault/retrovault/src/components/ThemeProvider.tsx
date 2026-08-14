"use client";
/**
 * ThemeProvider — manages color palette, style theme, and light/dark mode.
 *
 * Mode is stored in ThemeState and applied as data-mode="light|dark" on <html>.
 * Color palettes apply via data-color on <html>; style themes via body class.
 *
 * When switching to light mode:
 * - Dark-only style themes (scanline, galaxy) are automatically swapped to 'terminal'
 * - CSS [data-mode="light"] block handles the rest (bg, text, border overrides)
 */

import { createContext, useContext, useState, useEffect } from "react";
import { STYLE_THEMES, DEFAULT_THEME } from "@/data/themes";

const THEME_KEY = "rv-theme";

export type ThemeMode = "dark" | "light";
export type ThemeState = { colorId: string; styleId: string; mode: ThemeMode };

type ThemeContextType = {
  theme:    ThemeState;
  setTheme: (t: ThemeState) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: DEFAULT_THEME,
  setTheme:   () => {},
  toggleMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function getInitialTheme(): ThemeState {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const saved = JSON.parse(localStorage.getItem(THEME_KEY) || "null") as ThemeState | null;
    return saved ? { ...saved, mode: (saved.mode ?? 'dark') as ThemeMode } : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function applyTheme(colorId: string, styleId: string, mode: ThemeMode) {
  const html = document.documentElement;

  // Apply color palette
  if (colorId === 'green') {
    html.removeAttribute('data-color');
  } else {
    html.setAttribute('data-color', colorId);
  }

  // Apply light/dark mode
  if (mode === 'light') {
    html.setAttribute('data-mode', 'light');
  } else {
    html.removeAttribute('data-mode');
  }

  // Guard: dark-only themes fall back to terminal in light mode
  const styleTheme = STYLE_THEMES.find(t => t.id === styleId);
  const effectiveStyle = (mode === 'light' && styleTheme?.modes === 'dark')
    ? 'terminal'
    : styleId;

  // Apply style theme class to body
  STYLE_THEMES.forEach(t => document.body.classList.remove(t.cssClass));
  document.body.classList.add(`theme-${effectiveStyle}`);

  // Clear any inline style overrides
  document.body.style.backgroundImage = '';
  document.body.style.backgroundColor = '';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeState>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme.colorId, theme.styleId, theme.mode);
  }, [theme]);

  const setTheme = (t: ThemeState) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, JSON.stringify(t));
    applyTheme(t.colorId, t.styleId, t.mode);
  };

  const toggleMode = () => {
    const newMode: ThemeMode = theme.mode === 'dark' ? 'light' : 'dark';
    const styleTheme = STYLE_THEMES.find(t => t.id === theme.styleId);
    let newStyle = theme.styleId;
    if (newMode === 'light') {
      // Dark-only styles fall back to paper (soft, readable)
      if (!styleTheme || styleTheme.modes === 'dark') newStyle = 'paper';
    } else {
      // Light-only styles fall back to terminal
      if (styleTheme?.modes === 'light') newStyle = 'terminal';
    }
    setTheme({ ...theme, mode: newMode, styleId: newStyle });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
