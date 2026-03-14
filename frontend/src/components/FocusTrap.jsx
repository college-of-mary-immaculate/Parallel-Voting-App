import React, { useEffect, useRef } from 'react';

export const FocusTrap = ({ children, active }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Focus first element when trap activates
    if (firstFocusable) {
      firstFocusable.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Save original focus
    const originalFocus = document.activeElement;

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Restore focus when trap deactivates
      if (originalFocus && typeof originalFocus.focus === 'function') {
        originalFocus.focus();
      }
    };
  }, [active]);

  return (
    <div ref={containerRef}>
      {children}
    </div>
  );
};

export default FocusTrap;
