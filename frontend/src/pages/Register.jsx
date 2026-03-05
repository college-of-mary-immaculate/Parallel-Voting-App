import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import { LoadingButton, ErrorAlert, FormField, PasswordStrength } from '../components';
import { validationSchemas, validateForm } from '../utils';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Clear auth store error when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    // Validate field on blur
    const fieldErrors = validateForm(formData, {
      [name]: validationSchemas.register[name]
    });
    setErrors(prev => ({
      ...prev,
      [name]: fieldErrors[name] || ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const formErrors = validateForm(formData, validationSchemas.register);
    setErrors(formErrors);
    
    // Mark all fields as touched
    const allTouched = Object.keys(formData).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);
    
    // If there are errors, don't submit
    if (Object.keys(formErrors).length > 0) {
      return;
    }

    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password
    });

    if (result.success) {
      navigate('/dashboard');
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <ErrorAlert 
            error={error} 
            onClose={clearError}
          />
          <div className="space-y-6">
            <FormField
              label="Full name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.name}
              touched={touched.name}
              placeholder="Enter your full name"
              autoComplete="name"
              required
            />
            
            <FormField
              label="Email address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.email}
              touched={touched.email}
              placeholder="Enter your email"
              autoComplete="email"
              required
            />
            
            <FormField
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.password}
              touched={touched.password}
              placeholder="Create a password"
              autoComplete="new-password"
              showPasswordToggle
              required
            />
            
            {formData.password && (
              <PasswordStrength password={formData.password} />
            )}
            
            <FormField
              label="Confirm password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.confirmPassword}
              touched={touched.confirmPassword}
              placeholder="Confirm your password"
              autoComplete="new-password"
              showPasswordToggle
              required
            />
          </div>
          <div>
            <LoadingButton
              type="submit"
              isLoading={isLoading}
              loadingText="Creating account..."
              className="w-full"
            >
              Sign up
            </LoadingButton>
          </div>
          <div className="text-center">
            <Link to="/login" className="text-indigo-600 hover:text-indigo-500 text-sm">
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
