import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ThemeConfig } from '../theme/config';
import { THEMES } from '../theme/config';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase/config';

interface ThemeContextType {
  theme: ThemeConfig;
  setProjectTheme: (projectId: string | null) => void;
  themes: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextType>({
  theme: THEMES[0],
  setProjectTheme: () => {},
  themes: THEMES,
});

function applyTheme(t: ThemeConfig) {
  const root = document.documentElement;
  root.style.setProperty('--theme-primary', t.primaryColor);
  root.style.setProperty('--theme-secondary', t.secondaryColor);
  root.style.setProperty('--theme-primary-glow', `${t.primaryColor}80`);
  root.style.setProperty('--theme-primary-dim', `${t.primaryColor}30`);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeConfig>(THEMES[0]);
  const [projectId, setProjectId] = useState<string | null>(null);

  // When projectId changes, listen to Firebase for that project's theme
  useEffect(() => {
    // BUG FIX: Removed premature `applyTheme(THEMES[0])` that was here before.
    // It caused a visual flash to default green every time projectId changed,
    // even when switching between projects (not just going back to home).
    if (!projectId) {
      // Back to home — use default theme
      const defaultTheme = THEMES[0];
      setThemeState(defaultTheme);
      applyTheme(defaultTheme);
      return;
    }

    const r = ref(database, `projects/${projectId}/theme`);
    const unsub = onValue(r, (snap) => {
      const themeId: string | null = snap.val();
      const found = themeId ? THEMES.find(t => t.id === themeId) : null;
      const resolved = found ?? THEMES[0];
      setThemeState(resolved);
      applyTheme(resolved);
    });
    return () => unsub();
  }, [projectId]);

  // (initial theme applied in the projectId effect above when projectId=null)

  const setProjectTheme = useCallback((id: string | null) => {
    setProjectId(id);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setProjectTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
