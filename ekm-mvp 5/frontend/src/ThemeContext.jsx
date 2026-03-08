import { createContext, useContext, useState, useCallback } from 'react'
import { THEMES, getTheme, setTheme as persistTheme } from './theme'

const ThemeCtx = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => getTheme())

  const toggleTheme = useCallback(() => {
    const next = theme.id === 'arctic' ? THEMES.slate : THEMES.arctic
    persistTheme(next.id)
    setThemeState(next)
  }, [theme])

  return (
    <ThemeCtx.Provider value={{ T: theme, toggleTheme }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeCtx)
}
