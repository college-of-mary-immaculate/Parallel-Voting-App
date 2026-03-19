import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ variant = 'dropdown', size = 'md', className = '' }) => {
  const { theme, currentTheme, isSystemTheme, changeTheme, toggleTheme, useSystemTheme, availableThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleThemeChange = (newTheme) => {
    changeTheme(newTheme);
    setIsOpen(false);
  };

  const handleSystemTheme = () => {
    useSystemTheme();
    setIsOpen(false);
  };

  const handleToggle = () => {
    toggleTheme();
  };

  const getThemeIcon = (themeName) => {
    switch (themeName) {
      case 'light':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'dark':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getSystemIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-sm';
      case 'lg':
        return 'px-4 py-3 text-lg';
      default:
        return 'px-3 py-2 text-base';
    }
  };

  // Simple toggle button variant
  if (variant === 'toggle') {
    return (
      <button
        onClick={handleToggle}
        className={`theme-button-secondary inline-flex items-center gap-2 rounded-lg ${getSizeClasses()} ${className}`}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {getThemeIcon(theme)}
        <span className="sr-only">Toggle theme</span>
      </button>
    );
  }

  // Dropdown variant
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`theme-button-secondary inline-flex items-center gap-2 rounded-lg ${getSizeClasses()}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Theme selector"
      >
        {getThemeIcon(theme)}
        <span className="text-sm font-medium">
          {isSystemTheme ? 'System' : theme.charAt(0).toUpperCase() + theme.slice(1)}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 theme-dropdown rounded-lg shadow-lg z-50">
          <div className="p-1">
            <div className="px-3 py-2 text-xs font-medium text-text-muted uppercase tracking-wider">
              Theme
            </div>
            
            {/* Theme options */}
            {availableThemes.map((themeName) => (
              <button
                key={themeName}
                onClick={() => handleThemeChange(themeName)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md theme-dropdown-item ${
                  theme === themeName && !isSystemTheme ? 'bg-primary bg-opacity-10' : ''
                }`}
                role="option"
                aria-selected={theme === themeName && !isSystemTheme}
              >
                {getThemeIcon(themeName)}
                <span className="flex-1 text-left">
                  {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
                </span>
                {theme === themeName && !isSystemTheme && (
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}

            {/* System theme option */}
            <div className="border-t border-border-primary my-1"></div>
            <button
              onClick={handleSystemTheme}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md theme-dropdown-item ${
                isSystemTheme ? 'bg-primary bg-opacity-10' : ''
              }`}
              role="option"
              aria-selected={isSystemTheme}
            >
              {getSystemIcon()}
              <span className="flex-1 text-left">System</span>
              {isSystemTheme && (
                <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>

          {/* Theme preview */}
          <div className="border-t border-border-primary p-3">
            <div className="text-xs font-medium text-text-muted mb-2">Preview</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded theme-card">
                <div className="w-full h-4 rounded bg-primary mb-1"></div>
                <div className="w-3/4 h-3 rounded bg-secondary mb-1"></div>
                <div className="w-1/2 h-3 rounded bg-tertiary"></div>
              </div>
              <div className="p-2 rounded theme-card">
                <div className="text-xs font-medium mb-1">Sample Text</div>
                <div className="text-xs text-text-secondary">Secondary text</div>
                <div className="text-xs text-text-muted">Muted text</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
