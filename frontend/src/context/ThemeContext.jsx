import { createContext, useState, useEffect, useContext } from "react"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import { useCallback } from "react"

export const ThemeContext = createContext()

export const useTheme = () => useContext(ThemeContext)

export const ThemeProvider = ({ children }) => {
  const { authUser, isLoading } = useAuthUser()

  const getInitialTheme = useCallback(() => {
    if (isLoading || !authUser) {
      return localStorage.getItem("theme") || "black"
    }

    if (authUser.forceBlackTheme) {
      return "black"
    }

    const storedTheme = localStorage.getItem("theme")
    if (storedTheme) {
      return storedTheme
    }
    return "black"
  }, [authUser, isLoading])

  const [theme, setThemeState] = useState(getInitialTheme)

  useEffect(() => {
    if (!isLoading) {
      setThemeState(getInitialTheme())
    }
  }, [authUser, isLoading, getInitialTheme])

  const setTheme = (newTheme) => {
    if (authUser && authUser.forceBlackTheme) {
      console.warn("Theme selection is locked for this user.")
      return
    }

    setThemeState(newTheme)
    localStorage.setItem("theme", newTheme)
  }

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
  }, [theme])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
