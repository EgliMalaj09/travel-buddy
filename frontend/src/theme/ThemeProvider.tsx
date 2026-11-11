import { createContext, useContext, type ReactNode } from 'react';

import { theme, type Theme } from './tokens';

/**
 * Theme is shared through React Context (agreed in decisions/tech-stack.md: Context for
 * the theme and the logged-in user, Zustand for screen state).
 * Only one light theme for now; a night theme can be added here later.
 */
const ThemeContext = createContext<Theme>(theme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
