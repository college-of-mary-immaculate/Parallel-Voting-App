import React, { useState } from 'react';

const EnhancedFormField = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  onFocus,
  error,
  touched,
  required = false,
  placeholder,
  autoComplete,
  className = '',
  disabled = false,
  showPasswordToggle = false,
  showSuccessIndicator = false,
  showLoadingIndicator = false,
  helperText,
  errorIcon = true,
  successIcon = true,
  debounceMs = 300,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);

  // Sync local value with prop value
  React.useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const inputType = type === 'password' && showPassword ? 'text' : type;

  const renderInput = () => {
    if (type === 'select') {
      return (
        <select
          id={name}
          name={name}
          value={localValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          required={required}
          disabled={disabled}
          className={getInputClasses()}
          aria-invalid={hasError}
          aria-describedby={showHelper ? `${name}-helper` : undefined}
          {...props}
        >
          {children}
        </select>
      );
    }

    if (type === 'textarea') {
      return (
        <textarea
          id={name}
          name={name}
          value={localValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          rows={props.rows || 3}
          className={getInputClasses()}
          aria-invalid={hasError}
          aria-describedby={showHelper ? `${name}-helper` : undefined}
          {...props}
        />
      );
    }

    return (
      <input
        id={name}
        name={name}
        type={inputType}
        value={localValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className={getInputClasses()}
        aria-invalid={hasError}
        aria-describedby={showHelper ? `${name}-helper` : undefined}
        {...props}
      />
    );
  };

  const hasError = error && touched;
  const hasSuccess = showSuccessIndicator && !error && touched && localValue;
  const showHelper = helperText || hasError;

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    if (onChange) {
      onChange(e);
    }
  };

  const handleInputFocus = (e) => {
    setIsFocused(true);
    if (onFocus) {
      onFocus(e);
    }
  };

  const handleInputBlur = (e) => {
    setIsFocused(false);
    if (onBlur) {
      onBlur(e);
    }
  };

  const getInputClasses = () => {
    const baseClasses = `
      block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400
      transition-colors duration-200 ease-in-out
      disabled:bg-gray-100 disabled:cursor-not-allowed
    `;

    const stateClasses = disabled
      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
      : hasError
      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
      : hasSuccess
      ? 'border-green-300 text-green-900 placeholder-green-300 focus:ring-green-500 focus:border-green-500 bg-green-50'
      : isFocused
      ? 'border-indigo-300 text-gray-900 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500 bg-white'
      : 'border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500 bg-white';

    return `${baseClasses} ${stateClasses} ${className}`.trim();
  };

  const getLabelClasses = () => {
    const baseClasses = 'block text-sm font-medium transition-colors duration-200';
    const stateClasses = hasError
      ? 'text-red-700'
      : hasSuccess
      ? 'text-green-700'
      : disabled
      ? 'text-gray-400'
      : 'text-gray-700';
    
    return `${baseClasses} ${stateClasses}`;
  };

  const getHelperClasses = () => {
    const baseClasses = 'text-sm mt-1 flex items-start transition-colors duration-200';
    const stateClasses = hasError
      ? 'text-red-600'
      : hasSuccess
      ? 'text-green-600'
      : 'text-gray-500';
    
    return `${baseClasses} ${stateClasses}`;
  };

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={name} className={getLabelClasses()}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
          {hasSuccess && successIcon && (
            <svg className="h-4 w-4 ml-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
        </label>
      )}
      
      <div className="relative">
        {renderInput()}
        
        {/* Right side indicators */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-1">
          {showLoadingIndicator && (
            <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
          )}
          
          {showPasswordToggle && type === 'password' && (
            <button
              type="button"
              onClick={togglePassword}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
              tabIndex="-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Helper text / Error message */}
      {showHelper && (
        <div id={`${name}-helper`} className={getHelperClasses()}>
          {hasError && errorIcon && (
            <svg className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          {hasError ? error : helperText}
        </div>
      )}
    </div>
  );
};

export default EnhancedFormField;
