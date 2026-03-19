import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [isSystemTheme, setIsSystemTheme] = useState(false);

  // Define theme configurations
  const themes = {
    light: {
      name: 'light',
      colors: {
        primary: '#4F46E5',
        'primary-dark': '#4338CA',
        'primary-light': '#818CF8',
        secondary: '#6B7280',
        'secondary-dark': '#4B5563',
        'secondary-light': '#9CA3AF',
        accent: '#10B981',
        'accent-dark': '#059669',
        'accent-light': '#34D399',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        
        // Background colors
        'bg-primary': '#FFFFFF',
        'bg-secondary': '#F9FAFB',
        'bg-tertiary': '#F3F4F6',
        'bg-inverse': '#111827',
        
        // Surface colors
        'surface-primary': '#FFFFFF',
        'surface-secondary': '#F9FAFB',
        'surface-tertiary': '#F3F4F6',
        'surface-inverse': '#1F2937',
        
        // Text colors
        'text-primary': '#111827',
        'text-secondary': '#4B5563',
        'text-tertiary': '#6B7280',
        'text-inverse': '#F9FAFB',
        'text-muted': '#9CA3AF',
        
        // Border colors
        'border-primary': '#E5E7EB',
        'border-secondary': '#D1D5DB',
        'border-tertiary': '#9CA3AF',
        'border-inverse': '#374151',
        
        // Shadow colors
        'shadow-light': 'rgba(0, 0, 0, 0.1)',
        'shadow-medium': 'rgba(0, 0, 0, 0.15)',
        'shadow-dark': 'rgba(0, 0, 0, 0.25)',
      },
      shadows: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      }
    },
    dark: {
      name: 'dark',
      colors: {
        primary: '#6366F1',
        'primary-dark': '#4F46E5',
        'primary-light': '#818CF8',
        secondary: '#9CA3AF',
        'secondary-dark': '#6B7280',
        'secondary-light': '#D1D5DB',
        accent: '#34D399',
        'accent-dark': '#10B981',
        'accent-light': '#6EE7B7',
        success: '#34D399',
        warning: '#FBBF24',
        error: '#F87171',
        info: '#60A5FA',
        
        // Background colors
        'bg-primary': '#0F172A',
        'bg-secondary': '#1E293B',
        'bg-tertiary': '#334155',
        'bg-inverse': '#FFFFFF',
        
        // Surface colors
        'surface-primary': '#1E293B',
        'surface-secondary': '#334155',
        'surface-tertiary': '#475569',
        'surface-inverse': '#F9FAFB',
        
        // Text colors
        'text-primary': '#F9FAFB',
        'text-secondary': '#D1D5DB',
        'text-tertiary': '#9CA3AF',
        'text-inverse': '#111827',
        'text-muted': '#6B7280',
        
        // Border colors
        'border-primary': '#334155',
        'border-secondary': '#475569',
        'border-tertiary': '#6B7280',
        'border-inverse': '#E5E7EB',
        
        // Shadow colors
        'shadow-light': 'rgba(0, 0, 0, 0.3)',
        'shadow-medium': 'rgba(0, 0, 0, 0.4)',
        'shadow-dark': 'rgba(0, 0, 0, 0.6)',
      },
      shadows: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
      }
    }
  };

  // Get system theme preference
  const getSystemTheme = useCallback(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }, []);

  // Load saved theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const savedIsSystem = localStorage.getItem('isSystemTheme') === 'true';
    
    if (savedIsSystem) {
      setIsSystemTheme(true);
      setTheme(getSystemTheme());
    } else if (savedTheme && themes[savedTheme]) {
      setTheme(savedTheme);
      setIsSystemTheme(false);
    } else {
      // Default to system theme if no saved preference
      setIsSystemTheme(true);
      setTheme(getSystemTheme());
    }
  }, [getSystemTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (!window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (isSystemTheme) {
        setTheme(getSystemTheme());
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isSystemTheme, getSystemTheme]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    const currentTheme = themes[theme];
    
    if (currentTheme) {
      // Apply color variables
      Object.entries(currentTheme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value);
      });
      
      // Apply shadow variables
      Object.entries(currentTheme.shadows).forEach(([key, value]) => {
        root.style.setProperty(`--shadow-${key}`, value);
      });
      
      // Set data attribute for CSS targeting
      root.setAttribute('data-theme', theme);
    }
  }, [theme, themes]);

  // Change theme function
  const changeTheme = useCallback((newTheme) => {
    if (themes[newTheme]) {
      setTheme(newTheme);
      setIsSystemTheme(false);
      localStorage.setItem('theme', newTheme);
      localStorage.setItem('isSystemTheme', 'false');
    }
  }, [themes]);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    changeTheme(newTheme);
  }, [theme, changeTheme]);

  // Use system theme
  const useSystemTheme = useCallback(() => {
    const systemTheme = getSystemTheme();
    setTheme(systemTheme);
    setIsSystemTheme(true);
    localStorage.setItem('theme', systemTheme);
    localStorage.setItem('isSystemTheme', 'true');
  }, [getSystemTheme]);

  // Get current theme configuration
  const currentTheme = themes[theme];

  const value = {
    theme,
    currentTheme,
    isSystemTheme,
    themes,
    changeTheme,
    toggleTheme,
    useSystemTheme,
    availableThemes: Object.keys(themes)
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
