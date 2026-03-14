import React, { useState } from 'react';

const EnhancedFormField = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  touched,
  required = false,
  disabled = false,
  placeholder,
  autoComplete,
  showSuccessIndicator = false,
  showLoadingIndicator = false,
  showPasswordToggle = false,
  helperText,
  className = '',
  children,
  ...props
}) => {
  const [localValue, setLocalValue] = useState(value || '');
  const [showPassword, setShowPassword] = useState(false);

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
          onChange={onChange}
          onFocus={(e) => {
            e.target.setAttribute('aria-describedby', helperText ? `${name}-helper` : undefined);
          }}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
          className={getInputClasses()}
          aria-invalid={error && touched}
          aria-describedby={showHelper ? `${name}-helper` : undefined}
          aria-required={required}
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
          onChange={onChange}
          onFocus={(e) => {
            e.target.setAttribute('aria-describedby', helperText ? `${name}-helper` : undefined);
          }}
          onBlur={onBlur}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          rows={props.rows || 3}
          className={getInputClasses()}
          aria-invalid={error && touched}
          aria-describedby={showHelper ? `${name}-helper` : undefined}
          aria-required={required}
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
        onChange={onChange}
        onFocus={(e) => {
          e.target.setAttribute('aria-describedby', helperText ? `${name}-helper` : undefined);
        }}
        onBlur={onBlur}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className={getInputClasses()}
        aria-invalid={error && touched}
        aria-describedby={showHelper ? `${name}-helper` : undefined}
        aria-required={required}
        {...props}
      />
    );
  };

  const hasError = error && touched;
  const hasSuccess = showSuccessIndicator && !error && touched && localValue;
  const showHelper = helperText || hasError;

  const getInputClasses = () => {
    const baseClasses = 'block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200';
    const colorClasses = hasError
      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
      : hasSuccess
      ? 'border-green-300 text-green-900 placeholder-green-300 focus:ring-green-500 focus:border-green-500'
      : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500';
    
    const disabledClasses = disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : '';
    const loadingClasses = showLoadingIndicator ? 'pr-10' : '';
    
    return `${baseClasses} ${colorClasses} ${disabledClasses} ${loadingClasses} ${className}`;
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
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label 
          htmlFor={name}
          className={getLabelClasses()}
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
          {hasSuccess && (
            <svg 
              className="h-4 w-4 ml-1 text-green-500 inline-block" 
              fill="currentColor" 
              viewBox="0 0 20 20"
              aria-label="Field is valid"
            >
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
        </label>
      )}
      
      <div className="relative">
        {renderInput()}
        
        {/* Right side indicators */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-1" role="status" aria-live="polite">
          {showLoadingIndicator && (
            <div 
              className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" 
              aria-label="Loading"
            />
          )}
          
          {showPasswordToggle && type === 'password' && (
            <button
              type="button"
              onClick={togglePassword}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
              tabIndex="-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Helper text and error message */}
      {showHelper && (
        <div 
          id={`${name}-helper`}
          className={getHelperClasses()}
          role={hasError ? 'alert' : 'status'}
          aria-live={hasError ? 'assertive' : 'polite'}
        >
          {hasError ? error : helperText}
        </div>
      )}
    </div>
  );
};

export default EnhancedFormField;
