import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import { LoadingButton, ErrorAlert } from '../components';
import { EnhancedFormField, ValidationSummary } from '../components';
import { useFormValidation } from '../hooks';
import { validationSchemas } from '../utils';

const Login = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  
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
    clearAllErrors
  } = useFormValidation(
    {
      email: '',
      password: ''
    },
    validationSchemas.login,
    {
      validateOnChange: true,
      validateOnBlur: true,
      debounceMs: 300,
      showErrorsOnChange: false
    }
  );

  const { validateAsync, isAsyncValidating } = useAsyncValidation();

  const handleEmailBlur = async (e) => {
    handleBlur(e);
    
    // Optional: Add async email validation (e.g., check if email exists)
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

  const onSubmit = async (formData) => {
    const result = await login(formData);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    clearError(); // Clear any auth errors
    handleSubmit(onSubmit);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your credentials to access the voting system
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
              label="Email address"
              name="email"
              type="email"
              placeholder="Enter your email address"
              autoComplete="email"
              required
              showSuccessIndicator={true}
              showLoadingIndicator={isAsyncValidating.email}
              helperText="We'll never share your email with anyone else."
              {...getFieldProps('email')}
              onBlur={handleEmailBlur}
            />
            
            <EnhancedFormField
              label="Password"
              name="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              showPasswordToggle
              required
              helperText="Use a strong password to protect your account."
              {...getFieldProps('password')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <LoadingButton
              type="submit"
              isLoading={isSubmitting}
              loadingText="Signing in..."
              className="w-full"
              disabled={hasTouchedErrors}
            >
              Sign in
            </LoadingButton>
          </div>

          <div className="text-center">
            <Link to="/register" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
              Don't have an account? Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
