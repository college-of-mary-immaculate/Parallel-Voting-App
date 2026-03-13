import React, { createContext, useContext, useRef, useEffect, useState } from 'react';

const AccessibilityContext = createContext();

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

export const AccessibilityProvider = ({ children }) => {
  const [focusedElement, setFocusedElement] = useState(null);
  const [keyboardUser, setKeyboardUser] = useState(false);
  const skipLinksRef = useRef([]);
  const mainRef = useRef(null);
  const navRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Detect keyboard navigation
      if (e.key === 'Tab') {
        setKeyboardUser(true);
      }
      
      // Escape key handling
      if (e.key === 'Escape') {
        const activeModal = document.querySelector('[role="dialog"]');
        if (activeModal) {
          const closeButton = activeModal.querySelector('button[aria-label="Close"]');
          if (closeButton) {
            closeButton.click();
          }
        }
      }
      
      // Skip links handling
      if (e.altKey && e.key === 'm') {
        e.preventDefault();
        mainRef.current?.focus();
      }
      
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        navRef.current?.focus();
      }
    };

    const handleMouseDown = () => {
      setKeyboardUser(false);
    };

    const handleFocusIn = (e) => {
      setFocusedElement(e.target);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, []);

  const announceToScreenReader = (message, priority = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  const trapFocus = (element) => {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    element.addEventListener('keydown', handleTabKey);
    
    return () => {
      element.removeEventListener('keydown', handleTabKey);
    };
  };

  const value = {
    focusedElement,
    keyboardUser,
    announceToScreenReader,
    trapFocus,
    mainRef,
    navRef,
    skipLinksRef
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const SkipLinks = () => {
  const { mainRef, navRef } = useAccessibility();

  return (
    <div className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50">
      <a
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
        className="bg-white px-4 py-2 text-blue-600 border-2 border-blue-600 rounded-md shadow-lg"
      >
        Skip to main content
      </a>
      <a
        href="#navigation"
        onClick={(e) => {
          e.preventDefault();
          navRef.current?.focus();
        }}
        className="bg-white px-4 py-2 text-blue-600 border-2 border-blue-600 rounded-md shadow-lg mt-2"
      >
        Skip to navigation
      </a>
    </div>
  );
};

export default AccessibilityProvider;
