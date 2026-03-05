// Form validation utilities
import { useState, useCallback } from 'react';

export const validationRules = {
  // Email validation
  email: {
    required: 'Email is required',
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address'
    },
    maxLength: {
      value: 255,
      message: 'Email must be less than 255 characters'
    }
  },

  // Password validation
  password: {
    required: 'Password is required',
    minLength: {
      value: 8,
      message: 'Password must be at least 8 characters long'
    },
    maxLength: {
      value: 128,
      message: 'Password must be less than 128 characters'
    },
    pattern: {
      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }
  },

  // Name validation
  name: {
    required: 'Name is required',
    minLength: {
      value: 2,
      message: 'Name must be at least 2 characters long'
    },
    maxLength: {
      value: 50,
      message: 'Name must be less than 50 characters'
    },
    pattern: {
      value: /^[a-zA-Z\s'-]+$/,
      message: 'Name can only contain letters, spaces, hyphens, and apostrophes'
    }
  },

  // Required field validation
  required: {
    value: true,
    message: 'This field is required'
  }
};

// Password strength checker
export const checkPasswordStrength = (password) => {
  if (!password) return { score: 0, feedback: 'Password is required' };

  let score = 0;
  const feedback = [];

  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Add at least 8 characters');
  }

  // Uppercase letter
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add uppercase letters');
  }

  // Lowercase letter
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add lowercase letters');
  }

  // Numbers
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add numbers');
  }

  // Special characters
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add special characters');
  }

  // Additional length bonus
  if (password.length >= 12) {
    score += 1;
  }

  // Determine strength level
  let strength = 'Weak';
  if (score >= 4) strength = 'Strong';
  else if (score >= 3) strength = 'Medium';
  else if (score >= 2) strength = 'Fair';

  return {
    score,
    maxScore: 5,
    strength,
    feedback: feedback.length > 0 ? feedback.join(', ') : 'Strong password'
  };
};

// Single field validator
export const validateField = (fieldName, value, rules = {}) => {
  const errors = [];
  const fieldRules = { ...validationRules[fieldName], ...rules };

  // Required validation
  if (fieldRules.required && (!value || !value.toString().trim())) {
    errors.push(fieldRules.required);
  }

  // Skip other validations if field is empty and not required
  if (!value || !value.toString().trim()) {
    return errors;
  }

  // Length validations
  if (fieldRules.minLength && value.length < fieldRules.minLength.value) {
    errors.push(fieldRules.minLength.message);
  }

  if (fieldRules.maxLength && value.length > fieldRules.maxLength.value) {
    errors.push(fieldRules.maxLength.message);
  }

  // Pattern validation
  if (fieldRules.pattern && !fieldRules.pattern.value.test(value)) {
    errors.push(fieldRules.pattern.message);
  }

  return errors;
};

// Form validator
export const validateForm = (formData, validationSchema) => {
  const errors = {};

  Object.keys(validationSchema).forEach(fieldName => {
    const fieldErrors = validateField(fieldName, formData[fieldName], validationSchema[fieldName]);
    if (fieldErrors.length > 0) {
      errors[fieldName] = fieldErrors[0]; // Show first error for each field
    }
  });

  return errors;
};

// Common validation schemas
export const validationSchemas = {
  login: {
    email: validationRules.email,
    password: {
      required: 'Password is required',
      minLength: {
        value: 1,
        message: 'Password is required'
      }
    }
  },

  register: {
    name: validationRules.name,
    email: validationRules.email,
    password: validationRules.password,
    confirmPassword: {
      required: 'Please confirm your password',
      custom: {
        validate: (value, formData) => {
          if (value !== formData.password) {
            return 'Passwords do not match';
          }
          return null;
        }
      }
    }
  }
};

// Real-time validation hook helper
export const useFieldValidation = (initialValue, rules) => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  const validate = useCallback((newValue = value) => {
    const errors = validateField(rules.name || 'field', newValue, rules);
    const errorMessage = errors.length > 0 ? errors[0] : '';
    setError(errorMessage);
    return errorMessage;
  }, [rules, value]);

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    // Validate in real-time if field has been touched
    if (touched) {
      validate(newValue);
    }
  }, [touched, validate]);

  const handleBlur = useCallback(() => {
    setTouched(true);
    validate();
  }, [validate]);

  return {
    value,
    setValue,
    error,
    touched,
    handleChange,
    handleBlur,
    validate
  };
};
