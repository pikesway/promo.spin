import React, { useState } from 'react';

const LeadCaptureScreen = ({ game, result, onSubmit }) => {
  const screenData = game.screens?.leadCapture || {};
  const fonts = game.visual?.fonts || {};
  
  const [formData, setFormData] = useState({});
  const [consentGiven, setConsentGiven] = useState(false);
  const [errors, setErrors] = useState({});

  // Resolve button style
  const globalButton = game.visual?.buttons || {};
  const buttonStyle = {
    fontFamily: fonts.primary,
    backgroundColor: (screenData.useCustomButtonColor ? screenData.buttonColor : globalButton.backgroundColor) || '#2563eb',
    color: (screenData.useCustomButtonColor ? screenData.buttonTextColor : globalButton.textColor) || '#ffffff',
  };

  const handleInputChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    (screenData.fields || []).forEach(field => {
      if (field.required && !formData[field.id]) {
        newErrors[field.id] = `${field.label} is required`;
      }
      if (field.type === 'email' && formData[field.id] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData[field.id])) {
        newErrors[field.id] = 'Please enter a valid email';
      }
    });

    if (screenData.requireConsent && !consentGiven) {
      newErrors.consent = 'Required';
    }

    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSubmit(formData);
  };

  const renderField = (field) => {
    const commonClasses = `w-full border rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow ${
      errors[field.id] ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50'
    }`;
    const commonProps = {
      id: field.id,
      value: formData[field.id] || '',
      onChange: (e) => handleInputChange(field.id, e.target.value),
      className: commonClasses,
      style: { fontFamily: fonts.secondary }
    };

    switch (field.type) {
      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Select an option...</option>
            {(field.options || '').split('\n').filter(opt => opt.trim()).map((option, i) => (
              <option key={i} value={option.trim()}>{option.trim()}</option>
            ))}
          </select>
        );
      case 'checkbox':
        return (
          <label className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
             <input 
              type="checkbox" 
              checked={formData[field.id] || false}
              onChange={(e) => handleInputChange(field.id, e.target.checked)}
              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700" style={{ fontFamily: fonts.secondary }}>
              {field.placeholder || field.label}
            </span>
          </label>
        );
      default:
        return (
          <input 
            type={field.type} 
            placeholder={field.placeholder || field.label}
            {...commonProps}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-8">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-md mx-auto relative overflow-hidden">
        {/* Decorative header background */}
        <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: buttonStyle.backgroundColor }}></div>
        
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 text-center" style={{ fontFamily: fonts.primary }}>
          {screenData.headline || 'Claim Your Prize'}
        </h1>
        
        {screenData.description && (
          <p className="text-gray-600 mb-6 text-center text-sm md:text-base" style={{ fontFamily: fonts.secondary }}>
            {screenData.description}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {(screenData.fields || []).map((field) => (
            <div key={field.id}>
              <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1" style={{ fontFamily: fonts.secondary }}>
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              {renderField(field)}
              {errors[field.id] && (
                <p className="text-red-500 text-xs mt-1 ml-1">{errors[field.id]}</p>
              )}
            </div>
          ))}

          {screenData.requireConsent && (
            <div className="pt-2">
              <label className="flex items-start space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-600 leading-snug" style={{ fontFamily: fonts.secondary }}>
                  {screenData.consentText || 'I agree to receive promotional emails'}
                </span>
              </label>
              {errors.consent && (
                <p className="text-red-500 text-xs mt-1 ml-1">{errors.consent}</p>
              )}
            </div>
          )}

          <button 
            type="submit" 
            className="w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform active:scale-[0.98] mt-4"
            style={buttonStyle}
          >
            {screenData.submitButtonText || 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LeadCaptureScreen;