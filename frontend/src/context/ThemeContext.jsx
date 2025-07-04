import { createContext, useState, useEffect, useContext } from "react";
import { useAuthUser } from "../hooks/authHooks/useAuthUser";

// Create the context
export const ThemeContext = createContext();

// Create a custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);

// Theme Provider component
export const ThemeProvider = ({ children }) => {
  const { authUser, isLoading } = useAuthUser(); // Get authUser and isLoading from your hook

  const getInitialTheme = () => {
    if (isLoading || !authUser) {
      return localStorage.getItem("theme") || "black";
    }

    if (authUser.forceBlackTheme) {
      return "black";
    }

    // 2. Fallback to localStorage if no forced theme
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      return storedTheme;
    }

    // 3. Fallback to a system preference or a default if nothing is stored
    // You can uncomment this if you want to respect system dark mode as a default
    // if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    //   return "dark";
    // }
    return "black"; // Your application's default theme if nothing else applies
  };

  const [theme, setThemeState] = useState(getInitialTheme);

  // This effect handles setting the initial theme once authUser data is loaded
  useEffect(() => {
    if (!isLoading) {
      // Only re-evaluate initial theme once authUser is not loading
      setThemeState(getInitialTheme());
    }
  }, [authUser, isLoading]); // Re-run when authUser or isLoading changes

  // Function to actually set the theme, handling the forced theme logic
  const setTheme = (newTheme) => {
    // Prevent setting a new theme if the user has forceBlackTheme set
    if (authUser && authUser.forceBlackTheme) {
      console.warn("Theme selection is locked for this user.");
      // Optionally, you could also display a small toast notification to the user
      // informing them their theme is forced.
      return; // Stop here, do not change the theme
    }

    // Proceed with setting the theme if not forced
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  useEffect(() => {
    // Apply the theme to the html tag
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]); // Re-run effect when theme changes

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
  );
};
