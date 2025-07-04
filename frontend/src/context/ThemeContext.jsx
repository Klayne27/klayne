// src/context/ThemeContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";

// Create the context
export const ThemeContext = createContext();

// Create a custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);

// Theme Provider component
export const ThemeProvider = ({ children }) => {
  // Get theme from localStorage or default to 'black' (or your preferred default)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "black"; // Set 'black' as the default
  });

  useEffect(() => {
    // Apply the theme to the html tag
    document.documentElement.setAttribute("data-theme", theme);
    // Save the theme to localStorage
    localStorage.setItem("theme", theme);
  }, [theme]); // Re-run effect when theme changes

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
  );
};
