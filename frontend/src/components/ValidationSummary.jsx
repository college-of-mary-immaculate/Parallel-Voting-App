import React from 'react';

const ValidationSummary = ({
  errors = {},
  touched = {},
  title = 'Please fix the following errors:',
  showIcon = true,
  className = '',
  onFieldClick = null
}) => {
  // Filter errors that have been touched (user has interacted with the field)
  const activeErrors = Object.keys(errors).filter(
    fieldName => errors[fieldName] && touched[fieldName]
  );

  if (activeErrors.length === 0) {
    return null;
  }

  const handleErrorClick = (fieldName) => {
    if (onFieldClick) {
      onFieldClick(fieldName);
    } else {
      // Default behavior: focus on the input field
      const element = document.getElementById(fieldName);
      if (element) {
        element.focus();
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div 
      className={`bg-red-50 border border-red-200 rounded-md p-4 ${className} mb-4`}
      role="alert"
      aria-labelledby="validation-summary-title"
      aria-live="assertive"
    >
      <div className="flex items-start">
        {showIcon && (
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        <div className="ml-3 flex-1">
          <h3 
            id="validation-summary-title"
            className="text-lg font-medium text-red-800 mb-3"
          >
            {title}
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <ul className="list-disc list-inside space-y-2">
              {activeErrors.map(fieldName => (
                <li key={fieldName}>
                  <button
                    type="button"
                    onClick={() => handleErrorClick(fieldName)}
                    className="underline hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded px-1 py-0.5"
                    aria-label={`Go to ${fieldName} field: ${errors[fieldName]}`}
                  >
                    {errors[fieldName]}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3 text-sm text-red-600">
            {activeErrors.length === 1 
              ? 'There is 1 error that needs to be fixed.'
              : `There are ${activeErrors.length} errors that need to be fixed.`
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationSummary;
