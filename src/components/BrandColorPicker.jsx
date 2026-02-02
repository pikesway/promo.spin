import { useState } from 'react';
import { validateHexColor } from '../utils/brandingHelpers';

const BrandColorPicker = ({ label, value, onChange, description }) => {
  const [inputValue, setInputValue] = useState(value);
  const [error, setError] = useState('');

  const handleChange = (newValue) => {
    setInputValue(newValue);

    if (validateHexColor(newValue)) {
      setError('');
      onChange(newValue);
    } else if (newValue === '') {
      setError('');
      onChange('');
    } else {
      setError('Invalid hex color format');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            {label}
          </label>
          {description && (
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{description}</p>
          )}
        </div>
        <div
          className="w-12 h-12 md:w-14 md:h-14 rounded-lg border-2 shadow-lg flex-shrink-0"
          style={{ backgroundColor: validateHexColor(inputValue) ? inputValue : '#666666', borderColor: 'var(--border-color)' }}
        />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="#6366F1"
          className="input flex-1 font-mono text-sm"
        />
        <div className="relative">
          <input
            type="color"
            value={validateHexColor(inputValue) ? inputValue : '#6366F1'}
            onChange={(e) => handleChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className="w-12 h-12 md:w-14 rounded-lg border cursor-pointer flex items-center justify-center"
            style={{ backgroundColor: validateHexColor(inputValue) ? inputValue : '#666666', borderColor: 'var(--border-color)' }}
          >
            <svg className="w-5 h-5 drop-shadow" style={{ color: 'var(--text-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs" style={{ color: 'var(--error)' }}>{error}</p>
      )}
    </div>
  );
};

export default BrandColorPicker;
