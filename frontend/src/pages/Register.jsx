import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import { LoadingButton, ErrorAlert, PasswordStrength } from '../components';
import { EnhancedFormField, ValidationSummary } from '../components';
import { useFormValidation, useAsyncValidation } from '../hooks';
import { validationSchemas, checkPasswordStrength } from '../utils';

const Register = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();
  
  const {
    formData,
    errors,
    touched,
    isSubmitting,
    hasTouchedErrors,
    handleChange,
    handleBlur,
    handleSubmit,
    getFieldProps,
    clearAllErrors,
    setFieldValue
  } = useFormValidation(
    {
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    },
    validationSchemas.register,
    {
      validateOnChange: true,
      validateOnBlur: true,
      debounceMs: 300,
      showErrorsOnChange: false,
      customValidations: {
        confirmPassword: {
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
    }
  );

  const { validateAsync, isAsyncValidating } = useAsyncValidation();

  // Get password strength for real-time feedback
  const passwordStrength = checkPasswordStrength(formData.password);

  const handleEmailBlur = async (e) => {
    handleBlur(e);
    
    // Optional: Add async email validation (e.g., check if email already exists)
    const { name, value } = e.target;
    if (name === 'email' && value && !errors.email) {
      await validateAsync(name, async (email) => {
        // Example: Check if email format is valid for domain
        const domain = email.split('@')[1];
        if (domain && ['test.com', 'example.com'].includes(domain.toLowerCase())) {
          return { isValid: false, error: 'Please use a real email address' };
        }
        return { isValid: true };
      }, value);
    }
  };

  const handlePasswordChange = (e) => {
    handleChange(e);
    
    // Clear confirmPassword error when password changes
    if (formData.confirmPassword && formData.confirmPassword !== e.target.value) {
      setFieldValue('confirmPassword', '');
    }
  };

  const onSubmit = async (formData) => {
    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password
    });

    if (result.success) {
      navigate('/dashboard');
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    clearError(); // Clear any auth errors
    handleSubmit(onSubmit);
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength.strength) {
      case 'Weak':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'Fair':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Medium':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Strong':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join the voting system and participate in democratic decisions
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleFormSubmit}>
          <ErrorAlert 
            error={error} 
            onClose={clearError}
          />

          {/* Validation Summary - shows errors when user tries to submit */}
          {hasTouchedErrors && (
            <ValidationSummary
              errors={errors}
              touched={touched}
              title="Please fix the following errors:"
              onFieldClick={(fieldName) => {
                const element = document.getElementById(fieldName);
                if (element) {
                  element.focus();
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
            />
          )}

          <div className="space-y-6">
            <EnhancedFormField
              label="Full name"
              name="name"
              type="text"
              placeholder="Enter your full name"
              autoComplete="name"
              required
              showSuccessIndicator={true}
              helperText="This is how your name will appear in the voting system."
              {...getFieldProps('name')}
            />
            
            <EnhancedFormField
              label="Email address"
              name="email"
              type="email"
              placeholder="Enter your email address"
              autoComplete="email"
              required
              showSuccessIndicator={true}
              showLoadingIndicator={isAsyncValidating.email}
              helperText="We'll use this to send you important voting notifications."
              {...getFieldProps('email')}
              onBlur={handleEmailBlur}
            />
            
            <EnhancedFormField
              label="Password"
              name="password"
              type="password"
              placeholder="Create a strong password"
              autoComplete="new-password"
              showPasswordToggle
              required
              showSuccessIndicator={passwordStrength.strength === 'Strong'}
              helperText="Use a mix of letters, numbers, and special characters."
              {...getFieldProps('password')}
              onChange={handlePasswordChange}
            />

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className={`p-3 rounded-lg border ${getPasswordStrengthColor()}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Password Strength</span>
                  <span className="text-sm font-bold">{passwordStrength.strength}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      passwordStrength.strength === 'Weak' ? 'bg-red-500' :
                      passwordStrength.strength === 'Fair' ? 'bg-yellow-500' :
                      passwordStrength.strength === 'Medium' ? 'bg-blue-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${(passwordStrength.score / passwordStrength.maxScore) * 100}%` }}
                  />
                </div>
                <p className="text-xs">{passwordStrength.feedback}</p>
              </div>
            )}
            
            <EnhancedFormField
              label="Confirm password"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              autoComplete="new-password"
              showPasswordToggle
              required
              showSuccessIndicator={formData.confirmPassword && formData.password === formData.confirmPassword}
              helperText="Re-enter your password to confirm it's correct."
              {...getFieldProps('confirmPassword')}
            />
          </div>

          <div className="flex items-center">
            <input
              id="agree-terms"
              name="agree-terms"
              type="checkbox"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              required
            />
            <label htmlFor="agree-terms" className="ml-2 block text-sm text-gray-900">
              I agree to the{' '}
              <Link to="/terms" className="text-indigo-600 hover:text-indigo-500">
                Terms and Conditions
              </Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-indigo-600 hover:text-indigo-500">
                Privacy Policy
              </Link>
            </label>
          </div>

          <div>
            <LoadingButton
              type="submit"
              isLoading={isSubmitting}
              loadingText="Creating account..."
              className="w-full"
              disabled={hasTouchedErrors || passwordStrength.strength === 'Weak'}
            >
              Sign up
            </LoadingButton>
          </div>

          <div className="text-center">
            <Link to="/login" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
