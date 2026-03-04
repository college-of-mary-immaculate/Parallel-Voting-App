import React from 'react';
import { checkPasswordStrength } from '../utils/validation';

const PasswordStrength = ({ password, showFeedback = true }) => {
  const strength = checkPasswordStrength(password);

  const getStrengthColor = (score) => {
    if (score <= 2) return 'bg-red-500';
    if (score <= 3) return 'bg-yellow-500';
    if (score <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = (strength) => {
    switch (strength) {
      case 'Weak':
        return 'Weak';
      case 'Fair':
        return 'Fair';
      case 'Medium':
        return 'Medium';
      case 'Strong':
        return 'Strong';
      default:
        return 'Very Weak';
    }
  };

  const getStrengthTextColor = (strength) => {
    switch (strength) {
      case 'Weak':
        return 'text-red-600';
      case 'Fair':
        return 'text-yellow-600';
      case 'Medium':
        return 'text-blue-600';
      case 'Strong':
        return 'text-green-600';
      default:
        return 'text-red-600';
    }
  };

  if (!password) {
    return null;
  }

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">Password strength:</span>
        <span className={`text-xs font-medium ${getStrengthTextColor(strength.strength)}`}>
          {getStrengthText(strength.strength)}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(strength.score)}`}
          style={{ width: `${(strength.score / strength.maxScore) * 100}%` }}
        />
      </div>

      {showFeedback && strength.feedback && strength.feedback !== 'Strong password' && (
        <div className="mt-1">
          <p className="text-xs text-gray-600">
            <span className="font-medium">Suggestions:</span> {strength.feedback}
          </p>
        </div>
      )}
    </div>
  );
};

export default PasswordStrength;
