import validator from 'validator';

// Validation middleware factory
export const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];

    // Validate request body
    if (schema.body) {
      for (const [field, rules] of Object.entries(schema.body)) {
        const value = req.body[field];
        
        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push(`${field} is required`);
          continue;
        }

        if (value !== undefined && value !== null && value !== '') {
          // Type validation
          if (rules.type && typeof value !== rules.type) {
            errors.push(`${field} must be of type ${rules.type}`);
          }

          // String validations
          if (typeof value === 'string') {
            if (rules.minLength && value.length < rules.minLength) {
              errors.push(`${field} must be at least ${rules.minLength} characters long`);
            }

            if (rules.maxLength && value.length > rules.maxLength) {
              errors.push(`${field} must not exceed ${rules.maxLength} characters`);
            }

            if (rules.email && !validator.isEmail(value)) {
              errors.push(`${field} must be a valid email address`);
            }

            if (rules.alpha && !validator.isAlpha(value.replace(/\s/g, ''))) {
              errors.push(`${field} must contain only letters`);
            }

            if (rules.alphanumeric && !validator.isAlphanumeric(value.replace(/\s/g, ''))) {
              errors.push(`${field} must contain only letters and numbers`);
            }
          }

          // Number validations
          if (typeof value === 'number') {
            if (rules.min !== undefined && value < rules.min) {
              errors.push(`${field} must be at least ${rules.min}`);
            }

            if (rules.max !== undefined && value > rules.max) {
              errors.push(`${field} must not exceed ${rules.max}`);
            }

            if (rules.integer && !Number.isInteger(value)) {
              errors.push(`${field} must be an integer`);
            }

            if (rules.positive && value <= 0) {
              errors.push(`${field} must be a positive number`);
            }
          }

          // Array validations
          if (Array.isArray(value)) {
            if (rules.minItems && value.length < rules.minItems) {
              errors.push(`${field} must have at least ${rules.minItems} items`);
            }

            if (rules.maxItems && value.length > rules.maxItems) {
              errors.push(`${field} must not exceed ${rules.maxItems} items`);
            }
          }

          // Custom validation
          if (rules.custom && typeof rules.custom === 'function') {
            const customError = rules.custom(value);
            if (customError) {
              errors.push(customError);
            }
          }
        }
      }
    }

    // Validate query parameters
    if (schema.query) {
      for (const [field, rules] of Object.entries(schema.query)) {
        const value = req.query[field];
        
        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push(`Query parameter ${field} is required`);
          continue;
        }

        if (value !== undefined && value !== null && value !== '') {
          if (rules.type && typeof value !== rules.type) {
            errors.push(`Query parameter ${field} must be of type ${rules.type}`);
          }

          if (rules.enum && !rules.enum.includes(value)) {
            errors.push(`Query parameter ${field} must be one of: ${rules.enum.join(', ')}`);
          }
        }
      }
    }

    // Validate route parameters
    if (schema.params) {
      for (const [field, rules] of Object.entries(schema.params)) {
        const value = req.params[field];
        
        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push(`Route parameter ${field} is required`);
          continue;
        }

        if (value !== undefined && value !== null && value !== '') {
          if (rules.type && typeof value !== rules.type) {
            errors.push(`Route parameter ${field} must be of type ${rules.type}`);
          }

          if (rules.numeric && !validator.isNumeric(value)) {
            errors.push(`Route parameter ${field} must be numeric`);
          }

          if (rules.integer && !validator.isInt(value)) {
            errors.push(`Route parameter ${field} must be an integer`);
          }

          if (rules.uuid && !validator.isUUID(value)) {
            errors.push(`Route parameter ${field} must be a valid UUID`);
          }
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    next();
  };
};

// Common validation schemas
export const schemas = {
  // User registration
  register: {
    body: {
      vin: {
        required: true,
        type: 'string',
        minLength: 3,
        maxLength: 20,
        alphanumeric: true
      },
      fullname: {
        required: true,
        type: 'string',
        minLength: 2,
        maxLength: 80,
        alpha: true
      },
      email: {
        required: true,
        type: 'string',
        email: true,
        maxLength: 50
      },
      password: {
        required: true,
        type: 'string',
        minLength: 6,
        maxLength: 255
      }
    }
  },

  // User login
  login: {
    body: {
      email: {
        required: true,
        type: 'string',
        email: true
      },
      password: {
        required: true,
        type: 'string'
      }
    }
  },

  // Create election
  createElection: {
    body: {
      title: {
        required: true,
        type: 'string',
        minLength: 3,
        maxLength: 200
      },
      description: {
        type: 'string',
        maxLength: 1000
      },
      type: {
        type: 'string',
        enum: ['general', 'local', 'special']
      },
      startTime: {
        required: true,
        type: 'string',
        custom: (value) => {
          if (!validator.isISO8601(value)) {
            return 'Start time must be a valid ISO8601 date';
          }
          if (new Date(value) <= new Date()) {
            return 'Start time must be in the future';
          }
        }
      },
      endTime: {
        required: true,
        type: 'string',
        custom: (value) => {
          if (!validator.isISO8601(value)) {
            return 'End time must be a valid ISO8601 date';
          }
        }
      },
      maxVotesPerVoter: {
        type: 'number',
        integer: true,
        positive: true,
        min: 1,
        max: 10
      },
      allowCandidateRegistration: {
        type: 'boolean'
      },
      showRealTimeResults: {
        type: 'boolean'
      }
    }
  },

  // Create candidate
  createCandidate: {
    body: {
      electionId: {
        required: true,
        type: 'string',
        numeric: true
      },
      name: {
        required: true,
        type: 'string',
        minLength: 2,
        maxLength: 100
      },
      description: {
        type: 'string',
        maxLength: 500
      },
      party: {
        type: 'string',
        maxLength: 100
      },
      platform: {
        type: 'string',
        maxLength: 1000
      },
      photoUrl: {
        type: 'string',
        custom: (value) => {
          if (value && !validator.isURL(value)) {
            return 'Photo URL must be a valid URL';
          }
        }
      }
    }
  },

  // Cast vote
  castVote: {
    body: {
      electionId: {
        required: true,
        type: 'string',
        numeric: true
      },
      candidateId: {
        required: true,
        type: 'string',
        numeric: true
      }
    }
  },

  // Update profile
  updateProfile: {
    body: {
      fullname: {
        type: 'string',
        minLength: 2,
        maxLength: 80,
        alpha: true
      },
      email: {
        type: 'string',
        email: true,
        maxLength: 50
      }
    }
  },

  // Change password
  changePassword: {
    body: {
      currentPassword: {
        required: true,
        type: 'string'
      },
      newPassword: {
        required: true,
        type: 'string',
        minLength: 6,
        maxLength: 255
      }
    }
  },

  // Route parameter validation
  idParam: {
    params: {
      id: {
        required: true,
        type: 'string',
        integer: true,
        positive: true
      }
    }
  }
};
