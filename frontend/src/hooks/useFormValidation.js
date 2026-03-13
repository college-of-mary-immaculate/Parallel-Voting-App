import { useState, useCallback, useEffect } from 'react';
import { validateField, validateForm } from '../utils/validation';

/**
 * Enhanced form validation hook with real-time validation and better UX
 * @param {Object} initialFormData - Initial form data
 * @param {Object} validationSchema - Validation rules for each field
 * @param {Object} options - Additional options
 * @returns {Object} - Form state and handlers
 */
export const useFormValidation = (initialFormData, validationSchema, options = {}) => {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    debounceMs = 300,
    showErrorsOnChange = false,
    customValidations = {}
  } = options;

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [debouncedErrors, setDebouncedErrors] = useState({});
  const [submitCount, setSubmitCount] = useState(0);

  // Real-time validation with debouncing
  const validateFieldRealTime = useCallback((fieldName, value, allFormData) => {
    if (!validateOnChange) return;

    setIsValidating(true);
    
    // Get validation rules including custom ones
    const fieldRules = {
      ...validationSchema[fieldName],
      ...customValidations[fieldName]
    };

    // Handle cross-field validations
    if (fieldRules.custom && fieldRules.custom.validate) {
      const customError = fieldRules.custom.validate(value, allFormData);
      if (customError) {
        setDebouncedErrors(prev => ({ ...prev, [fieldName]: customError }));
        setIsValidating(false);
        return;
      }
    }

    // Regular validation
    const fieldErrors = validateField(fieldName, value, fieldRules);
    const errorMessage = fieldErrors.length > 0 ? fieldErrors[0] : '';

    setDebouncedErrors(prev => ({ ...prev, [fieldName]: errorMessage }));
    
    // Show errors immediately if configured
    if (showErrorsOnChange && touched[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: errorMessage }));
    }
    
    setIsValidating(false);
  }, [validationSchema, customValidations, validateOnChange, showErrorsOnChange, touched]);

  // Debounced validation
  useEffect(() => {
    if (!validateOnChange || debounceMs <= 0) return;

    const timer = setTimeout(() => {
      setErrors(debouncedErrors);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [debouncedErrors, validateOnChange, debounceMs]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Clear error for this field immediately when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
      setDebouncedErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Real-time validation if field has been touched
    if (touched[name] || validateOnChange) {
      validateFieldRealTime(name, newValue, { ...formData, [name]: newValue });
    }
  }, [formData, touched, errors, validateOnChange, validateFieldRealTime]);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    if (validateOnBlur) {
      validateFieldRealTime(name, formData[name], formData);
    }
  }, [formData, validateOnBlur, validateFieldRealTime]);

  const handleFocus = useCallback((e) => {
    const { name } = e.target;
    
    // Clear error on focus for better UX
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const validateAllFields = useCallback(() => {
    const allErrors = validateForm(formData, validationSchema);
    
    // Apply custom validations
    Object.keys(customValidations).forEach(fieldName => {
      const customValidation = customValidations[fieldName];
      if (customValidation.custom && customValidation.custom.validate) {
        const customError = customValidation.custom.validate(formData[fieldName], formData);
        if (customError) {
          allErrors[fieldName] = customError;
        }
      }
    });

    setErrors(allErrors);
    
    // Mark all fields as touched
    const allTouched = Object.keys(formData).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    return Object.keys(allErrors).length === 0;
  }, [formData, validationSchema, customValidations]);

  const handleSubmit = useCallback(async (onSubmit) => {
    setIsSubmitting(true);
    setSubmitCount(prev => prev + 1);

    const isValid = validateAllFields();

    if (isValid && onSubmit) {
      try {
        await onSubmit(formData);
      } catch (error) {
        console.error('Form submission error:', error);
      }
    }

    setIsSubmitting(false);
    return isValid;
  }, [formData, validateAllFields]);

  const resetForm = useCallback((newFormData = initialFormData) => {
    setFormData(newFormData);
    setErrors({});
    setTouched({});
    setDebouncedErrors({});
    setSubmitCount(0);
    setIsSubmitting(false);
  }, [initialFormData]);

  const setFieldValue = useCallback((name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Validate if field has been touched
    if (touched[name]) {
      validateFieldRealTime(name, value, { ...formData, [name]: value });
    }
  }, [touched, formData, validateFieldRealTime]);

  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
  }, []);

  const clearFieldError = useCallback((name) => {
    setErrors(prev => ({
      ...prev,
      [name]: ''
    }));
    setDebouncedErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
    setDebouncedErrors({});
  }, []);

  // Computed values
  const hasErrors = Object.keys(errors).some(key => errors[key]);
  const hasTouchedErrors = Object.keys(errors).some(key => errors[key] && touched[key]);
  const isFormValid = !hasErrors && Object.keys(formData).length > 0;
  const isDirty = Object.keys(touched).some(key => touched[key]);

  return {
    // State
    formData,
    errors,
    touched,
    isSubmitting,
    isValidating,
    submitCount,
    hasErrors,
    hasTouchedErrors,
    isFormValid,
    isDirty,

    // Handlers
    handleChange,
    handleBlur,
    handleFocus,
    handleSubmit,
    resetForm,

    // Field utilities
    setFieldValue,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    validateAllFields,

    // Helper for field props
    getFieldProps: (name) => ({
      name,
      value: formData[name] || '',
      onChange: handleChange,
      onBlur: handleBlur,
      onFocus: handleFocus,
      error: errors[name],
      touched: touched[name],
      disabled: isSubmitting
    })
  };
};

/**
 * Hook for async field validation (e.g., checking email availability)
 */
export const useAsyncValidation = () => {
  const [asyncValidations, setAsyncValidations] = useState({});
  const [isAsyncValidating, setIsAsyncValidating] = useState({});

  const validateAsync = useCallback(async (fieldName, validator, value) => {
    setIsAsyncValidating(prev => ({ ...prev, [fieldName]: true }));
    
    try {
      const result = await validator(value);
      setAsyncValidations(prev => ({ ...prev, [fieldName]: result }));
      return result;
    } catch (error) {
      setAsyncValidations(prev => ({ ...prev, [fieldName]: { isValid: false, error: 'Validation failed' } }));
      return { isValid: false, error: 'Validation failed' };
    } finally {
      setIsAsyncValidating(prev => ({ ...prev, [fieldName]: false }));
    }
  }, []);

  const clearAsyncValidation = useCallback((fieldName) => {
    setAsyncValidations(prev => {
      const newState = { ...prev };
      delete newState[fieldName];
      return newState;
    });
    setIsAsyncValidating(prev => ({ ...prev, [fieldName]: false }));
  }, []);

  return {
    asyncValidations,
    isAsyncValidating,
    validateAsync,
    clearAsyncValidation
  };
};

export default useFormValidation;
