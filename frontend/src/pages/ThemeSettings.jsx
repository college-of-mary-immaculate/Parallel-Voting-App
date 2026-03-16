import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from '../components';

const ThemeSettings = () => {
  const { theme, currentTheme, isSystemTheme, changeTheme, useSystemTheme, availableThemes } = useTheme();

  const getThemePreview = (themeName) => {
    const themeColors = currentTheme.colors;
    return (
      <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-primary transition-colors">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-primary"></div>
            <span className="text-sm font-medium">Primary</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-secondary"></div>
            <span className="text-sm font-medium">Secondary</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-accent"></div>
            <span className="text-sm font-medium">Accent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-success"></div>
            <span className="text-sm font-medium">Success</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-warning"></div>
            <span className="text-sm font-medium">Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-error"></div>
            <span className="text-sm font-medium">Error</span>
          </div>
        </div>
        
        {/* Sample UI elements */}
        <div className="space-y-2 pt-3 border-t border-gray-200">
          <div className="theme-button px-3 py-2 rounded text-sm">Button</div>
          <div className="theme-input px-3 py-2 rounded text-sm" placeholder="Input field"></div>
          <div className="theme-card p-3 rounded">
            <div className="text-sm font-medium">Card Component</div>
            <div className="text-xs text-secondary">This is how cards look in this theme</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Theme Settings</h1>
          <p className="text-gray-600">Customize the appearance of the application with different themes and color schemes.</p>
        </div>

        {/* Current Theme Status */}
        <div className="theme-card p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Theme</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {theme === 'light' ? '☀️' : '🌙'}
                </span>
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {isSystemTheme ? 'System' : theme.charAt(0).toUpperCase() + theme.slice(1)}
                </div>
                <div className="text-sm text-secondary">
                  {isSystemTheme 
                    ? 'Automatically follows your system preference' 
                    : `Manually selected ${theme} theme`
                  }
                </div>
              </div>
            </div>
            <ThemeToggle variant="dropdown" size="md" />
          </div>
        </div>

        {/* Theme Selection */}
        <div className="theme-card p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Themes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableThemes.map((themeName) => (
              <div
                key={themeName}
                className={`relative cursor-pointer transition-all ${
                  theme === themeName && !isSystemTheme
                    ? 'ring-2 ring-primary ring-offset-2'
                    : 'hover:shadow-lg'
                }`}
                onClick={() => changeTheme(themeName)}
              >
                {theme === themeName && !isSystemTheme && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
                <h3 className="text-lg font-medium text-gray-900 mb-3 capitalize">
                  {themeName} Theme
                  {themeName === 'light' && ' ☀️'}
                  {themeName === 'dark' && ' 🌙'}
                </h3>
                <div className="text-sm text-secondary mb-4">
                  {themeName === 'light' 
                    ? 'Bright and clean interface for daytime use'
                    : 'Dark interface for reduced eye strain in low light'
                  }
                </div>
                {getThemePreview(themeName)}
              </div>
            ))}
          </div>
        </div>

        {/* System Theme Option */}
        <div className="theme-card p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Theme</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Follow System Preference</div>
              <div className="text-sm text-secondary">
                Automatically switch between light and dark themes based on your system settings
              </div>
            </div>
            <button
              onClick={useSystemTheme}
              className={`theme-button px-4 py-2 rounded-lg ${
                isSystemTheme ? 'bg-primary' : 'theme-button-secondary'
              }`}
            >
              {isSystemTheme ? 'Active' : 'Enable'}
            </button>
          </div>
        </div>

        {/* Theme Features */}
        <div className="theme-card p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Theme Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">✨ Dynamic Colors</h3>
              <p className="text-sm text-secondary">
                All colors automatically adjust based on the selected theme for consistent visual experience.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">🎨 CSS Variables</h3>
              <p className="text-sm text-secondary">
                Built with CSS custom properties for instant theme switching without page reload.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">💾 Persistent Settings</h3>
              <p className="text-sm text-secondary">
                Your theme preference is saved and restored automatically on each visit.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">♿ Accessibility</h3>
              <p className="text-sm text-secondary">
                Respects system preferences and supports high contrast and reduced motion modes.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="theme-card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => changeTheme('light')}
              className="theme-button px-4 py-2 rounded-lg flex items-center gap-2"
            >
              ☀️ Switch to Light
            </button>
            <button
              onClick={() => changeTheme('dark')}
              className="theme-button px-4 py-2 rounded-lg flex items-center gap-2"
            >
              🌙 Switch to Dark
            </button>
            <button
              onClick={useSystemTheme}
              className="theme-button-secondary px-4 py-2 rounded-lg flex items-center gap-2"
            >
              🖥️ Use System
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSettings;
